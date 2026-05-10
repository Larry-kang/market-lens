importScripts('shared.js');

const {
  DEFAULT_TICKER,
  getDisplayName,
  isSatsTicker,
  normalizeTicker
} = globalThis.BAPL || {};

const CACHE_TTL_MS = 45 * 60 * 1000;
const CACHE_PREFIX = 'bapl:quote:';
const inFlight = new Map();

function getCacheKey(ticker) {
  return `${CACHE_PREFIX}${ticker}`;
}

async function getCachedQuote(ticker) {
  const key = getCacheKey(ticker);
  const result = await chrome.storage.local.get(key);
  return result[key] || null;
}

async function setCachedQuote(ticker, quote) {
  await chrome.storage.local.set({
    [getCacheKey(ticker)]: quote
  });
}

function isFresh(entry) {
  return Boolean(entry && Number.isFinite(entry.fetchedAt) && Date.now() - entry.fetchedAt < CACHE_TTL_MS);
}

function getSeriesPrice(result) {
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const numericCloses = closes.filter(value => Number.isFinite(value));

  if (numericCloses.length > 0) {
    return numericCloses[numericCloses.length - 1];
  }

  if (Number.isFinite(result?.meta?.regularMarketPrice)) {
    return result.meta.regularMarketPrice;
  }

  if (Number.isFinite(result?.meta?.previousClose)) {
    return result.meta.previousClose;
  }

  return null;
}

function getYahooTicker(ticker) {
  return isSatsTicker?.(ticker) ? 'BTC-USD' : ticker;
}

function buildQuoteFromResult(ticker, result) {
  const meta = result?.meta || {};
  const currentPrice = getSeriesPrice(result);

  if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
    throw new Error(`Yahoo Finance did not return a usable price for ${ticker}`);
  }

  const currency = String(meta.currency || (ticker.endsWith('.TW') ? 'TWD' : 'USD')).toUpperCase();
  const displayName = isSatsTicker?.(ticker) ? getDisplayName(ticker) : meta.shortName || meta.longName || getDisplayName(ticker);

  return {
    ticker,
    displayName,
    currency,
    currentPrice,
    marketTime: Number.isFinite(meta.regularMarketTime) ? meta.regularMarketTime * 1000 : null,
    fetchedAt: Date.now(),
    source: Number.isFinite(meta.regularMarketPrice) ? 'regularMarketPrice' : 'chartClose'
  };
}

async function fetchYahooQuote(ticker) {
  const yahooTicker = getYahooTicker(ticker);
  const endpoints = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=1y&includePrePost=false`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=1y&includePrePost=false`
  ];

  let lastError = null;

  for (const url of endpoints) {
    try {
      const response = await fetch(url, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      const result = payload?.chart?.result?.[0];

      if (!result) {
        const message = payload?.chart?.error?.description || 'No quote data returned';
        throw new Error(message);
      }

      return buildQuoteFromResult(ticker, result);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Unable to fetch ${ticker}`);
}

async function getQuote(ticker, forceRefresh = false) {
  const normalizedTicker = normalizeTicker(ticker);
  const cached = await getCachedQuote(normalizedTicker);

  if (!forceRefresh && isFresh(cached)) {
    return {
      ...cached,
      fromCache: true
    };
  }

  const cacheKey = `${normalizedTicker}:${forceRefresh ? 'refresh' : 'auto'}`;

  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const task = (async () => {
    try {
      const quote = await fetchYahooQuote(normalizedTicker);
      await setCachedQuote(normalizedTicker, quote);
      return quote;
    } catch (error) {
      if (cached) {
        return {
          ...cached,
          fromCache: true,
          stale: true,
          error: error.message
        };
      }

      return {
        ticker: normalizedTicker,
        displayName: getDisplayName(normalizedTicker),
        currency: normalizedTicker.endsWith('.TW') ? 'TWD' : 'USD',
        currentPrice: null,
        fetchedAt: Date.now(),
        error: error.message
      };
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, task);
  return task;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') {
    return false;
  }

  if (message.type === 'QUOTE_GET' || message.type === 'QUOTE_REFRESH') {
    getQuote(message.ticker || DEFAULT_TICKER, message.type === 'QUOTE_REFRESH' || message.forceRefresh === true)
      .then(sendResponse)
      .catch(error => sendResponse({
        ticker: normalizeTicker(message.ticker || DEFAULT_TICKER),
        displayName: getDisplayName(message.ticker || DEFAULT_TICKER),
        currency: normalizeTicker(message.ticker || DEFAULT_TICKER).endsWith('.TW') ? 'TWD' : 'USD',
        currentPrice: null,
        fetchedAt: Date.now(),
        error: error.message
      }));

    return true;
  }

  return false;
});
