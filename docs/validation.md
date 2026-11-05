# Squeek Studio validation

Worker validation of the completed production export on 2026-11-05. These are local observations, not an independent service certification.

## Scope and assumptions

Built a new Vite + React + TypeScript static application in the repository root, with relative assets and hash routes. The complete production export is `dist/`. There is no backend, account creation, environment file or deployment requirement. Public Squeek art can be opened by any visitor; wallet connection is an address-entry convenience, not an ownership gate.

The task’s explicit `eth_requestAccounts` limit takes priority over the broader connector reference’s transaction/network-switching workflow. The app discovers EIP-6963 providers, uses a legacy injected provider when necessary, and offers wallet-browser links on phones. Public reads always use the specified Sepolia data sources regardless of the wallet’s selected network.

## Brief coverage

| Requirement | Result and evidence |
| --- | --- |
| Home lookup, connect, three sample Squeeks, free/read-only line | Implemented. Real SVG snapshots for #1, #2 and #3; form accepts addresses and numbers, including `#1`. Invalid submissions focus their error. |
| Hash-routed wallet, Squeek and home pages | Implemented and exercised under a `/preview/` subpath, with relative assets resolving. |
| Wallet pagination and vault deposits | Implemented. Controlled two-page response yields nine tokens, including a vault token. Actual sample owner API yields six tokens. |
| Highest level then number sorting | Implemented. Controlled level-5 #7 precedes the level-1 tokens in ascending numeric order. |
| Invalid/empty wallet | Implemented, with clear errors and recovery. Empty wallet links to the supplied Squeekchain website. |
| Large onchain art, statistics, owner explorer link and all 11 traits | Implemented. API data displays all fields; fallback art and owner work without inventing missing statistics. |
| Ordered public RPC fallback and Retry | Implemented. Tests force API and first-RPC failures, decode ABI/base64 JSON/SVG from the second endpoint, then force all services to fail and recover using Retry. Actual PublicNode tokenURI also decoded successfully. |
| Exact-size profile, header, phone, desktop, sticker and share-card PNGs | Implemented. Downloaded PNG signatures and IHDR sizes verified for all six. Share-card output visually inspected with all 11 traits, level, power and attribution. |
| Background, SVG palette, zoom, vertical offset, caption, level badge, crop | Implemented. Edited and reset in Chromium; 24-character limit, 140% zoom, -50% offset, round alpha corners and solid-white background checked. |
| Direct SVG rendering at export size | Implemented in `src/render.ts:176`. The vector’s width/height are set to the target draw size before image decoding. Download and preview use the same rendered canvas. |
| PNG download, supported clipboard, X intent | Implemented. Real PNG downloads; controlled clipboard success/rejection; X URL checked for text and a canonical Squeek link. No upload or posting occurred. |
| Group shot of 2–6 wallet Squeeks | Implemented. Six selections and seventh-disabled behavior checked; group header/desktop PNGs have exact sizes. A token outside the wallet is rejected. Actual #1/#2/#3 group render visually inspected. |
| Session cache, lazy cards, six-request limit | Implemented. Reload uses sessionStorage without another request. A 30-token fixture leaves offscreen art unfetched until scrolling. Maximum observed concurrent API requests: six. API and RPC share the same limiter. |
| Dark dot grid, gold/blue, responsive and keyboard reachable | Implemented and reviewed at 320, 390, 700, 900 and 1440px. Main action is at y=392px at 390px width. Keyboard form submission, focus ring, modal dismissal and focus return checked. |
| No analytics/cookies/trackers, accounts or write actions | Source reviewed. The only wallet method is `eth_requestAccounts`; the only RPC method is `eth_call`. Fetches omit credentials and referrers. Fonts are local. |
| Required footer, page metadata, favicon, social image | Present. 1200×630 local PNG social image inspected. Footer is shared across routes. |
| Source, package/lockfile, static export, README and DESIGN | Present. Build and typecheck passed; no runtime dependence on scratch evidence or pinned input files. |

## Better Interface review

All six pinned domains were read and applied during construction, then reviewed against the final export. The application is a dark creative tool carried by one visual idea: dot-grid Squeek art on a restrained gold-and-blue workbench.

