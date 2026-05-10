# Chrome Web Store Final Copy

## Current blocker

GitHub Pages is not available for the current repository state.

- Repository: `https://github.com/Larry-kang/market-lens`
- Visibility: `Private`
- GitHub API result: `Your current plan does not support GitHub Pages for this repository.`

### Fastest ways to get a privacy policy URL

1. Make `Larry-kang/market-lens` public, then enable GitHub Pages from `main` root.
2. Keep the repo private and publish [privacy.html](C:/Users/kqazk/OneDrive/文件/Playground/etf-price-extension/privacy.html) somewhere else public.

If you switch the repo to public and then enable Pages, the expected privacy policy URL will be:

- `https://larry-kang.github.io/market-lens/privacy.html`

## Store listing

### Name

`Market Lens`

### Summary

`Convert web prices into BTC, sats, ETFs, and stock equivalents while you browse.`

### Category

`Productivity`

### Language

`English`

### Description

```txt
Market Lens shows the opportunity cost of a price the moment you see it.

When you browse shopping pages or real-estate listings, Market Lens detects visible price text and adds a small inline conversion badge next to it. You can compare a price against Bitcoin, sats, US ETFs, and Taiwan stocks without leaving the page.

Highlights
- Inline price conversion on supported pages
- BTC and sats view for Bitcoin-first users
- Quick ticker switching from the popup
- Support for US tickers and Taiwan tickers
- Local quote caching to reduce repeated requests

Example conversions
- NT$30,000 ≈ 0.011 BTC
- NT$30,000 ≈ 1,160,000 sats
- NT$30,000 ≈ 3.21 股 QQQ
- NT$30,000 ≈ 5.80 股 00713

How it works
1. Install the extension
2. Open a page with visible prices
3. Market Lens detects visible price text and renders a conversion badge
4. Open the popup to change the comparison asset

Privacy summary
- Quote data comes from Yahoo Finance
- Preferences are stored with Chrome storage
- Visible price text is processed locally in the browser
- No custom backend is used to collect browsing content

Disclaimer
Market Lens is an informational tool only and does not provide investment advice.
```

## Privacy practices

### Single purpose

`Show inline BTC, sats, ETF, and stock equivalents next to visible prices on web pages.`

### Permissions

`storage`

- Save the user's selected ticker and local quote cache.

`https://query1.finance.yahoo.com/*`

- Request price data from Yahoo Finance.

`https://query2.finance.yahoo.com/*`

- Use Yahoo Finance fallback endpoint for quote requests.

`*://*/*`

- Read visible page price text and render inline conversion badges on supported pages.

### Remote code

`No`

### Data usage

Recommended answers based on the current extension behavior:

- Collected personal data: `No`
- Sold user data: `No`
- Used for advertising: `No`
- Used for creditworthiness or lending: `No`

### Support URL

`https://github.com/Larry-kang/market-lens`

### Privacy policy URL

Use the final public URL for [privacy.html](C:/Users/kqazk/OneDrive/文件/Playground/etf-price-extension/privacy.html).

If you make the repo public and enable GitHub Pages, use:

- `https://larry-kang.github.io/market-lens/privacy.html`
