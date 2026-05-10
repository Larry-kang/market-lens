(() => {
  'use strict';

  const {
    DEFAULT_TICKER,
    DEFAULT_USD_TWD,
    formatMoney,
    formatTargetQuantity,
    getDisplayName,
    parse591HousePriceText,
    parseBareWanText,
    parseMoneyText,
    normalizeTicker,
    shouldScheduleMutation
  } = globalThis.BAPL || {};

  const PROCESSED_ATTR = 'data-bapl-processed';
  const BADGE_CLASS = 'bapl-badge';
  const IGNORED_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'TEXTAREA',
    'INPUT',
    'SELECT',
    'OPTION'
  ]);
  const ORIGINAL_PRICE_HINT_RE = /origin|original|old[\-_ ]?price|list[\-_ ]?price|strike|del[\-_ ]?price|原價|定價|刪除價|舊價/i;
  const PRICE_FILTER_CONTROL_RE = /(以下|以上|[~～])/;
  const PRICE_FILTER_CLASS_RE = /(btn|button|filter|chip|option|tab)/i;
  const REAL_ESTATE_DOMAIN_RE = /(^|\.)((591|rakuya|yungching|sinyi)\.com\.tw)$/i;
  const PRICE_SELECTORS = [
    '[data-price]',
    '[itemprop="price"]',
    '[data-testid*="price"]',
    '[aria-label*="price"]',
    '[class*="price"]',
    '[class*="Price"]',
    '[class*="amount"]',
    '[class*="Amount"]'
  ].join(',');

  const state = {
    ticker: DEFAULT_TICKER || 'BTC-USD',
    quote: null,
    scanTimer: null,
    pendingScanReset: false
  };

  function isPriceCandidate(el) {
    if (!el || !(el instanceof Element)) return false;
    if (IGNORED_TAGS.has(el.tagName)) return false;
    if (el.matches(`#${BADGE_CLASS}, .${BADGE_CLASS}`)) return false;
    if (el.closest(`.${BADGE_CLASS}`)) return false;
    if (el.closest(`[${PROCESSED_ATTR}]`)) return false;
    if (el.querySelector(`.${BADGE_CLASS}, [${PROCESSED_ATTR}]`)) return false;

    const text = normalizeText(el.textContent);
    if (ORIGINAL_PRICE_HINT_RE.test(`${el.className || ''} ${el.id || ''} ${el.getAttribute('aria-label') || ''}`)) {
      return false;
    }
    if (PRICE_FILTER_CONTROL_RE.test(text) && (
      PRICE_FILTER_CLASS_RE.test(`${el.className || ''} ${el.id || ''}`) ||
      el.tagName === 'BUTTON' ||
      el.getAttribute('role') === 'button' ||
      el.closest('form')
    )) {
      return false;
    }
    if (isStrikethrough(el)) return false;

    if (is591HouseDetailPage()) {
      return is591MainPriceCandidate(el, text);
    }

    if (isSinyiListPage()) {
      return el.matches('.LongInfoCard_Type_Right') && Boolean(parseSinyiListPrice(el));
    }

    if (parsePriceText(text, el)) return true;
    if (!text) return false;
    if (text.length > 120 && !hasPriceHint(el)) return false;

    return Boolean(parsePriceText(text, el));
  }

  function hasPriceHint(el) {
    return /price|amount|cost|total|sale|售價|價格|金額|價錢/i.test(
      `${el.className || ''} ${el.id || ''} ${el.getAttribute('aria-label') || ''}`
    );
  }

  function isStrikethrough(el) {
    const check = node => {
      if (!(node instanceof Element)) return false;
      const style = getComputedStyle(node);
      const decoration = style.textDecorationLine || style.textDecoration;
      return /line-through/i.test(decoration);
    };

    if (check(el) || el.tagName === 'DEL' || el.tagName === 'S') {
      return true;
    }

    let parent = el.parentElement;
    for (let depth = 0; parent && parent !== document.body && depth < 3; depth += 1, parent = parent.parentElement) {
      if (parent.tagName === 'DEL' || parent.tagName === 'S') return true;
      if (check(parent) && parent.children.length <= 3) return true;
    }

    return false;
  }

  function normalizeText(text) {
    return String(text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function is591HouseDetailPage() {
    return /(^|\.)591\.com\.tw$/i.test(location.hostname)
      && /\/home\/house\/detail\//i.test(location.pathname);
  }

  function isSinyiListPage() {
    return /(^|\.)sinyi\.com\.tw$/i.test(location.hostname)
      && /\/buy\/list(?:[/?#]|$)/i.test(location.pathname);
  }

  function isRealEstateDomain() {
    return REAL_ESTATE_DOMAIN_RE.test(location.hostname);
  }

  function find591PriceUnitText(anchor) {
    const scopes = [];
    const seen = new Set();
    const pushScope = scope => {
      if (scope && !seen.has(scope)) {
        seen.add(scope);
        scopes.push(scope);
      }
    };

    pushScope(anchor);
    pushScope(anchor?.parentElement);
    pushScope(anchor?.closest('#new-vue-sale-detail-info'));
    pushScope(document.querySelector('#new-vue-sale-detail-info'));
    pushScope(document.querySelector('.info-price-up'));
    pushScope(document.querySelector('.info-price-left-2'));

    for (const scope of scopes) {
      const text = normalizeText(scope?.textContent);

      if (!text) {
        continue;
      }

      if (text.includes('萬元')) {
        return '萬元';
      }

      if (text.includes('萬')) {
        return '萬元';
      }

      if (text.includes('元')) {
        return '元';
      }
    }

    return '萬元';
  }

  function get591MainPriceAnchor() {
    return document.querySelector('.right-ctn .price.total-price')
      || document.querySelector('.price.total-price')
      || document.querySelector('#new-vue-sale-detail-info .info-price-num-2');
  }

  function parse591FallbackPrice(el) {
    if (!is591HouseDetailPage() || !(el instanceof Element)) {
      return null;
    }

    if (!el.closest('[class*="info-price"]')) {
      return null;
    }

    const root = el.closest('#new-vue-sale-detail-info') || document.querySelector('#new-vue-sale-detail-info');
    const vm = root && root.__vue__;
    if (!vm) {
      return null;
    }

    const rawPrice = [vm.price, vm.newPrice].find(value => typeof value === 'string' && value.trim());
    if (!rawPrice) {
      return null;
    }

    return parse591HousePriceText(rawPrice, find591PriceUnitText(el));
  }

  function getVisibleText(root) {
    if (!(root instanceof Element)) {
      return '';
    }

    if (isStrikethrough(root)) {
      return '';
    }

    const parts = [];
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || IGNORED_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          if (isStrikethrough(parent)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      parts.push(node.textContent || '');
    }

    return normalizeText(parts.join(' '));
  }

  function parseSinyiListPrice(el) {
    if (!isSinyiListPage() || !(el instanceof Element)) {
      return null;
    }

    const card = el.closest('.buy-list-item, [id^="buyHouseCard_"]');
    if (!card) {
      return null;
    }

    const priceHost = el.closest('.LongInfoCard_Type_Right');

    if (!priceHost) {
      return null;
    }

    const visibleText = getVisibleText(priceHost);
    const parsed = parseBareWanText(visibleText) || parseBareWanText(priceHost.textContent);

    if (parsed) {
      return parsed;
    }

    return null;
  }

  function parseRealEstateBareWanPrice(text, el) {
    if (!isRealEstateDomain() || !(el instanceof Element)) {
      return null;
    }

    if (isSinyiListPage()) {
      return null;
    }

    if (el.children.length > 0) {
      return null;
    }

    const priceContext = el.closest('.obj-price, .car-price, .house-price, .price, [class*="price"], [class*="Price"]');
    if (!priceContext) {
      return null;
    }

    if (PRICE_FILTER_CONTROL_RE.test(text)) {
      return null;
    }

    const match = normalizeText(text).match(/(?<amount>\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*萬(?!\s*元)/);
    if (!match?.groups?.amount) {
      return null;
    }

    const amount = Number(match.groups.amount.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    return {
      amount: amount * 10000,
      currency: 'TWD',
      text: normalizeText(text)
    };
  }

  function is591MainPriceCandidate(el, text) {
    const mainAnchor = get591MainPriceAnchor();

    if (!mainAnchor || el !== mainAnchor) {
      return false;
    }

    if (mainAnchor.matches('.price.total-price')) {
      return Boolean(parsePriceText(text, el));
    }

    return Boolean(parse591FallbackPrice(mainAnchor));
  }

  function parsePriceText(text, el) {
    if (typeof parseMoneyText !== 'function') {
      return null;
    }

    const parsed = parseMoneyText(text);
    if (parsed) {
      return parsed;
    }

    return parse591FallbackPrice(el)
      || parseSinyiListPrice(el)
      || parseRealEstateBareWanPrice(text, el);
  }

  function convertToQuoteCurrency(amount, pageCurrency, quoteCurrency) {
    if (pageCurrency === quoteCurrency) return amount;

    if (pageCurrency === 'TWD' && quoteCurrency === 'USD') {
      return amount / DEFAULT_USD_TWD;
    }

    if (pageCurrency === 'USD' && quoteCurrency === 'TWD') {
      return amount * DEFAULT_USD_TWD;
    }

    return amount;
  }

  function deepestOnly(elements) {
    return elements.filter(element => !elements.some(other => other !== element && element.contains(other)));
  }

  function collectAnchors() {
    const anchors = new Set();

    document.querySelectorAll(PRICE_SELECTORS).forEach(el => {
      if (isPriceCandidate(el)) {
        anchors.add(el);
      }
    });

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent || IGNORED_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
          if (parent.closest(`.${BADGE_CLASS}`)) return NodeFilter.FILTER_REJECT;
          if (parent.closest(`[${PROCESSED_ATTR}]`)) return NodeFilter.FILTER_REJECT;
          return parsePriceText(node.textContent, parent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
        }
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      const anchor = findAnchor(node.parentElement);
      if (anchor) {
        anchors.add(anchor);
      }
    }

    return deepestOnly([...anchors]);
  }

  function findAnchor(startEl) {
    let el = startEl;

    if (isSinyiListPage() && el instanceof Element) {
      const sinyiPriceHost = el.closest('.LongInfoCard_Type_Right');
      if (sinyiPriceHost && parseSinyiListPrice(sinyiPriceHost)) {
        return sinyiPriceHost;
      }
    }

    for (let depth = 0; el && el !== document.body && depth < 3; depth += 1, el = el.parentElement) {
      if (isPriceCandidate(el)) {
        return el;
      }
    }

    return null;
  }

  function clearBadges() {
    document.querySelectorAll(`.${BADGE_CLASS}`).forEach(badge => badge.remove());
    document.querySelectorAll(`[${PROCESSED_ATTR}]`).forEach(el => {
      el.removeAttribute(PROCESSED_ATTR);
    });
  }

  function buildBadgeTitle(parsed, quote, units) {
    const quoteCurrency = quote.currency === 'USD' ? 'USD' : 'TWD';
    const quoteLabel = formatMoney(quote.currentPrice, quoteCurrency);
    const pageLabel = formatMoney(parsed.amount, parsed.currency);
    const assetName = getDisplayName(quote.ticker);

    return `${assetName} · ${quoteLabel} · ${pageLabel} = ${formatTargetQuantity(units, quote.ticker)}`;
  }

  function injectBadge(anchor, parsed) {
    if (anchor.hasAttribute(PROCESSED_ATTR)) {
      return;
    }

    const quoteCurrency = state.quote.currency === 'USD' ? 'USD' : 'TWD';
    const effectiveAmount = convertToQuoteCurrency(parsed.amount, parsed.currency, quoteCurrency);
    const units = effectiveAmount / state.quote.currentPrice;

    if (!Number.isFinite(units) || units <= 0) {
      return;
    }

    const badge = document.createElement('span');
    badge.className = BADGE_CLASS;
    badge.dataset.ticker = state.quote.ticker;
    badge.textContent = formatTargetQuantity(units, state.quote.ticker);
    badge.title = buildBadgeTitle(parsed, state.quote, units);

    anchor.setAttribute(PROCESSED_ATTR, '1');
    anchor.appendChild(badge);
  }

  function scanDOM({ resetExisting = false } = {}) {
    if (resetExisting) {
      clearBadges();
    }

    if (!state.quote || !Number.isFinite(state.quote.currentPrice)) {
      return;
    }

    const anchors = collectAnchors();

    anchors.forEach(anchor => {
      if (!anchor.isConnected || anchor.hasAttribute(PROCESSED_ATTR)) {
        return;
      }

      const parsed = parsePriceText(anchor.textContent, anchor);
      if (parsed) {
        injectBadge(anchor, parsed);
      }
    });
  }

  function scheduleScan(delay = 250, resetExisting = false) {
    clearTimeout(state.scanTimer);
    state.pendingScanReset = state.pendingScanReset || resetExisting;
    state.scanTimer = setTimeout(() => {
      const shouldReset = state.pendingScanReset;
      state.pendingScanReset = false;
      scanDOM({ resetExisting: shouldReset });
    }, delay);
  }

  async function loadQuote(forceRefresh = false) {
    const messageType = forceRefresh ? 'QUOTE_REFRESH' : 'QUOTE_GET';

    try {
      const quote = await chrome.runtime.sendMessage({
        type: messageType,
        ticker: state.ticker,
        forceRefresh
      });

      if (quote && Number.isFinite(quote.currentPrice)) {
        state.quote = quote;
        scheduleScan(0, true);
      } else {
        state.quote = null;
        clearBadges();
      }
    } catch (_) {
      state.quote = null;
      clearBadges();
    }
  }

  function applyTicker(nextTicker) {
    const normalized = normalizeTicker(nextTicker);
    if (normalized !== state.ticker) {
      state.ticker = normalized;
    }

    loadQuote(true);
  }

  function startObserver() {
    if (!document.body) return;

    const observer = new MutationObserver(mutations => {
      const touched = mutations.some(mutation => shouldScheduleMutation(mutation));

      if (touched) {
        scheduleScan(350, false);
      }
    });

    observer.observe(document.body, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  async function init() {
    const stored = await chrome.storage.sync.get(['selected_ticker']);
    state.ticker = normalizeTicker(stored.selected_ticker || DEFAULT_TICKER);

    await loadQuote(false);
    startObserver();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') {
      return;
    }

    if (changes.selected_ticker) {
      applyTicker(changes.selected_ticker.newValue || DEFAULT_TICKER);
    }
  });

  if (document.body) {
    init();
  } else {
    window.addEventListener('DOMContentLoaded', init, { once: true });
  }
})();