| Domain | Coverage | Evidence and limits |
| --- | --- | --- |
| Accessibility | Checked | Native controls, labels, landmarks, one main heading per route, alt names, semantic traits, error associations and live status messages inspected. Keyboard lookup/Enter, invalid-field focus, named-wallet selection, Escape and modal focus return exercised. The search focus perimeter is 2px and visually confirmed. axe reported zero violations in 10 route/width states. Screen readers and physical assistive devices were not tested. |
| Layout | Checked | Production layouts inspected at 320/390/700/900/1440. No horizontal overflow on home, detail or editor; native selection and group layouts checked. The 390px first screen visibly contains product and lookup, with the action ending at 392px in an 844px viewport. Native browser zoom, text-only 200% enlargement, RTL and translations were not separately tested. |
| Writing | Checked | Action labels match their behavior; errors explain recovery; fallback and missing values are explicit. Reduced the initial slogan stack to one two-beat headline. Share text says to attach the PNG manually. Footer remains the required unofficial/read-only attribution. |
| Typography | Checked | Local font faces loaded in Chromium, two families and three weights measured. Five sizes on the home page at 390/1440; labelled inputs retain 16px text. Long wallet addresses wrap, numeric outputs are tabular, and owner abbreviation retains full destination/name. Locale/translated strings were not tested. |
| Colors | Checked | Measured solid UI pairs meet WCAG text contrast. Dot-grid compositing was calculated separately. Export text selects black/white based on luminance. Automated tools leave patterned, image and canvas backgrounds for manual review; arbitrary SVG pixel pairs and the eventual backdrop of transparent exports are not certified. |
| UI details | Checked | Hover/focus/pressed/disabled/loading/empty/error/retry states inspected or exercised. Current-render gating prevents stale download exports. Reduced-motion probe passes with no endless animation; there is no `transition: all`, border-plus-shadow card or gradient text. Physical touch behavior and 10%-speed animation replay were not performed. |

### Findings fixed

| Domain / severity | Source | Observed issue, fix and recheck |
| --- | --- | --- |
| Layout / medium | `src/App.tsx:190`, `src/styles.css:468` | The first probe identified hero example label overlaps. The lower profile label was hidden behind the banner; it was removed. The banner copy was simplified and its subtitle given 20px separation. Final screenshot and probe show no overlapping text. |
| Writing / medium | `src/App.tsx:170` | The initial home copy repeated eight short two-beat lines. Removed redundant slogans and kept the main headline. Final probe finds one two-beat line. |
| Accessibility / medium | `src/App.tsx:185` | A named decorative composition used `aria-label` on a generic div. Added a meaningful `role="img"` with a complete name. The follow-up axe audit no longer requests manual review for prohibited ARIA attributes. |
| Accessibility / medium | `src/styles.css:352` | The search wrapper only changed a 1px border while its input suppressed the inner outline. Added a 2px focus perimeter to the wrapper. Keyboard Tab focuses `lookup`; computed width is 2px, visibly confirmed on the final 390px screenshot. |
| Layout / low | `src/styles.css:204` | Full-page capture exposed the offscreen translated skip link at a scrolled offset. Replaced translation hiding with a clipped focusable shape and restored the full shape on focus. Final screenshots keep it hidden unless focused. |
| Colors / medium | `src/render.ts:149` | Source review found an export text luminance threshold that could choose light text over a medium-light palette. Changed to black/white selection at 0.179 luminance; verified the solid-white output and re-inspected exports. Transparent destinations remain outside the renderer’s knowledge. |
| Robustness / low | `src/data.ts:319`, `src/WalletConnect.tsx:30` | Pagination now accepts non-null numeric as well as string cursors and rejects malformed/repeated cursors. The Rabby phone link was corrected to the current public landing page’s `_cmd=open-dapp&dapp=…` form. Phone link construction and named-provider retry passed the interaction suite; physical app-opening remains unverified. |

No reproduced high or medium issue remains open within the implemented scope. The browser/service limitations below remain explicitly unverified rather than counted as passes.

### Measured color pairs

WCAG relative-luminance calculations from the implemented values:

| Foreground / background | Contrast |
| --- | --- |
| `#f5f3ed` / `#1a1a20` | 15.61:1 |
| `#aaaab7` / `#1a1a20` | 7.54:1 |
| `#aaaab7` / `#26262b` (lightest composited UI-grid pixel) | 6.56:1 |
| `#aaaab7` / `#2b2b34` | 6.10:1 |
| `#222018` / `#f1c86a` | 10.26:1 |
| `#28231b` / `#e9c16c` (profile example) | 9.14:1 |
| `#172334` / `#a8c5fc` (banner example) | 9.09:1 |
| `#b7d0ff` / `#2b2b34` (focus against raised surface) | 9.00:1 |
| `#ffaaa4` / `#1a1a20` | 9.52:1 |

