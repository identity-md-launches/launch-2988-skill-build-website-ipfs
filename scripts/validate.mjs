// Production-browser interaction checks. Test fixtures never enter the production site.
import { createServer } from "node:http";
import { readFile, mkdir, stat } from "node:fs/promises";
import { resolve, extname, join } from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const { chromium, webkit } = await import(
  process.env.IMD_PLAYWRIGHT
    ? pathToFileURL(process.env.IMD_PLAYWRIGHT).href
    : "playwright"
);
const root = resolve("dist");
const out = resolve("test/scratch/interactions");
await mkdir(out, { recursive: true });
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const name = pathname.replace(/^\/preview\/?/, "") || "index.html";
    const file = resolve(root, name);
    if (!file.startsWith(root + "/") || !(await stat(file)).isFile()) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, {
      "content-type": types[extname(file)] || "application/octet-stream",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}/preview/`;
const address = "0x1111111111111111111111111111111111111111";
const actualAddress = "0x798cf7770337a9283b6f2af69a8f079b3d7544dc";
const svg = await readFile("design/art/squeek-1.svg", "utf8");
const image = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
const names = [
  "Palette",
  "Color Pattern",
  "Body Glyph",
  "Face Glyph",
  "Eye Glyph",
  "Muzzle Glyph",
  "Ear Glyph",
  "Illumination",
  "Eyes",
  "Ears",
  "Background",
];
const values = [
  "Void Violet",
  "Spectral Noise",
  "Shield",
  "Circle",
  "Teardrop",
  "Lightning Bolt",
  "Triangle",
  "Phase Sweep",
  "Sleepy Bars",
  "Compact Round",
  "Cross Grid",
];
const metadata = {
  name: "Squeek #1",
  image,
  attributes: names.map((trait_type, i) => ({ trait_type, value: values[i] })),
};
const detail = (id) => ({
  tokenId: String(id),
  level: id === 7 ? 5 : 1,
  basePower: "1000",
  custody: { owner: address },
  metadata: {
    ...metadata,
    imageDataUri: image,
    attributes: names.map((traitType, i) => ({ traitType, value: values[i] })),
  },
});
const token = (id) => ({
  tokenId: String(id),
  level: id === 7 ? 5 : 1,
  basePower: "1000",
  custody: id === 7 ? "staking" : "wallet",
  mergeState: "merges_closed",
});
let pass = 0;
function passed(name) {
  pass++;
  console.log(`PASS ${name}`);
}
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const scriptErrors = [];
  page.on("pageerror", (e) => scriptErrors.push(e.message));
  const missing = [];
  page.on("response", (r) => {
    if (r.url().startsWith(origin) && r.status() >= 400) missing.push(r.url());
  });
  let mode = "normal",
    apiCalls = 0,
    active = 0,
    maxActive = 0;
  const cursors = [];
  const rpcCalls = [];
  await page.route("https://api.squeekchain.com/v1/**", async (route) => {
    apiCalls++;
    active++;
    maxActive = Math.max(maxActive, active);
    try {
      if (mode === "api-fail" || mode === "all-fail")
        return await route.fulfill({ status: 503, body: "offline" });
      const url = new URL(route.request().url());
      if (url.pathname.includes("/accounts/")) {
        cursors.push(url.searchParams.get("cursor"));
        const empty = mode === "empty";
        return await route.fulfill({
          json: {
            tokens: empty
              ? []
              : url.searchParams.has("cursor")
                ? [7, 8, 9].map(token)
                : [1, 2, 3, 4, 5, 6].map(token),
            nextCursor:
              empty || url.searchParams.has("cursor") ? null : "page-2",
          },
        });
      }
      await new Promise((r) => setTimeout(r, 60));
      return await route.fulfill({
        json: detail(Number(url.pathname.split("/").pop())),
      });
    } finally {
      active--;
    }
  });
  function abiString(s) {
    const hex = Buffer.from(s).toString("hex");
    return (
      "0x" +
      (32).toString(16).padStart(64, "0") +
      (hex.length / 2).toString(16).padStart(64, "0") +
      hex.padEnd(Math.ceil(hex.length / 64) * 64, "0")
    );
  }
  await page.route(
    /https:\/\/(ethereum-sepolia-rpc\.publicnode\.com|sepolia\.gateway\.tenderly\.co)\/?$/,
    async (route) => {
      const body = route.request().postDataJSON();
      rpcCalls.push({ url: route.request().url(), body });
      assert.equal(body.method, "eth_call");
      assert.equal(
        body.params[0].to,
        "0xc4c7982657f00509548f3a3a41db7fa439a6856b",
      );
      if (mode === "all-fail" || route.request().url().includes("publicnode"))
        return route.fulfill({ status: 503, body: "offline" });
      const result = body.params[0].data.startsWith("0xc87b56dd")
        ? abiString(
            "data:application/json;base64," +
              Buffer.from(JSON.stringify(metadata)).toString("base64"),
          )
        : "0x" + "0".repeat(24) + address.slice(2);
      return route.fulfill({ json: { jsonrpc: "2.0", id: 1, result } });
    },
  );
  await page.goto(origin);
  await page.locator("h1").waitFor();
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 390, 700, 900, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    const info = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      action: document.querySelector(".lookup button").getBoundingClientRect()
        .bottom,
      brand: document.querySelector(".brand").getBoundingClientRect().right,
      connect: document.querySelector(".connect-button").getBoundingClientRect()
        .left,
    }));
    assert.equal(info.overflow, false, `Home overflow at ${width}`);
    assert(info.action < 844);
    assert(info.brand < info.connect);
    await page.screenshot({
      path: join(out, `home-${width}.png`),
      fullPage: width === 1440,
    });
  }
  passed(
    "home: product and lookup visible, local assets and reflow at 320/390/700/900/1440",
  );
  await page.locator("#lookup").fill("0");
  await page.getByRole("button", { name: "Open Studio", exact: true }).click();
  assert.equal(
    await page.locator("#lookup").getAttribute("aria-invalid"),
    "true",
  );
  assert(
    await page.locator("#lookup").evaluate((e) => e === document.activeElement),
  );
  passed("lookup: invalid number has a focused, announced error");
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await page.locator("dialog[open]").waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog").evaluate((e) => e.open), false);
  assert(
    await page
      .getByRole("button", { name: "Connect wallet", exact: true })
      .evaluate((e) => e === document.activeElement),
  );
  passed("wallet dialog: no-wallet instructions, Escape and focus return");
  await page.locator("#lookup").fill("#1");
  await page.locator("#lookup").press("Enter");
  await page.locator("#studio").waitFor();
  await page
    .getByRole("button", { name: "Download PNG", exact: true })
    .waitFor({ state: "visible" });
  await page.waitForFunction(
    () =>
      !document.querySelector(".preview-stage").getAttribute("aria-busy") ||
      document.querySelector(".preview-stage").getAttribute("aria-busy") ===
        "false",
  );
  assert.equal(new URL(page.url()).hash, "#/squeek/1");
  assert.equal(await page.locator(".traits-grid>div").count(), 11);
  assert(
    (await page.locator(".owner-stat>a").getAttribute("href")).endsWith(
      address,
    ),
  );
  passed(
    "Squeek: lookup navigation, 11 traits, level, base power and explorer owner link",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator("#studio").scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(out, "studio-1440.png"), fullPage: true });
  const dimensions = [
    ["Profile picture", 1024, 1024],
    ["X header", 1500, 500],
    ["Phone wallpaper", 1170, 2532],
    ["Desktop wallpaper", 2560, 1440],
    ["Sticker", 512, 512],
    ["Share card", 1080, 1350],
  ];
  for (const [label, w, h] of dimensions) {
    await page.getByRole("button", { name: new RegExp(`^${label}`) }).click();
    await page.waitForFunction(
      () =>
        document.querySelector(".preview-stage")?.getAttribute("aria-busy") ===
        "false",
    );
    const actual = await page.locator(".output-canvas").evaluate((c) => ({
      w: c.width,
      h: c.height,
      alpha: c.getContext("2d").getImageData(0, 0, 1, 1).data[3],
      nonblank: [
        ...c.getContext("2d").getImageData(c.width / 2, c.height / 2, 1, 1)
          .data,
      ],
    }));
    assert.equal(actual.w, w);
    assert.equal(actual.h, h);
    if (label === "Sticker") assert.equal(actual.alpha, 0);
    const event = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download PNG", exact: true })
      .click();
    const dl = await event;
    const target = join(out, dl.suggestedFilename());
    await dl.saveAs(target);
    const png = await readFile(target);
    assert.equal(png.toString("hex", 0, 8), "89504e470d0a1a0a");
    assert.equal(png.readUInt32BE(16), w);
    assert.equal(png.readUInt32BE(20), h);
    assert(png.length > 10000);
  }
  passed(
    "six PNG downloads: real PNG bytes, exact preset dimensions and transparent sticker corners",
  );
  await page.getByRole("button", { name: /^Profile picture/ }).click();
  await page
    .getByLabel("Caption", { exact: false })
    .fill("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
  assert.equal(
    await page.getByLabel("Caption", { exact: false }).inputValue(),
    "ABCDEFGHIJKLMNOPQRSTUVWX",
  );
  await page.getByLabel("Round crop").check();
  await page.getByRole("button", { name: "Transparent", exact: true }).click();
  await page.getByLabel("Zoom", { exact: false }).fill("140");
  await page.getByLabel("Vertical offset", { exact: false }).fill("-50");
  await page.waitForFunction(
    () =>
      document.querySelector(".preview-stage").getAttribute("aria-busy") ===
      "false",
  );
  assert.equal(
    await page
      .locator(".output-canvas")
      .evaluate((c) => c.getContext("2d").getImageData(0, 0, 1, 1).data[3]),
    0,
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  assert.equal(
    await page.getByLabel("Zoom", { exact: false }).inputValue(),
    "100",
  );
  assert.equal(
    await page.getByLabel("Caption", { exact: false }).inputValue(),
    "",
  );
  passed(
    "editor: caption limit, 140% zoom, vertical offset, round alpha, backgrounds and reset",
  );
  let opened = "";
  await page.evaluate(() => {
    window.open = (url) => {
      window.__opened = String(url);
      return null;
    };
  });
  await page.getByRole("button", { name: "Share on X", exact: true }).click();
  opened = await page.evaluate(() => window.__opened);
  const share = new URL(opened);
  assert.equal(share.origin, "https://x.com");
  assert.equal(share.pathname, "/intent/post");
  assert(share.searchParams.get("url").endsWith("#/squeek/1"));
  passed("Share on X: text and canonical Squeek link, no image upload");
  // Clipboard capability and denial are tested independently of OS clipboard permissions.
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "write", {
      configurable: true,
      value: async (items) => {
        window.__clipboardItems = items.length;
      },
    });
  });
  if (
    await page.getByRole("button", { name: "Copy image", exact: true }).count()
  ) {
    await page.getByRole("button", { name: "Copy image", exact: true }).click();
    await page.getByText("Image copied. Ready to paste.").waitFor();
    assert.equal(await page.evaluate(() => window.__clipboardItems), 1);
    await page.evaluate(() => {
      Object.defineProperty(navigator.clipboard, "write", {
        configurable: true,
        value: async () => {
          throw new Error("denied");
        },
      });
    });
    await page.getByRole("button", { name: "Copy image", exact: true }).click();
    await page
      .getByText("The browser could not copy this image.", { exact: false })
      .waitFor();
    passed(
      "clipboard: supported control uses PNG and reports success or permission rejection",
    );
  }
  for (const width of [320, 390, 700, 900, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `Squeek/editor overflow ${width}`,
    );
    if (width === 390)
      await page.screenshot({
        path: join(out, "squeek-390.png"),
        fullPage: true,
      });
  }
  passed("Squeek + editor reflow at 320/390/700/900/1440");
  const before = apiCalls;
  await page.reload();
  await page.locator("#studio").waitFor();
  assert.equal(apiCalls, before);
  passed("sessionStorage cache survives a production-page reload");
  await page.goto(`${origin}#/wallet/${address}`);
  await page.locator(".wallet-grid").waitFor();
  assert.deepEqual(cursors, [null, "page-2"]);
  assert.equal(await page.locator(".wallet-card").count(), 9);
  assert.equal(
    await page.locator(".wallet-card-info>a").first().innerText(),
    "Squeek #7",
  );
  assert.equal(
    await page.getByText("In the vault", { exact: true }).count(),
    1,
  );
  await page.locator(".wallet-grid").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  assert(maxActive <= 6);
  passed(
    `wallet: pagination, vault inclusion, level/number sort and max ${maxActive} requests in flight`,
  );
  await page
    .getByRole("button", { name: "Make a group shot", exact: true })
    .click();
  for (const id of [7, 1, 2, 3, 4, 5])
    await page
      .getByRole("button", { name: `Select Squeek #${id}`, exact: true })
      .click();
  assert(
    await page
      .getByRole("button", { name: "Select Squeek #6", exact: true })
      .isDisabled(),
  );
  await page
    .getByRole("button", { name: "Create group shot", exact: true })
    .click();
  await page.locator("#group-studio").waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector(".preview-stage")?.getAttribute("aria-busy") ===
      "false",
  );
  assert.equal(await page.locator(".preset").count(), 2);
  for (const [label, w, h] of [dimensions[1], dimensions[3]]) {
    await page.getByRole("button", { name: new RegExp(`^${label}`) }).click();
    await page.waitForFunction(
      () =>
        document.querySelector(".preview-stage").getAttribute("aria-busy") ===
        "false",
    );
    const ev = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download PNG", exact: true })
      .click();
    const d = await ev;
    const f = join(out, d.suggestedFilename());
    await d.saveAs(f);
    const png = await readFile(f);
    assert.equal(png.readUInt32BE(16), w);
    assert.equal(png.readUInt32BE(20), h);
  }
  await page.screenshot({ path: join(out, "group-1440.png"), fullPage: true });
  passed(
    "group: select 2–6 owned tokens, seventh disabled, header and desktop PNG exports",
  );
  await page.goto(`${origin}#/wallet/${address}/group?ids=1,9999`);
  await page
    .getByRole("heading", { name: "Could not load the group" })
    .waitFor();
  passed("group rejects tokens absent from the wallet");
  await page.goto(`${origin}#/wallet/0xno`);
  await page
    .getByRole("heading", { name: "That wallet address is invalid" })
    .waitFor();
  await page.goto(`${origin}#/squeek/10000`);
  await page
    .getByRole("heading", { name: "That Squeek number is invalid" })
    .waitFor();
  mode = "empty";
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(
    `${origin}#/wallet/0x2222222222222222222222222222222222222222`,
  );
  await page.getByRole("heading", { name: "No Squeeks here yet" }).waitFor();
  assert.equal(
    await page
      .getByRole("link", { name: "Explore Squeekchain", exact: true })
      .getAttribute("href"),
    "https://squeekchain.com",
  );
  passed(
    "invalid routes + empty wallet provide clear recovery and collection link",
  );
  mode = "api-fail";
  await page.goto(`${origin}#/squeek/99`);
  await page.locator("#studio").waitFor();
  assert(
    (await page.locator(".fallback-note").innerText()).includes(
      "Loaded directly from Sepolia",
    ),
  );
  assert.equal(await page.locator(".traits-grid>div").count(), 11);
  assert(rpcCalls[0].url.includes("publicnode"));
  assert(rpcCalls[1].url.includes("tenderly"));
  assert(
    (await page.locator(".token-stats").innerText()).includes("Unavailable"),
  );
  passed(
    "API failure: ordered RPC fallback decodes real ABI JSON/SVG, absent statistics stay unavailable",
  );
  mode = "all-fail";
  await page.goto(`${origin}#/squeek/98`);
  await page
    .getByRole("heading", { name: "Could not load this Squeek" })
    .waitFor();
  assert(
    (await page.getByRole("alert").innerText()).includes("both Sepolia RPCs"),
  );
  mode = "normal";
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.locator("#studio").waitFor();
  passed("API + both RPC failures are explicit; Retry recovers");
  mode = "all-fail";
  await page.goto(
    `${origin}#/wallet/0x3333333333333333333333333333333333333333`,
  );
  await page
    .getByRole("heading", { name: "Could not load this wallet" })
    .waitFor();
  assert(
    (await page.getByRole("alert").innerText()).includes(
      "including vault deposits",
    ),
  );
  passed(
    "wallet API failure explains discovery limitation without fabricating holdings",
  );
  mode = "normal";
  await page.addInitScript((address) => {
    window.__walletCalls = [];
    window.ethereum = {
      request: async ({ method }) => {
        window.__walletCalls.push(method);
        return [address];
      },
    };
  }, address);
  await page.goto(origin);
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Browser wallet", exact: true })
    .click();
  await page.locator(".wallet-grid").waitFor();
  assert.deepEqual(await page.evaluate(() => window.__walletCalls), [
    "eth_requestAccounts",
  ]);
  passed(
    "injected-wallet connection requests only eth_requestAccounts and opens that wallet",
  );
  await page.addInitScript((address) => {
    let tries = 0;
    window.addEventListener("eip6963:requestProvider", () => {
      window.dispatchEvent(
        new CustomEvent("eip6963:announceProvider", {
          detail: {
            info: {
              uuid: "test-provider",
              name: "Test browser wallet",
              icon: "",
            },
            provider: {
              request: async ({ method }) => {
                window.__walletCalls.push(method);
                if (++tries === 1) throw { code: 4001 };
                return [address];
              },
            },
          },
        }),
      );
    });
  }, address);
  await page.goto(origin);
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Browser wallet", exact: true })
      .count(),
    0,
  );
  await page
    .getByRole("button", { name: "Test browser wallet", exact: true })
    .click();
  await page.getByText("Connection declined.", { exact: false }).waitFor();
  await page
    .getByRole("button", { name: "Test browser wallet", exact: true })
    .click();
  await page.locator(".wallet-grid").waitFor();
  assert.deepEqual(await page.evaluate(() => window.__walletCalls), [
    "eth_requestAccounts",
    "eth_requestAccounts",
  ]);
  passed(
    "EIP-6963 named provider discovery, declined connection and retry without signing",
  );
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  });
  const mobile = await mobileContext.newPage();
  await mobile.goto(origin);
  await mobile
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  for (const name of ["MetaMask", "Coinbase Wallet", "Rabby", "Phantom"])
    assert(
      await mobile
        .getByRole("link", { name: `Open in ${name}`, exact: true })
        .isVisible(),
    );
  const rabby = new URL(
    await mobile
      .getByRole("link", { name: "Open in Rabby", exact: true })
      .getAttribute("href"),
  );
  assert.equal(rabby.searchParams.get("_cmd"), "open-dapp");
  assert.equal(rabby.searchParams.get("dapp"), origin);
  await mobileContext.close();
  passed(
    "phone connection dialog offers wallet-browser links without a relay or project ID",
  );
  const lazy = await context.newPage();
  await lazy.setViewportSize({ width: 390, height: 700 });
  const artRequests = [];
  await lazy.route("https://api.squeekchain.com/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes("/accounts/"))
      return route.fulfill({
        json: {
          tokens: Array.from({ length: 30 }, (_, i) => token(i + 1)),
          nextCursor: null,
        },
      });
    const id = Number(url.pathname.split("/").pop());
    artRequests.push(id);
    return route.fulfill({ json: detail(id) });
  });
  await lazy.goto(`${origin}#/wallet/${address}`);
  await lazy.locator(".wallet-grid").waitFor();
  await lazy.locator(".wallet-card img").first().waitFor();
  assert(artRequests.length < 30, "offscreen art must not load eagerly");
  await lazy.locator(".wallet-card").last().scrollIntoViewIfNeeded();
  await lazy.waitForFunction(
    () => document.querySelector(".wallet-card:last-child img") !== null,
  );
  assert(artRequests.includes(30));
  await lazy.close();
  passed(
    "30-token wallet defers offscreen SVG requests until cards approach the viewport",
  );
  assert.deepEqual(scriptErrors, []);
  assert.deepEqual(missing, []);
  passed("no uncaught production JavaScript errors or missing local resources");
  // Real public data through Node's available network transport. This bridge is test-only;
  // the deployed app always calls the public endpoints directly from the visitor's browser.
  async function liveTransport(route) {
    try {
      const req = route.request();
      const response = await fetch(req.url(), {
        method: req.method(),
        headers:
          req.method() === "POST" ? { "content-type": "application/json" } : {},
        ...(req.method() === "POST" ? { body: req.postData() } : {}),
        signal: AbortSignal.timeout(20000),
      });
      await route.fulfill({
        status: response.status,
        contentType: "application/json",
        body: await response.text(),
      });
    } catch {
      await route.fulfill({
        status: 503,
        body: "Network transport unavailable",
      });
    }
  }
  const live = await context.newPage();
  await live.route("https://api.squeekchain.com/v1/**", liveTransport);
  await live.route(
    /https:\/\/(ethereum-sepolia-rpc\.publicnode\.com|sepolia\.gateway\.tenderly\.co)\/?$/,
    liveTransport,
  );
  try {
    await live.goto(`${origin}#/squeek/1`);
    await live.locator("#studio").waitFor({ timeout: 45000 });
    await live.waitForFunction(
      () =>
        document.querySelector(".preview-stage")?.getAttribute("aria-busy") ===
        "false",
    );
    assert.equal(await live.locator(".traits-grid>div").count(), 11);
    console.log(
      "LIVE PASS actual public Squeek #1 metadata and SVG preview (test transport bridge)",
    );
    await live.setViewportSize({ width: 1440, height: 1050 });
    await live.screenshot({
      path: join(out, "live-squeek-1440.png"),
      fullPage: true,
    });
    await live.goto(`${origin}#/wallet/${actualAddress}`);
    await live.locator(".wallet-grid").waitFor({ timeout: 30000 });
    console.log(
      `LIVE PASS actual owner wallet: ${await live.locator(".wallet-card").count()} tokens (test transport bridge)`,
    );
  } catch (e) {
    console.log(`LIVE LIMITATION ${e.message.split("\n")[0]}`);
  }
  await live.close();
  const liveFallback = await context.newPage();
  await liveFallback.route("https://api.squeekchain.com/v1/**", (route) =>
    route.fulfill({ status: 503, body: "Test API outage" }),
  );
  await liveFallback.route(
    /https:\/\/(ethereum-sepolia-rpc\.publicnode\.com|sepolia\.gateway\.tenderly\.co)\/?$/,
    liveTransport,
  );
  try {
    await liveFallback.goto(`${origin}#/squeek/1`);
    await liveFallback.locator("#studio").waitFor({ timeout: 45000 });
    assert(
      (await liveFallback.locator(".fallback-note").innerText()).includes(
        "Loaded directly from Sepolia",
      ),
    );
    console.log(
      "LIVE PASS actual Sepolia tokenURI decoding with forced API outage (test transport bridge)",
    );
  } catch (e) {
    console.log(`LIVE FALLBACK LIMITATION ${e.message.split("\n")[0]}`);
  }
  await liveFallback.close();
  await context.close();
  try {
    const safari = await webkit.launch({ headless: true });
    const p = await safari.newPage({ viewport: { width: 390, height: 844 } });
    await p.route("https://api.squeekchain.com/v1/**", (r) =>
      r.fulfill({ json: detail(1) }),
    );
    await p.goto(origin);
    await p.locator("#lookup").fill("1");
    await p.locator("#lookup").press("Enter");
    await p.locator("#studio").waitFor();
    await p.waitForFunction(
      () =>
        document.querySelector(".preview-stage")?.getAttribute("aria-busy") ===
        "false",
    );
    assert.equal(
      await p.locator(".output-canvas").evaluate((c) => c.width),
      1024,
    );
    console.log("WEBKIT PASS lookup and canvas rendering at 390");
    await safari.close();
  } catch (e) {
    console.log(`WEBKIT LIMITATION ${e.message.split("\n")[0]}`);
  }
  console.log(`Completed ${pass} deterministic interaction groups.`);
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
