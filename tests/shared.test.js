const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_TICKER,
  SATS_TICKER,
  WATCHLIST,
  formatMoney,
  decode591ObfuscatedText,
  getDisplayName,
  formatTargetQuantity,
  parse591HousePriceText,
  parseBareWanText,
  parseMoneyText,
  shouldScheduleMutation,
  normalizeTicker
} = require('../shared.js');

test('normalizeTicker maps BTC aliases to BTC-USD', () => {
  assert.equal(normalizeTicker('BTC'), 'BTC-USD');
  assert.equal(normalizeTicker('btc-usd'), 'BTC-USD');
});

test('normalizeTicker maps SATS to the BTC-derived sats ticker', () => {
  assert.equal(normalizeTicker('SATS'), SATS_TICKER);
  assert.equal(getDisplayName('SATS'), 'Satoshi');
});

test('normalizeTicker maps Taiwan numeric tickers to .TW', () => {
  assert.equal(normalizeTicker('00713'), '00713.TW');
  assert.equal(normalizeTicker('2330'), '2330.TW');
  assert.equal(normalizeTicker('00631L'), '00631L.TW');
});

test('normalizeTicker falls back to the default ticker for blank input', () => {
  assert.equal(normalizeTicker('   '), DEFAULT_TICKER);
});

test('getDisplayName returns the configured label', () => {
  assert.equal(getDisplayName('00713.TW'), '元大台灣高息低波');
  assert.equal(getDisplayName('QQQ'), 'Invesco QQQ');
});

test('formatTargetQuantity uses asset-specific precision', () => {
  assert.equal(formatTargetQuantity(0.0062, 'BTC-USD'), '≈ 0.0062 BTC');
  assert.equal(formatTargetQuantity(0.0062, 'SATS'), '≈ 620,000 sats');
  assert.equal(formatTargetQuantity(0.0045001, 'ETH-USD'), '≈ 0.0045 ETH');
  assert.equal(formatTargetQuantity(3.2, 'QQQ'), '≈ 3.20 股 QQQ');
});

test('WATCHLIST includes common Taiwan quick picks', () => {
  [
    'BTC-USD',
    SATS_TICKER,
    '0050.TW',
    '00631L.TW',
    '0056.TW',
    '00878.TW',
    '00919.TW',
    '00929.TW',
    '00940.TW'
  ].forEach(ticker => {
    assert.ok(WATCHLIST.includes(ticker), `${ticker} should be in the quick picks`);
  });
});

test('formatMoney keeps TWD integers compact', () => {
  assert.equal(formatMoney(30000, 'TWD'), 'NT$30,000');
  assert.equal(formatMoney(165.125, 'TWD'), 'NT$165.13');
  assert.equal(formatMoney(1234.5, 'USD'), '$1,234.50');
});

test('parseMoneyText accepts explicit money markers', () => {
  assert.deepEqual(parseMoneyText('NT$30,000'), {
    amount: 30000,
    currency: 'TWD',
    text: 'NT$30,000'
  });
  assert.deepEqual(parseMoneyText('269,999元'), {
    amount: 269999,
    currency: 'TWD',
    text: '269,999元'
  });
  assert.deepEqual(parseMoneyText('原始售價 1728 萬元'), {
    amount: 17280000,
    currency: 'TWD',
    text: '原始售價 1728 萬元'
  });
  assert.deepEqual(parseMoneyText('總價 1728萬'), {
    amount: 17280000,
    currency: 'TWD',
    text: '總價 1728萬'
  });
  assert.deepEqual(parseMoneyText('促銷價428,000元 賣貴通報'), {
    amount: 428000,
    currency: 'TWD',
    text: '促銷價428,000元 賣貴通報'
  });
  assert.equal(parseMoneyText('2萬人'), null);
  assert.equal(parseMoneyText('30,000'), null);
});

test('parseBareWanText converts bare wan prices', () => {
  assert.deepEqual(parseBareWanText('3,027萬'), {
    amount: 30270000,
    currency: 'TWD',
    text: '3,027萬'
  });

  assert.deepEqual(parseBareWanText('3,135萬'), {
    amount: 31350000,
    currency: 'TWD',
    text: '3,135萬'
  });
});

test('decode591ObfuscatedText unwraps 591 price payloads', () => {
  assert.equal(
    decode591ObfuscatedText('Pp3w6VXvpegGfKRXO5N2S0N2SwQTNDJTJxYHTaxGZYV3StI62RJtBXQncy36vraes'),
    '1,540'
  );
  assert.equal(
    decode591ObfuscatedText('1UaeijtwNlK1705GUMxWQEVlRwQTNDJTJxE2VOpmc0cjYain8BwE9NxH4qbfIVaes'),
    '1,540'
  );
  assert.equal(decode591ObfuscatedText('1,540'), '1,540');
});

test('parse591HousePriceText converts 591 house price payloads into TWD', () => {
  assert.deepEqual(
    parse591HousePriceText('Pp3w6VXvpegGfKRXO5N2S0N2SwQTNDJTJxYHTaxGZYV3StI62RJtBXQncy36vraes', '萬元'),
    {
      amount: 15400000,
      currency: 'TWD',
      text: '1,540 萬元'
    }
  );
});

test('shouldScheduleMutation ignores mutations caused by our own badge insertion', () => {
  const ownTarget = {
    closest(selector) {
      return selector === '[data-bapl-processed]' ? {} : null;
    }
  };

  const externalTarget = {
    closest() {
      return null;
    }
  };

  assert.equal(shouldScheduleMutation({ target: ownTarget, addedNodes: [{ nodeType: 1 }] }), false);
  assert.equal(shouldScheduleMutation({ target: externalTarget, addedNodes: [{ nodeType: 1 }] }), true);
});