## Commands and results

| Check actually run | Result |
| --- | --- |
| `npm install --no-audit --no-fund --cache .cache/npm` | Successful dependency installation; root package and lockfile retained. |
| `npm run typecheck` | Passed, exit 0 (`tsc --noEmit`). |
| `npm run build` | Passed, exit 0. Final source compiles and exports `dist/index.html`, hashed JS/CSS/fonts, local SVG previews, favicon, license notices and social PNG. |
| `node scripts/validate.mjs` with supplied Playwright paths | Passed, exit 0: **22 deterministic interaction groups**. Downloads checked by PNG bytes and dimensions; failures and retries use controlled test responses. Test server closes on completion. |
| Live public HTTP checks | Squeek #1/#2/#3 API data decoded; account discovery returned six tokens; API response included `Access-Control-Allow-Origin: *`. PublicNode returned and decoded the actual collection token URI. |
| Real-data Chromium integration through test transport bridge | Passed for actual #1 art/traits/preview, the six-token owner wallet and actual tokenURI fallback during a forced API outage. A real three-Squeek group render was also inspected. |
| `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` with supplied Playwright paths | Final result **16/16 passed** at 320/390/1440 and reduced motion. No overflow, text overlaps, clipped text or floating-control overlap; first-screen prose 18 words at 390. Five controls are below the comfortable 44px preference but satisfy the measured 24px/spacing threshold. |
| `PLAYWRIGHT_BROWSERS_PATH=… node test/scratch/final-review.mjs` | Passed, exit 0. Final keyboard focus, five home widths, actual API art, real group rendering, white background pixels, retained screenshots and axe checks. |
| Git candidate and static-export checks | Passed. Source, lockfile, docs/evidence and export total approximately **1.60 MiB**, below 8 MiB; `dist/` is **641,047 bytes**. No node_modules, cache, scratch or dependency archives are included. The 207-byte root ignore file is within its explicit 1024-byte/one-file budget; dist and review docs are not ignored. |
| axe WCAG 2 A/AA, 2.1 AA, 2.2 AA | Zero violations in home/detail/wallet/group/dialog at 390 and 1440. Pattern/image/canvas contrast remains a manual-review item, not an automated pass. Results retained in `docs/evidence/accessibility-checks.json`. |

The standard browser suite is retained as source in `scripts/validate.mjs`. The validation report and selected evidence are also retained under `docs/` because the worker excludes `artifacts/` from Git. Scratch audit scripts, downloaded test JSON, dependency caches and PNG exports are disposable validation aids and are excluded from the submission. Production code does not import any of them.

### Evidence

Retained final rendered evidence:

- `docs/evidence/home-mobile.png`: actual 390×844 first screen, showing lookup and connection control.
- `docs/evidence/studio-desktop.png`: the full editor with actual public Squeek #1 art.
- `docs/evidence/design-checks.json`: final pinned probe checks and their measured summaries.
- `docs/evidence/accessibility-checks.json`: final viewport/action/focus measurements and 10 axe results.

Additional inspected, disposable evidence is under `test/scratch/interactions/`: all six downloaded PNGs; header/desktop group PNGs; mobile/detail screenshots; visible keyboard focus; and `group-real-header.png` with real #1/#2/#3 art. Probe screenshots are under `test/scratch/taste/shots/`. These scratch paths are removed before submission; their absence is intentional.

## Limits and completion

Direct external network requests from the test Chromium did not complete. Successful live integration checks used a test-only route bridge that forwarded the actual public HTTP responses through Node’s available network transport. It did not synthesize data. The bridge is absent from the application and export; visitors fetch the specified endpoints directly. CORS was independently confirmed on the API, but a normal external browser-to-service session was not established in this runner.

WebKit could not launch because the supplied runtime did not include that engine. Safari, physical iPhones, native wallet app-opening and real installed wallet prompts remain unverified. Connection behavior was checked with instrumented providers and the dialog with Chromium. Clipboard success/rejection was controlled in the test; physical OS clipboard transfer was not certified. No image was posted to X.

Onchain fallback preserves art and standard holder information. The current tokenURI omits live level and base power, so they remain unavailable during an API outage. Complete wallet and staking discovery likewise requires the API. These are disclosed service/data limits, not fabricated values or hidden substitute data.

**Complete for the stated implementation scope**, with the browser/device and live-network limitations above. Production build, typecheck, meaningful interaction validation, six-domain review, final design documentation and static export are complete. Hosting and the worker’s final commit occur after this task.
