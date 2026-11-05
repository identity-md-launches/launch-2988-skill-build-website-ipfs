import { decodeDataUri, powerLabel, type Squeek } from "./data";
import type { IconName } from "./icons";
export type PresetKey =
  "profile" | "header" | "phone" | "desktop" | "sticker" | "share";
export type Preset = {
  key: PresetKey;
  name: string;
  width: number;
  height: number;
  icon: IconName;
  note: string;
};
export const PRESETS: Preset[] = [
  {
    key: "profile",
    name: "Profile picture",
    width: 1024,
    height: 1024,
    icon: "image",
    note: "A new face for your feed",
  },
  {
    key: "header",
    name: "X header",
    width: 1500,
    height: 500,
    icon: "banner",
    note: "A little more room to Squeek",
  },
  {
    key: "phone",
    name: "Phone wallpaper",
    width: 1170,
    height: 2532,
    icon: "phone",
    note: "Your daily pocket companion",
  },
  {
    key: "desktop",
    name: "Desktop wallpaper",
    width: 2560,
    height: 1440,
    icon: "desktop",
    note: "Make yourself at home",
  },
  {
    key: "sticker",
    name: "Sticker",
    width: 512,
    height: 512,
    icon: "sticker",
    note: "Round, with transparent corners",
  },
  {
    key: "share",
    name: "Share card",
    width: 1080,
    height: 1350,
    icon: "card",
    note: "Every trait, all in one place",
  },
];
export type Options = {
  background: string;
  zoom: number;
  offset: number;
  caption: string;
  badge: boolean;
  round: boolean;
  side: "left" | "right";
};
export const DEFAULT_OPTIONS: Options = {
  background: "own",
  zoom: 100,
  offset: 0,
  caption: "",
  badge: true,
  round: false,
  side: "left",
};
const svgCache = new Map<
  string,
  { source: string; background: string; colors: string[] }
