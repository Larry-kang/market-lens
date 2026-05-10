# Market Lens

Market Lens is a Chrome extension that converts visible web prices into BTC, sats, ETFs, and stock equivalents.

## What it does

- Detects visible price text on shopping and real-estate pages
- Shows inline conversions such as BTC, sats, US ETFs, and Taiwan stocks
- Supports custom tickers through the popup
- Caches Yahoo Finance quotes to reduce repeated API calls

## Supported examples

- `BTC` -> `BTC-USD`
- `SATS` -> BTC price shown in satoshi units
- `QQQ`, `VOO`, `IBIT`
- `0050`, `00631L`, `00713`, `2330`

## Local development

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select this project folder or `C:\Users\kqazk\bapl-local-extension`

## Test

```bash
npm test
```

## Packaging

The current store upload package is:

- [market-lens-store.zip](C:/Users/kqazk/OneDrive/文件/Playground/market-lens-store.zip)

## Privacy

- Quotes are requested from Yahoo Finance
- User preferences are stored with `chrome.storage`
- Page price text is read locally to generate conversions
- The extension does not upload page contents to a custom backend

## Support

- GitHub Sponsors: <https://github.com/sponsors/Larry-kang>
- Project page: <https://github.com/Larry-kang/market-lens>
