# Squeek Studio

A free, unofficial creative studio for Squeekchain holders. Find a Squeek by number or wallet address, then make profile pictures, X headers, phone and desktop wallpapers, stickers, share cards, or a group shot. All rendering happens in the visitor’s browser.

## Run locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open the local URL Vite prints. To check and rebuild the production export:

```sh
npm run typecheck
npm run build
npm run preview
```

The complete static export is **`dist/`**. It is included with the source and lockfile, with relative asset URLs, locally bundled fonts and hash routes. Serve the entire directory, including `assets/`, `art/`, `licenses/`, the favicon and social image. A static HTTP server is enough; there is no backend, account system, build-time data fetch, environment file, key or API configuration. No rewrite rules are needed. The export works under a gateway subpath, including IPFS paths.

## Use the studio

- Enter a full `0x` wallet address or a Squeek number from 1 to 9999. The three home-page samples also open the studio.
- “Connect wallet” discovers browser wallets through EIP-6963, with a legacy browser-provider fallback. Its only provider request is `eth_requestAccounts`. On a phone without a provider, the dialog offers links to open the page inside a wallet browser. Pasting an address always works without connecting. The app never signs, sends transactions, switches networks or creates a wallet account.
- Wallet results include vault deposits, tagged **In the vault**, and sort by descending level, then ascending token number. “Make a group shot” lets you choose 2–6 Squeeks from that wallet for a header or desktop wallpaper.
- Pick a format and adjust the background, zoom (60–140%), vertical offset, caption (24 Unicode characters), level badge and supported crop options. X headers also support left/right art placement. Palette swatches are extracted from the SVG, not guessed.
- Download PNG saves the full-size render. Copy image appears when the secure browser supports `ClipboardItem`; clipboard permission failures offer the download alternative. Share on X opens an intent with text and the Squeek page link. It does not upload an image; attach the downloaded PNG yourself. A group’s share link points to its first Squeek.

| Format | Exact export |
| --- | --- |
| Profile picture | 1024 × 1024 PNG; optional round crop |
| X header | 1500 × 500 PNG |
| Phone wallpaper | 1170 × 2532 PNG |
| Desktop wallpaper | 2560 × 1440 PNG |
| Sticker | 512 × 512 PNG; round crop and transparent corners |
| Share card | 1080 × 1350 PNG; art, number, level, power and all 11 traits |

Round crops retain transparent corners even when a solid interior background is chosen. Stickers start with a transparent background and no badge. Header and desktop exports are also the group formats. The preview canvas uses the actual export dimensions; the browser rasterizes the source SVG at the requested art size. It never enlarges a thumbnail bitmap. Large zoom and offset values intentionally crop the art within its viewport without covering the caption or trait labels.

## Data sources and privacy

- Wallets: `GET https://api.squeekchain.com/v1/accounts/{address}`, following every `nextCursor` with `?cursor=…`. Wallet and staking custody are both included.
- Individual Squeeks: `GET https://api.squeekchain.com/v1/squeeks/{tokenId}`. This supplies the onchain SVG, 11 traits, level, base power and custody owner. The supplied service currently serves **Sepolia, chain 11155111**.
- If that request fails or lacks art, the app reads `tokenURI(uint256)` from collection **`0xc4c7982657f00509548f3a3a41db7fa439a6856b`**, using **`https://ethereum-sepolia-rpc.publicnode.com`**, then **`https://sepolia.gateway.tenderly.co`**. It decodes the ABI string, embedded JSON and embedded SVG. A standard read-only `ownerOf(uint256)` call supplies the onchain holder when possible.
- The current token URI does **not** contain level or base power. In fallback mode those fields honestly say “Unavailable” unless future metadata supplies them. The owner may be a vault contract. No statistics or ownership are invented. Wallet discovery requires the API because `tokenURI` cannot enumerate a wallet’s vault deposits. An unavailable wallet API gives an explanation and Retry.
- All API and RPC requests share a queue capped at **six simultaneous requests**, each with a 12-second timeout. Art is fetched as wallet cards approach the viewport. Successful responses are cached in memory and `sessionStorage` for five minutes; blocked or full storage falls back to memory. Errors are not cached. Retry clears the relevant cache. Cache data disappears with the browser session.
- There are no cookies, analytics, trackers, signing requests or account creation. Fetches omit credentials and referrers. Public endpoints still receive normal network requests from the visitor. Fonts are bundled locally, so no font service is contacted at runtime. External wallet, explorer, Squeekchain and X links open only on user action.

The home-page SVG previews are real Squeeks #1, #2 and #3 fetched from the public API on 2026-11-05. Their onchain art is preserved in `design/art/`; the background-free derivatives in `public/art/` are only landing-page previews. Detail pages always load the actual public data. Test fixtures are confined to the validation script and never ship in the application bundle.

## Validation

`npm run typecheck` and `npm run build` passed. The finished export was exercised under `/preview/`, with all local assets resolving. The browser suite passed **22 deterministic interaction groups**, including real PNG bytes and dimensions for all formats, alpha corners, editing, clipboard success/rejection, share links, wallet pagination/sorting, vault tags, six-request concurrency, group selection/exports, session caching, invalid/empty/error states, RPC fallback and Retry. Chromium layouts were checked at 320, 390, 700, 900 and 1440 px. The pinned taste probe passed **16/16** checks. An axe WCAG audit reported no violations across home, detail, wallet, group and connection dialog at 390 and 1440 px; manual-review items and exact coverage are recorded in [docs/validation.md](docs/validation.md).

Actual API responses, the six-token sample owner wallet and the actual Sepolia token URI were also rendered successfully using a test-only Node transport bridge. Direct external requests from the test Chromium could not complete; the deployed app makes direct browser requests and does not include that bridge. An independent HTTP check confirmed the API’s `Access-Control-Allow-Origin: *`. WebKit was unavailable, so Safari and physical iPhone behavior remain unverified. Clipboard integration was validated with controlled permission results, not a physical OS clipboard. No real wallet connection or X posting was performed.

To rerun browser checks with a local Playwright installation:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
npm run check:browser
```

Alternatively, set `IMD_PLAYWRIGHT` to an existing Playwright `index.mjs` and `PLAYWRIGHT_BROWSERS_PATH` to its browsers. The script starts and closes its own temporary preview server, writes disposable evidence only to `test/scratch/interactions/`, and clearly separates fixtures, live-data checks and unavailable browser engines. This dependency and browser download are only for optional validation, not the site build or static export.

## Implementation and attribution

- `src/data.ts`: validation, cache, request queue, pagination and public RPC fallback.
- `src/render.ts`: SVG handling and shared full-resolution canvas compositions.
- `src/App.tsx`: hash routes, lookup, wallet/detail/group views and lazy cards.
- `src/Studio.tsx`: presets, editing, preview, PNG, clipboard and sharing.
- `src/WalletConnect.tsx`: public-address connection dialog.
- `src/styles.css`: implemented design tokens and responsive styles, documented in [DESIGN.md](DESIGN.md).

Art comes from the Squeek onchain renderer. This is an unofficial fan tool, not a Squeekchain service. DM Sans and Space Grotesk are bundled under their SIL Open Font Licenses in `public/licenses/`. Design guidance was adapted from Jakub Krehel’s Better Interface (MIT) and the documentation method from Paul Bakaus’s Impeccable (Apache-2.0); the supplied notices and licenses are retained in `docs/DESIGN-LICENSES.txt`.