>();
export function inspectSvg(uri: string) {
  const cached = svgCache.get(uri);
  if (cached) return cached;
  const source = decodeDataUri(uri, "image/svg+xml");
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  if (
    doc.querySelector("parsererror") ||
    doc.documentElement.localName !== "svg"
  )
    throw new Error("The art is not a valid SVG.");
  const svg = doc.documentElement;
  // Keep renderer geometry and local definitions; remove any executable or remote content.
  for (const element of Array.from(
    svg.querySelectorAll(
      "script,foreignObject,iframe,object,embed,style,animate,animateTransform,animateMotion,set",
    ),
  ))
    element.remove();
  for (const element of [svg, ...Array.from(svg.querySelectorAll("*"))]) {
    for (const attr of Array.from(element.attributes)) {
      if (
        /^on/i.test(attr.name) ||
        (/href$/i.test(attr.name) && !attr.value.startsWith("#")) ||
        /url\(\s*['"]?(?!#)/i.test(attr.value)
      )
        element.removeAttribute(attr.name);
    }
  }
  const rect = Array.from(svg.children).find(
    (el) =>
      el.localName === "rect" && !el.hasAttribute("x") && !el.hasAttribute("y"),
  );
  const background =
    rect?.getAttribute("fill")?.match(/^#[0-9a-fA-F]{6}$/)?.[0] ?? "#08080A";
  const colors = new Set<string>();
  for (const el of svg.querySelectorAll("[fill],[color],[stroke]"))
    for (const name of ["fill", "color", "stroke"]) {
      const value = el.getAttribute(name);
      if (value && /^#[0-9a-fA-F]{6}$/.test(value))
        colors.add(value.toUpperCase());
    }
  const result = {
    source: new XMLSerializer().serializeToString(svg),
    background,
    colors: [...colors]
      .filter(
        (c) => !["#000000", "#FFFFFF", background.toUpperCase()].includes(c),
      )
      .slice(0, 7),
  };
  svgCache.set(uri, result);
  return result;
}
function resolveBackground(token: Squeek, options: Options) {
  return options.background === "own"
    ? inspectSvg(token.image).background
    : options.background === "black"
      ? "#000000"
      : options.background === "white"
        ? "#FFFFFF"
        : options.background === "transparent"
          ? null
          : options.background;
}
function inkFor(background: string | null) {
  if (!background) return "#FFFFFF";
  const h = background.replace("#", "");
  const rgb = [0, 2, 4]
    .map((n) => parseInt(h.slice(n, n + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] > 0.179
    ? "#000000"
    : "#FFFFFF";
}
async function svgImage(
  token: Squeek,
  size: number,
  own: boolean,
): Promise<{ image: HTMLImageElement; release: () => void }> {
  const info = inspectSvg(token.image);
  const doc = new DOMParser().parseFromString(info.source, "image/svg+xml");
  const svg = doc.documentElement;
  if (!own)
    for (const child of Array.from(svg.children))
      if (
        child.localName === "rect" &&
        !child.hasAttribute("x") &&
        !child.hasAttribute("y")
      )
        child.remove();
  // The browser rasterizes this vector at the actual export size, not a thumbnail's resolution.
  svg.setAttribute("width", String(Math.ceil(size)));
  svg.setAttribute("height", String(Math.ceil(size)));
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml;charset=utf-8",
    }),
  );
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error(
      "This browser could not render the onchain SVG. Please retry.",
    );
  }
  return { image, release: () => URL.revokeObjectURL(url) };
}
function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight = 600,
  align: CanvasTextAlign = "left",
) {
  ctx.font = `${weight} ${size}px Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(value, x, y);
}
function fitText(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  maxWidth: number,
  color: string,
  align: CanvasTextAlign = "left",
) {
  const chars = Array.from(value);
  let current = size;
  ctx.font = `600 ${current}px Arial, sans-serif`;
  while (ctx.measureText(chars.join("")).width > maxWidth && current > 18) {
    current -= 2;
    ctx.font = `600 ${current}px Arial, sans-serif`;
  }
  text(ctx, value, x, y, current, color, 600, align);
}
function badge(
  ctx: CanvasRenderingContext2D,
  token: Squeek,
  x: number,
  y: number,
  scale = 1,
) {
  if (token.level === null) return;
  ctx.fillStyle = "#232329";
  ctx.beginPath();
  ctx.roundRect(x, y, 142 * scale, 48 * scale, 24 * scale);
  ctx.fill();
  text(
    ctx,
    `Level ${token.level}`,
    x + 71 * scale,
    y + 32 * scale,
    24 * scale,
    "#F1C86A",
    600,
    "center",
  );
}
function dots(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  ink: string,
) {
  ctx.save();
  ctx.fillStyle = ink;
  ctx.globalAlpha = 0.1;
  const step = Math.max(20, Math.min(w, h) / 20);
  for (let y = step / 2; y < h; y += step)
    for (let x = step / 2; x < w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, step * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
  ctx.restore();
}
async function art(
  ctx: CanvasRenderingContext2D,
  token: Squeek,
  x: number,
  y: number,
  size: number,
  options: Options,
  circle = false,
) {
  const s = (size * options.zoom) / 100;
  const image = await svgImage(token, s, options.background === "own");
  ctx.save();
  // Art stays within its own viewport, so captions and trait labels remain legible at 140% zoom.
  ctx.beginPath();
  if (circle) ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  else ctx.rect(x, y, size, size);
  ctx.clip();
  ctx.drawImage(
    image.image,
    x + (size - s) / 2,
    y + (size - s) / 2 + (options.offset / 100) * size * 0.4,
    s,
    s,
  );
  ctx.restore();
  image.release();
}
export async function render(
  canvas: HTMLCanvasElement,
  tokens: Squeek[],
  preset: Preset,
  options: Options,
): Promise<void> {
  if (!tokens.length) throw new Error("Choose at least one Squeek.");
  const { width: w, height: h, key } = preset;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  const token = tokens[0];
  const bg = resolveBackground(token, options);
  const ink = inkFor(bg);
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  const round = key === "sticker" || (key === "profile" && options.round);
  if (round) {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
    ctx.clip();
  }
  if (bg) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }
  if (["header", "phone", "desktop"].includes(key) && bg) dots(ctx, w, h, ink);
  if (tokens.length > 1) {
    const pad = w * 0.045;
    const usable = w - pad * 2;
    const size = Math.min(
      (usable / tokens.length) * 0.96,
      h * (options.caption ? 0.7 : 0.86),
    );
    const gap =
      (usable - size * tokens.length) / Math.max(1, tokens.length - 1);
    const y = (h - size) / 2 - (options.caption ? h * 0.06 : 0);
    await Promise.all(
      tokens.map(async (t, i) => {
        // Decode in parallel; compose in deterministic token order below.
        const cell = document.createElement("canvas");
        cell.width = Math.ceil(size);
        cell.height = Math.ceil(size);
        await art(cell.getContext("2d")!, t, 0, 0, size, options, true);
        return { t, cell, x: pad + i * (size + gap) };
      }),
    ).then((cells) =>
      cells.forEach(({ t, cell, x }) => {
        ctx.drawImage(cell, x, y, size, size);
        if (options.badge)
          badge(
            ctx,
            t,
            x + size / 2 - Math.min(1, size / 250) * 71,
            y + size - 25,
            Math.min(1, size / 250),
          );
      }),
    );
    if (options.caption)
      fitText(
        ctx,
        options.caption,
        w / 2,
        h * 0.92,
        h * 0.1,
        w * 0.9,
        ink,
        "center",
      );
  } else if (key === "profile" || key === "sticker") {
    await art(ctx, token, 0, 0, w, options);
    if (options.caption)
      fitText(
        ctx,
        options.caption,
        w / 2,
        h * 0.86,
        w * 0.065,
        w * 0.72,
        ink,
        "center",
      );
    if (options.badge) badge(ctx, token, w / 2 - w * 0.1, h * 0.12, w / 710);
  } else if (key === "header") {
    const x = options.side === "left" ? w * 0.04 : w * 0.64;
    await art(
      ctx,
      token,
      x,
      h * 0.04,
      h * 0.92,
      options,
      options.background !== "own",
    );
    const tx = options.side === "left" ? w * 0.43 : w * 0.06;
    const caption = options.caption || `Squeek #${token.id}`;
    fitText(ctx, caption, tx, h * 0.52, 70, w * 0.5, ink);
    if (options.badge) badge(ctx, token, tx, h * 0.62);
  } else if (key === "phone") {
    await art(
      ctx,
      token,
      w * 0.03,
      h * 0.26,
      w * 0.94,
      options,
      options.background !== "own",
    );
    if (options.caption)
      fitText(
        ctx,
        options.caption,
        w / 2,
        h * 0.8,
        84,
        w * 0.85,
        ink,
        "center",
      );
    if (options.badge) badge(ctx, token, w / 2 - 106.5, h * 0.85, 1.5);
  } else if (key === "desktop") {
    const size = h * 0.78;
    await art(
      ctx,
      token,
      (w - size) / 2,
      h * 0.04,
      size,
      options,
      options.background !== "own",
    );
    if (options.caption)
      fitText(
        ctx,
        options.caption,
        w / 2,
        h * 0.88,
        90,
        w * 0.9,
        ink,
        "center",
      );
    if (options.badge) badge(ctx, token, w / 2 - 106.5, h * 0.92, 1.5);
  } else {
    text(ctx, `Squeek #${token.id}`, 64, 80, 48, ink);
    if (options.badge) badge(ctx, token, w - 206, 38);
    await art(ctx, token, 220, 112, 640, options, options.background !== "own");
    // The share card always includes its requested data, even when the decorative badge is off.
    text(
      ctx,
      `Level ${token.level ?? "unavailable"}   ·   Base power ${powerLabel(token.basePower)}`,
      64,
      820,
      28,
      ink,
    );
    if (options.caption)
      fitText(ctx, options.caption, 64, 870, 30, w - 128, ink);
    token.traits.forEach((trait, i) => {
      const x = i % 2 === 0 ? 64 : 560;
      const y = 927 + Math.floor(i / 2) * 59;
      text(ctx, trait.name, x, y, 18, ink, 400);
      fitText(ctx, trait.value, x, y + 28, 24, 440, ink);
    });
    text(ctx, "Made with Squeek Studio", 64, h - 35, 20, ink, 400);
  }
  ctx.restore();
}
export function pngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("The browser could not create a PNG.")),
      "image/png",
    ),
  );
}
