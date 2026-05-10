# Chrome Web Store Submission Notes

## Name

Market Lens

## Short description

Convert web prices into BTC, sats, ETFs, and stock equivalents while you browse.

## Full description

Market Lens shows the opportunity cost of a price the moment you see it.

When you browse shopping pages or real-estate listings, Market Lens detects visible price text and adds a small inline conversion badge next to it. You can compare a price against Bitcoin, sats, US ETFs, and Taiwan stocks without leaving the page.

### Highlights

- Inline price conversion on supported pages
- BTC and sats view for Bitcoin-first users
- Quick ticker switching from the popup
- Support for US tickers and Taiwan tickers
- Local quote caching to reduce repeated requests

### Example conversions

- `NT$30,000 ≈ 0.011 BTC`
- `NT$30,000 ≈ 1,160,000 sats`
- `NT$30,000 ≈ 3.21 股 QQQ`
- `NT$30,000 ≈ 5.80 股 00713`

### How it works

1. Install the extension
2. Open a page with visible prices
3. Hover or inspect the inline badge for quick context
4. Open the popup to change the comparison asset

### Privacy

- Quote data comes from Yahoo Finance
- Preferences are stored with Chrome storage
- Visible price text is processed locally in the browser
- No custom backend is used to collect browsing content

### Disclaimer

Market Lens is an informational tool only and does not provide investment advice.

## Single purpose

Show inline BTC, sats, ETF, and stock equivalents next to visible prices on web pages.

## Privacy practices draft

### Data usage

- No sale of user data
- No use of browsing data for advertising
- No custom backend for page-content collection

### Permission justification

- `storage`
  Save the user's selected ticker and local quote cache.
- `https://query1.finance.yahoo.com/*`
  Request price data from Yahoo Finance.
- `https://query2.finance.yahoo.com/*`
  Use Yahoo Finance fallback endpoint for quote requests.
- `*://*/*`
  Read visible page price text and render inline conversion badges on supported pages.

### Remote code

- No remote code execution

## Suggested support URL

<https://github.com/Larry-kang/market-lens>

## Suggested privacy policy URL

Publish [privacy.html](C:/Users/kqazk/OneDrive/文件/Playground/etf-price-extension/privacy.html) to GitHub Pages or another public URL and use that link in the dashboard.
