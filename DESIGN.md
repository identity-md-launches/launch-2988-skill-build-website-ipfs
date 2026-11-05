# Squeek Studio design

## Overview

Squeek Studio is a browser-based creative tool for Squeek holders and visitors exploring the art. The visual idea is a dark dot-grid workbench with the Squeeks themselves providing the character. A gold primary action, cool blue utility accents and real onchain SVGs carry the design. The home page pairs a compact lookup with two overlapping export examples; the editor uses a stable preview alongside plainly labelled controls.

The brief’s `#1A1A20` background is retained. The site has one dark theme, no ornamental entrance animation and no dependence on remote visual assets. The implemented source is `src/styles.css`, with reusable UI in `src/App.tsx`, `src/Studio.tsx`, `src/WalletConnect.tsx` and `src/icons.tsx`.

## Colors

The semantic CSS properties in `src/styles.css :root` are the canonical palette. New components should consume those properties rather than add parallel values.

| Token | Value | Role |
| --- | --- | --- |
| `--color-page` | `#1a1a20` | Page background |
| `--color-surface` | `#222229` | Cards, buttons and dialog |
| `--color-raised` | `#2b2b34` | Hover and raised controls |
| `--color-input` | `#17171d` | Fields and preview chrome |
| `--color-border` | `#3e3e49` | Control boundaries |
| `--color-text` | `#f5f3ed` | Main text |
| `--color-muted` | `#aaaab7` | Supporting text and labels |
| `--color-gold` | `#f1c86a` | Primary action, selection and brand |
| `--color-gold-hover` | `#ffda85` | Primary-action hover |
| `--color-blue` | `#a8c5fc` | Secondary selection, utilities and preview example |
| `--color-danger` | `#ffaaa4` | Recoverable validation errors |
| `--color-focus` | `#b7d0ff` | Keyboard focus perimeter |

The body’s 20px dot pattern uses `#ffffff0d` over the page. The profile example has a matte `#e9c16c` backing with `#28231b` text; the banner uses the blue token with `#172334` text. These are graphic compositions, not extra action styles. Error text is accompanied by a clear message, selection by a check or pressed state, and connection state by a readable address.

Measured WCAG contrast: primary text/page **15.61:1**; muted/page **7.54:1**; muted/raised surface **6.10:1**; primary button text/gold **10.26:1**. The lightest dot-grid pixel was computed as `#26262b`, against which muted text is **6.56:1**. The complete coverage and limits are in `docs/validation.md`.

The export renderer has a separate, artwork-driven palette. `inspectSvg` in `src/render.ts` reads real fill/color/stroke values; `inkFor` calculates luminance and chooses black or white text. A transparent export’s eventual background is unknown, so contrast against the place it is pasted cannot be guaranteed.

## Typography

Two locally bundled Google Fonts supply the interface. `src/fonts/dm-sans.woff2` is the variable DM Sans face for body text and controls; `src/fonts/space-grotesk.woff2` is variable Space Grotesk for headings, the wordmark and large numbers. Both are declared for weights 400–700, while the interface uses only **400, 500 and 700**. Fallbacks are Arial and sans-serif. SIL Open Font License texts are shipped in `public/licenses/` and copied into the export.

| Token | Wide-screen value | Use |
| --- | --- | --- |
| `--text-small` | 14px | Labels, metadata, supporting text |
| `--text-body` | 16px | Body, inputs and card headings |
| `--text-lead` | 20px | Small headings and wordmark |
| `--text-section` | 28px | Section headings and statistics |
| `--text-title` | 40px | Detail/wallet page title |
| `--text-display` | 64px | Home headline |

At 900px and below the display size becomes 48px; at 370px and below it becomes 40px. Detail/wallet titles become 32px at 700px and below. The measured home page uses five sizes per tested width. Input text remains at 16px. Body line-height is 1.5; descriptions use 1.7; short headings use 1.07–1.3. Display headings use tight tracking down to `-.055em`, ordinary headings `-.025em` to `-.045em`, and body text natural spacing. Headings balance their wraps; paragraphs use pretty wrapping. Numeric outputs use tabular figures.

Canvas exports intentionally use the browser’s Arial/sans-serif stack, sized in target pixels, with fitted captions. Export dimensions do not depend on font downloads or viewport size. No interface text is converted into an image, apart from the requested PNG composition and the social graphic.

## Layout

The page and footer cap at **1224px**; the header caps at **1320px**. Wide screens use shared alignment edges and 40–48px outer space, dropping to 28px below 900px, 20px below 700px and 16px below 370px. An 8px base step is declared; actual groups use 8–12px internal gaps, 16–26px component gaps, and 36–68px section spacing. Native form and text content determine height.

The home hero is a two-column composition until 700px, then stacks the lookup before the art. The 390px first screen shows the name, public-address connection button, product description and lookup action. At 370px the input and submit button stack for a usable target width. Three sample cards remain visible as a compact row; export links collapse from three to two columns. The explanatory section becomes one column below 700px.

