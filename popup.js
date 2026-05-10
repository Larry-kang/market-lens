(() => {
  'use strict';

  const {
    DEFAULT_TICKER,
    DEFAULT_USD_TWD,
    WATCHLIST,
    formatMoney,
    formatTargetQuantity,
    getDisplayName,
    normalizeTicker
  } = globalThis.BAPL || {};

  const SAMPLE_AMOUNT = 30000;
  const SUPPORT_LINKS = {
    sponsors: 'https://github.com/sponsors/Larry-kang',
    project: 'https://github.com/Larry-kang/market-lens'
  };

  const nodes = {
    currentSummary: document.getElementById('currentSummary'),
    displayName: document.getElementById('displayName'),
    priceText: document.getElementById('priceText'),
    updatedText: document.getElementById('updatedText'),
    sourceText: document.getElementById('sourceText'),
    previewText: document.getElementById('previewText'),
    statusText: document.getElementById('statusText'),
    tickerInput: document.getElementById('tickerInput'),
    saveBtn: document.getElementById('saveBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    watchlist: document.getElementById('watchlist'),
    tickerHint: document.getElementById('tickerHint')
  };

  const state = {
    ticker: DEFAULT_TICKER || 'BTC-USD',
    quote: null
  };

  function getQuoteCurrency(quote) {
    return quote.currency === 'USD' ? 'USD' : 'TWD';
  }

  function convertToQuoteCurrency(amount, pageCurrency, quoteCurrency) {
    if (pageCurrency === quoteCurrency) return amount;
    if (pageCurrency === 'TWD' && quoteCurrency === 'USD') return amount / DEFAULT_USD_TWD;
    if (pageCurrency === 'USD' && quoteCurrency === 'TWD') return amount * DEFAULT_USD_TWD;
    return amount;
  }

  function formatUpdatedTime(quote) {
    const ts = quote.marketTime || quote.fetchedAt;
    if (!ts) return '—';

    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(ts));
  }

  function setStatus(message, tone = 'muted') {
    nodes.statusText.textContent = message;
    nodes.statusText.dataset.tone = tone;
  }

  function setHint(message, tone = 'muted') {
    nodes.tickerHint.textContent = message;
    nodes.tickerHint.dataset.tone = tone;
  }

  function setActiveWatchlist(ticker) {
    nodes.watchlist.querySelectorAll('button[data-ticker]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.ticker === ticker);
    });
  }

  function getWatchlistLabel(ticker) {
    if (ticker === 'BTC-SATS') return 'SATS';
    if (ticker === 'BTC-USD') return 'BTC';
    if (ticker === 'ETH-USD') return 'ETH';
    if (ticker.endsWith('.TW')) return ticker.replace(/\.TW$/u, '');

    return ticker;
  }

  function getWatchlistInputValue(ticker) {
    if (ticker === 'BTC-SATS') return 'SATS';
    if (ticker.endsWith('.TW')) return ticker.replace(/\.TW$/u, '');

    return ticker;
  }

  function renderQuote(quote) {
    if (!quote || !Number.isFinite(quote.currentPrice)) {
      nodes.currentSummary.textContent = `目前標的：${getWatchlistLabel(state.ticker)}`;
      nodes.displayName.textContent = getDisplayName(state.ticker);
      nodes.priceText.textContent = '資料取得失敗';
      nodes.updatedText.textContent = '—';
      nodes.sourceText.textContent = 'Yahoo Finance';
      nodes.previewText.textContent = '無法產生預覽';
      setStatus(quote?.error ? `資料失敗：${quote.error}` : '尚未取得資料', 'warn');
      return;
    }

    state.quote = quote;

    const quoteCurrency = getQuoteCurrency(quote);
    const sampleEffectiveAmount = convertToQuoteCurrency(SAMPLE_AMOUNT, 'TWD', quoteCurrency);
    const sampleUnits = sampleEffectiveAmount / quote.currentPrice;

    nodes.currentSummary.textContent = `目前標的：${getWatchlistLabel(quote.ticker)}`;
    nodes.displayName.textContent = getDisplayName(quote.ticker);
    nodes.priceText.textContent = formatMoney(quote.currentPrice, quoteCurrency);
    nodes.updatedText.textContent = formatUpdatedTime(quote);
    nodes.sourceText.textContent = quote.fromCache ? (quote.stale ? '快取回退' : '快取') : '即時抓取';
    nodes.previewText.textContent = `${formatMoney(SAMPLE_AMOUNT, 'TWD')} ${formatTargetQuantity(sampleUnits, quote.ticker)}`;
    setStatus(quote.stale ? '已顯示快取資料，背景會再嘗試更新' : '已更新完成', quote.fromCache ? 'warn' : 'ok');
  }

  async function loadQuote(forceRefresh = false) {
    nodes.refreshBtn.disabled = true;
    nodes.saveBtn.disabled = true;
    setStatus(forceRefresh ? '重新抓取中…' : '載入中…', 'muted');

    try {
      const quote = await chrome.runtime.sendMessage({
        type: forceRefresh ? 'QUOTE_REFRESH' : 'QUOTE_GET',
        ticker: state.ticker,
        forceRefresh
      });

      renderQuote(quote);
    } catch (error) {
      renderQuote({ error: error.message, ticker: state.ticker });
    } finally {
      nodes.refreshBtn.disabled = false;
      nodes.saveBtn.disabled = false;
    }
  }

  async function saveTicker(rawValue) {
    const normalized = normalizeTicker(rawValue);
    state.ticker = normalized;
    nodes.tickerInput.value = getWatchlistInputValue(normalized);
    setActiveWatchlist(normalized);
    await chrome.storage.sync.set({ selected_ticker: normalized });
    setHint(`已儲存：${normalized}`, 'ok');
    await loadQuote(true);
  }

  function seedWatchlistButtons() {
    nodes.watchlist.innerHTML = WATCHLIST.map(ticker => {
      const label = getWatchlistLabel(ticker);
      const display = getDisplayName(ticker);
      return `
        <button type="button" class="watch-chip" data-ticker="${ticker}">
          <span class="watch-chip__ticker">${label}</span>
          <span class="watch-chip__name">${display}</span>
        </button>
      `;
    }).join('');
  }

  function bindEvents() {
    nodes.saveBtn.addEventListener('click', () => {
      void saveTicker(nodes.tickerInput.value);
    });

    nodes.refreshBtn.addEventListener('click', () => {
      void loadQuote(true);
    });

    nodes.tickerInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        nodes.saveBtn.click();
      }
    });

    nodes.tickerInput.addEventListener('input', () => {
      const normalized = normalizeTicker(nodes.tickerInput.value);
      setHint(`將套用：${normalized}`, 'muted');
    });

    nodes.watchlist.addEventListener('click', event => {
      const button = event.target.closest('button[data-ticker]');
      if (!button) return;
      nodes.tickerInput.value = getWatchlistInputValue(button.dataset.ticker);
      void saveTicker(button.dataset.ticker);
    });

    document.querySelectorAll('[data-support-link]').forEach(link => {
      link.addEventListener('click', event => {
        const key = event.currentTarget.dataset.supportLink;
        const url = SUPPORT_LINKS[key];
        if (!url) return;
        event.preventDefault();
        window.open(url, '_blank', 'noopener,noreferrer');
      });
    });
  }

  async function init() {
    seedWatchlistButtons();
    bindEvents();

    const stored = await chrome.storage.sync.get(['selected_ticker']);
    state.ticker = normalizeTicker(stored.selected_ticker || DEFAULT_TICKER);
    nodes.tickerInput.value = getWatchlistInputValue(state.ticker);
    setActiveWatchlist(state.ticker);
    setHint(`BTC → BTC-USD，SATS → BTC 換算，00631L → 00631L.TW`, 'muted');

    await loadQuote(false);
  }

  init();
})();
