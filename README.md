# MP Quant OS v4.0 Alpha

Institutional AI Research Terminal.

## Features in Alpha
- React + Vite frontend
- Netlify Functions backend
- Live Yahoo Finance chart endpoint
- Stock research engine
- Watchlist
- Hedge-fund framework engine:
  - Citadel Alpha
  - AQR Factor
  - Bridgewater Macro
  - Two Sigma Risk
  - D.E. Shaw StatArb
  - Jane Street Liquidity
  - Virtu Execution
  - GS QIS
- Portfolio health
- AI Investment Committee placeholder engine

## Deploy free
Recommended: GitHub + Netlify.

### Netlify settings
Build command:
npm run build

Publish directory:
dist

Functions directory:
netlify/functions

## Local run
npm install
npm run dev

## Important
Netlify Functions may not work reliably through simple static drag-and-drop. Use GitHub import or Netlify CLI.