Detail art and metadata share two columns above 700px. Art becomes a full-width square on phones. Trait columns adapt from three to two at intermediate widths, return to three in the wider phone stack, and use two below 370px. Owner addresses have an explicit abbreviated link with the full address in the accessible name and destination. Wallet-page addresses wrap in full.

The editor uses a flexible preview and a 330px control column, reducing the control width at intermediate breakpoints. At 700px it stacks preview before controls. Format controls use six columns above 1100px, three below that and two below 700px. Group formats have two choices. The preview’s CSS size changes while its canvas retains the exact export resolution.

Wallet grids use four, three and two columns across wide, intermediate and phone layouts. Group selection controls stay in normal flow. No action bar is fixed over the content. Browser reflow was checked at 320, 390, 700, 900 and 1440px; native 200% browser zoom, RTL and translated interfaces were not separately verified.

## Elevation & Depth

The interface is flat: tonal surfaces and structural borders separate controls, with no card shadows or gradient text. Original art gets a low-opacity white outline. The home examples overlap and rotate to communicate separate exported objects. Dot-grid orbits stay behind the artwork and do not intercept input.

The native wallet dialog is the only modal surface. It uses the browser’s top layer and inert background, with a translucent backdrop and 5px blur. On phones it sits near the bottom of the viewport; on desktop it is centred. It has a maximum viewport-relative height and can scroll.

## Shapes

The implemented radius tokens are **8px** for controls, **14px** for cards and preview panels, and **22px** for larger compositions and the dialog. Profile examples, palette swatches and selection buttons use circles. Rounded art/export cropping is performed by canvas clipping, so the PNG itself has transparent corners. The checkerboard is an editor transparency cue and never enters the exported PNG.

## Components

- **Buttons** (`src/styles.css`, `.button`, `.primary`, `.small`, `.icon-button`, `.text-button`): one gold primary action per task surface, neutral secondary actions, explicit disabled states. All have native keyboard activation. Focus uses a 2px light blue outline; the search field applies that outline to its containing input shape.
- **Lookup** (`src/App.tsx`, `Lookup`): a visible label, one address/number field and Open Studio. Invalid submissions focus the input and attach a specific error with `aria-describedby` and `aria-invalid`. Enter submits. The helper line states that the tool is free and read-only.
- **Sample cards and lazy wallet cards** (`src/App.tsx`, `Home`, `LazyTokenCard`): ordinary links preserve browser navigation conventions. Card dimensions reserve the art space before loading. Wallet art starts near the viewport; errors retain a Retry art button. Selection has its own button and check state, separate from navigation. Vault custody has a text tag.
- **Detail data** (`SqueekPage`): a square original SVG, level/power statistics, explorer owner link and a semantic description list for the 11 traits. RPC fallback is labelled; absent fields remain unavailable.
- **Preset controls and editor** (`src/Studio.tsx`, `Studio`): pressed buttons name the format and exact dimensions. A labelled preview canvas, fieldset of background choices, palette swatches, native ranges and checkboxes form the editing flow. Reset restores defaults. The download is disabled until the current full-resolution render is ready, preventing stale exports. Export status messages use a polite live region.
- **Wallet connection** (`src/WalletConnect.tsx`): native `<dialog>` with a heading and close button, Escape/backdrop dismissal, browser focus management and restoration. Named EIP-6963 providers are listed ahead of the legacy fallback. Only `eth_requestAccounts` is requested; rejected connections have a retryable message. Mobile browser links and address lookup are available when no provider is present.
- **Empty and error states** (`ErrorState`, wallet empty view): plain explanations and a concrete next action; no fake balances, art or ownership. Successful session responses are cached, while failed requests remain retryable.
- **Icons** (`src/icons.tsx`): one inline SVG set with a consistent 1.7px current-color stroke, hidden from assistive technology when decorative. The brand mark is made of dots. Icon-only controls have accessible names.

Motion is limited to named color/border transitions and a 150ms press scale of 0.96 under `prefers-reduced-motion: no-preference`. There is no autoplay, endless animation or `transition: all`. Reduced-motion users also get immediate studio scrolling. Forced-color rules retain system focus and selected outlines.

## Do’s and Don’ts

Start an additional view inside the existing `.page` shell, with one heading, the shared footer, normal links and existing button variants. Keep the main operation close to its inputs. Reuse the established colors, six text roles and spacing; reserve gold fill for the main task action. Add an error/retry path whenever adding a public read. Continue using the shared request limiter and canvas renderer.

Do not add remote image assets, telemetry, wallet signing, chain writes, custom font families, a second modal system or decorative loading animation. Keep critical metadata selectable and readable, never clipped to make the layout fit. Treat the home art collage as one illustration, not a pattern for nesting cards throughout the tool. Preserve relative assets, hash routes and the tracked static export.

Design knowledge was adapted from Jakub Krehel’s Better Interface at `267330e1adfc66a718fb65fa6918c1f06d0a689e` (MIT). This documentation follows Paul Bakaus’s Impeccable document method at `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8` (Apache-2.0). Notices and licenses are retained in `docs/DESIGN-LICENSES.txt`.
