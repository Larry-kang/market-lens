(function (root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.BAPL = api;
})(typeof globalThis !== 'undefined' ? globalThis : self, function () {
  const DEFAULT_TICKER = 'BTC-USD';
  const DEFAULT_USD_TWD = 32;
  const SATS_TICKER = 'BTC-SATS';
  const SATS_PER_BTC = 100000000;

  const WATCHLIST = [
    'BTC-USD',
    SATS_TICKER,
    'ETH-USD',
    'IBIT',
    'QQQ',
    'VOO',
    'TQQQ',
    '0050.TW',
    '00631L.TW',
    '0056.TW',
    '00878.TW',
    '00919.TW',
    '00929.TW',
    '00940.TW',
    '00713.TW',
    '00662.TW',
    '2330.TW',
    '2317.TW',
    '2454.TW',
    '2412.TW'
  ];

  const DISPLAY_NAMES = {
    'BTC-USD': 'Bitcoin',
    [SATS_TICKER]: 'Satoshi',
    'ETH-USD': 'Ethereum',
    'IBIT': 'iShares Bitcoin Trust',
    'QQQ': 'Invesco QQQ',
    'VOO': 'Vanguard S&P 500 ETF',
    'TQQQ': 'ProShares UltraPro QQQ',
    '0050.TW': '元大台灣50',
    '00631L.TW': '元大台灣50正2',
    '0056.TW': '元大高股息',
    '00878.TW': '國泰永續高股息',
    '00919.TW': '群益台灣精選高息',
    '00929.TW': '復華台灣科技優息',
    '00940.TW': '元大台灣價值高息',
    '00713.TW': '元大台灣高息低波',
    '00662.TW': '富邦NASDAQ',
    '2330.TW': '台積電',
    '2317.TW': '鴻海',
    '2454.TW': '聯發科',
    '2412.TW': '中華電'
  };

  const MONEY_PREFIX_RE = /(?<prefix>NT\$|NTD|TWD|US\$|USD|\$)\s*(?<amount>\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/i;
  const MONEY_SUFFIX_RE = /(?<amount>\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)(?<unit>\s*萬)?\s*元/i;
  const MONEY_CONTEXT_RE = /(?:總價|原始售價|售價|價格|成交價|房價|租金|月租|月付|管理費|單價)/i;
  const MONEY_WAN_RE = /(?<amount>\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*萬(?!\s*元)/i;

  const aliasMap = {
    BTC: 'BTC-USD',
    SAT: SATS_TICKER,
    SATS: SATS_TICKER,
    ETH: 'ETH-USD',
    SOL: 'SOL-USD',
    BNB: 'BNB-USD',
    DOGE: 'DOGE-USD'
  };

  function normalizeTicker(input) {
    const t = String(input ?? '').trim().toUpperCase();

    if (!t) return DEFAULT_TICKER;
    if (aliasMap[t]) return aliasMap[t];
    if (t.includes('-USD')) return t;
    if (t.includes('.')) return t;
    if (/^\d{4,6}[A-Z]*$/.test(t)) return `${t}.TW`;

    return t;
  }

  function isSatsTicker(input) {
    return normalizeTicker(input) === SATS_TICKER;
  }

  function getDisplayName(input) {
    const ticker = normalizeTicker(input);
    return DISPLAY_NAMES[ticker] || ticker.replace(/-USD$/, '');
  }

  function trimTrailingZeros(value, decimals) {
    const fixed = Number(value).toFixed(decimals);
    return fixed
      .replace(/(\.\d*?[1-9])0+$/u, '$1')
      .replace(/\.0+$/u, '')
      .replace(/\.$/u, '');
  }

  function getQuantityPrecision(ticker) {
    const normalized = normalizeTicker(ticker);
    if (isSatsTicker(normalized)) return 0;

    const base = normalized.replace(/-USD$/u, '');

    if (base === 'BTC') return 8;
    if (base === 'ETH') return 6;

    return 2;
  }

  function getUnitLabel(ticker) {
    const normalized = normalizeTicker(ticker);
    if (isSatsTicker(normalized)) return 'sats';

    return normalized.endsWith('-USD') ? normalized.replace(/-USD$/u, '') : normalized;
  }

  function formatTargetQuantity(quantity, ticker) {
    if (!Number.isFinite(quantity)) {
      return '≈ —';
    }

    const normalized = normalizeTicker(ticker);

    if (isSatsTicker(normalized)) {
      const sats = quantity * SATS_PER_BTC;
      const maximumFractionDigits = Math.abs(sats) < 1 ? 2 : 0;
      const formatted = new Intl.NumberFormat('en-US', {
        maximumFractionDigits
      }).format(sats);

      return `≈ ${formatted} sats`;
    }

    const precision = getQuantityPrecision(normalized);
    const unitLabel = getUnitLabel(normalized);

    if (precision <= 2) {
      return `≈ ${quantity.toFixed(2)} 股 ${unitLabel}`;
    }

    return `≈ ${trimTrailingZeros(quantity, precision)} ${unitLabel}`;
  }

  function formatMoney(value, currency) {
    if (!Number.isFinite(value)) return '—';

    const code = String(currency || 'TWD').toUpperCase();
    const prefix = code === 'TWD' ? 'NT$' : code === 'USD' ? '$' : `${code} `;
    const fractionDigits = code === 'JPY' ? 0 : code === 'TWD' && Number.isInteger(value) ? 0 : 2;
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(value);

    return `${prefix}${formatted}`;
  }

  function normalizeText(text) {
    return String(text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseBareWanText(text) {
    const cleaned = normalizeText(text);
    const wanMatch = cleaned.match(/(?<amount>\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*萬(?!\s*元)/);

    if (!wanMatch?.groups?.amount) {
      return null;
    }

    const amount = Number(wanMatch.groups.amount.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    return {
      amount: amount * 10000,
      currency: 'TWD',
      text: cleaned
    };
  }

  function decode591ObfuscatedText(value) {
    const raw = String(value ?? '');

    if (!raw || !raw.endsWith('aes')) {
      return raw;
    }

    try {
      const body = raw.substring(13, raw.length - 20);
      const reversed = body.split('').reverse().join('');
      const padding = (4 - (reversed.length % 4)) % 4;
      const base64 = `${reversed}${'='.repeat(padding)}`;
      const decodeBase64 = typeof atob === 'function'
        ? atob
        : encoded => Buffer.from(encoded, 'base64').toString('utf8');
      const decoded = decodeBase64(base64);

      return decodeURIComponent(decoded.substring(8, decoded.length - 9));
    } catch (_) {
      return raw;
    }
  }

  function parse591HousePriceText(priceValue, unitText = '萬元') {
    const decodedPrice = normalizeText(decode591ObfuscatedText(priceValue));
    const normalizedUnit = normalizeText(unitText) || '萬元';

    if (!decodedPrice) {
      return null;
    }

    const parsed = parseMoneyText(`${decodedPrice} ${normalizedUnit}`.trim());
    if (parsed) {
      return parsed;
    }

    const numericPrice = Number(decodedPrice.replace(/,/g, ''));
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return null;
    }

    return {
      amount: /萬/.test(normalizedUnit) ? numericPrice * 10000 : numericPrice,
      currency: 'TWD',
      text: `${decodedPrice} ${normalizedUnit}`.trim()
    };
  }

  function parseMoneyText(text) {
    const cleaned = normalizeText(text);
    const prefixMatch = cleaned.match(MONEY_PREFIX_RE);
    if (prefixMatch?.groups?.amount) {
      const amount = Number(prefixMatch.groups.amount.replace(/,/g, ''));
      if (Number.isFinite(amount) && amount > 0) {
        const prefix = (prefixMatch.groups.prefix || '').toUpperCase();
        const currency = /US\$|USD/.test(prefix) ? 'USD' : 'TWD';

        return {
          amount,
          currency,
          text: cleaned
        };
      }
    }

    const suffixMatch = cleaned.match(MONEY_SUFFIX_RE);
    if (suffixMatch?.groups?.amount) {
      const amount = Number(suffixMatch.groups.amount.replace(/,/g, ''));
      if (Number.isFinite(amount) && amount > 0) {
        const multiplier = String(suffixMatch.groups.unit || '').trim() ? 10000 : 1;
        return {
          amount: amount * multiplier,
          currency: 'TWD',
          text: cleaned
        };
      }
    }

    if (MONEY_CONTEXT_RE.test(cleaned)) {
      const wanMatch = cleaned.match(MONEY_WAN_RE);
      if (wanMatch?.groups?.amount) {
        const amount = Number(wanMatch.groups.amount.replace(/,/g, ''));
        if (Number.isFinite(amount) && amount > 0) {
          return {
            amount: amount * 10000,
            currency: 'TWD',
            text: cleaned
          };
        }
      }
    }

    return null;
  }

  function shouldScheduleMutation(mutation) {
    const target = mutation && mutation.target;
    const targetElement = target && target.nodeType === 3 ? target.parentElement : target;

    if (targetElement && typeof targetElement.closest === 'function') {
      if (targetElement.closest(`.${'bapl-badge'}`)) return false;
      if (targetElement.closest(`[${'data-bapl-processed'}]`)) return false;
    }

    if (mutation?.type === 'characterData') {
      return true;
    }

    return Array.from(mutation?.addedNodes || []).some(node => node && (node.nodeType === 1 || node.nodeType === 3));
  }

  return {
    DEFAULT_TICKER,
    DEFAULT_USD_TWD,
    SATS_TICKER,
    SATS_PER_BTC,
    WATCHLIST,
    DISPLAY_NAMES,
    formatMoney,
    formatTargetQuantity,
    decode591ObfuscatedText,
    getDisplayName,
    getQuantityPrecision,
    getUnitLabel,
    isSatsTicker,
    parseBareWanText,
    parse591HousePriceText,
    parseMoneyText,
    normalizeTicker,
    shouldScheduleMutation
  };
});
