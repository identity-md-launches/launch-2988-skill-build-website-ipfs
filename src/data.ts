export const API = "https://api.squeekchain.com/v1";
export const COLLECTION = "0xc4c7982657f00509548f3a3a41db7fa439a6856b";
export const RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.gateway.tenderly.co",
] as const;
export const TRAITS = [
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
] as const;
export type Trait = { name: string; value: string };
export type Squeek = {
  id: number;
  name: string;
  image: string;
  traits: Trait[];
  level: number | null;
  basePower: string | null;
  owner: string | null;
  source: "api" | "chain";
};
export type WalletToken = {
  id: number;
  level: number | null;
  basePower: string | null;
  custody: "wallet" | "staking";
  mergeState: string;
};
export const validAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s);
export const validId = (s: string | number) =>
  /^\d+$/.test(String(s)) && Number(s) >= 1 && Number(s) <= 9999;
export const shortAddress = (s: string) => `${s.slice(0, 6)}…${s.slice(-4)}`;
export const powerLabel = (s: string | null) =>
  s === null
    ? "Unavailable"
    : /^\d+$/.test(s)
      ? BigInt(s).toLocaleString("en-US")
      : s;
const TTL = 5 * 60 * 1000;
const memory = new Map<string, { at: number; value: unknown }>();
const pending = new Map<string, Promise<unknown>>();
let active = 0;
const waiters: (() => void)[] = [];

// The slot covers fetch AND body decoding. Every API and RPC request shares this queue.
async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (active >= 6) await new Promise<void>((resolve) => waiters.push(resolve));
  else active++;
  try {
    return await task();
  } finally {
    const next = waiters.shift();
    if (next) next();
    else active--;
  }
}
async function request(url: string, init?: RequestInit): Promise<unknown> {
  return limited(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const r = await fetch(url, {
        ...init,
        signal: controller.signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } finally {
      clearTimeout(timeout);
    }
  });
}
async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let entry = memory.get(key);
  if (!entry) {
    try {
      const stored = sessionStorage.getItem(`squeek:${key}`);
      if (stored) entry = JSON.parse(stored);
    } catch {
      /* Storage may be blocked or full. */
    }
  }
  if (entry && Date.now() - entry.at < TTL) return entry.value as T;
  const previous = pending.get(key);
  if (previous) return previous as Promise<T>;
  const promise = load()
    .then((value) => {
      const result = { at: Date.now(), value };
      memory.set(key, result);
      try {
        sessionStorage.setItem(`squeek:${key}`, JSON.stringify(result));
      } catch {
        /* In-memory cache remains available. */
      }
      return value;
    })
    .finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}
export function clearCache(key: string) {
  memory.delete(key);
  try {
    sessionStorage.removeItem(`squeek:${key}`);
  } catch {
    /* Best effort. */
  }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid data response");
  return value as Record<string, unknown>;
}
const levelValue = (v: unknown) =>
  v !== null &&
  v !== undefined &&
  v !== "" &&
  Number.isFinite(Number(v)) &&
  Number(v) >= 0
    ? Number(v)
    : null;
const powerValue = (v: unknown) =>
  typeof v === "string" && /^\d+$/.test(v)
    ? v
    : typeof v === "number" && Number.isSafeInteger(v) && v >= 0
      ? String(v)
      : null;
function attributes(value: unknown): Trait[] {
  const rows = Array.isArray(value) ? value : [];
  return TRAITS.map((name) => {
    const row = rows.find(
      (r) =>
        r &&
        typeof r === "object" &&
        (r.traitType === name || r.trait_type === name),
    );
    return {
      name,
      value:
        row && (typeof row.value === "string" || typeof row.value === "number")
          ? String(row.value)
          : "Unavailable",
    };
  });
}
export function decodeDataUri(uri: string, mime: string): string {
  if (!uri.startsWith(`data:${mime}`))
    throw new Error(`Expected embedded ${mime}`);
  const comma = uri.indexOf(",");
  if (comma < 0) throw new Error("Invalid data URI");
  return /;base64/i.test(uri.slice(0, comma))
    ? new TextDecoder().decode(
        Uint8Array.from(atob(uri.slice(comma + 1)), (c) => c.charCodeAt(0)),
      )
    : decodeURIComponent(uri.slice(comma + 1));
}
function validatedImage(value: unknown): string {
  if (typeof value !== "string") throw new Error("Onchain SVG unavailable");
  const svg = decodeDataUri(value, "image/svg+xml");
  if (svg.length > 1000000 || !svg.includes("<svg"))
    throw new Error("Invalid onchain SVG");
  return value;
}
function decodeAbiString(result: unknown): string {
  if (
    typeof result !== "string" ||
    !/^0x[0-9a-fA-F]+$/.test(result) ||
    result.length < 130
  )
    throw new Error("No token URI returned");
  const hex = result.slice(2);
  const offset = Number(BigInt(`0x${hex.slice(0, 64)}`)) * 2;
  if (!Number.isSafeInteger(offset) || offset + 64 > hex.length)
    throw new Error("Invalid URI offset");
  const length = Number(BigInt(`0x${hex.slice(offset, offset + 64)}`));
  if (length > 1500000 || length < 1 || offset + 64 + length * 2 > hex.length)
    throw new Error("Invalid URI length");
  const bytes =
    hex.slice(offset + 64, offset + 64 + length * 2).match(/.{2}/g) ?? [];
  return new TextDecoder().decode(
    Uint8Array.from(bytes, (b) => parseInt(b, 16)),
  );
}
async function ethCall(endpoint: string, data: string): Promise<unknown> {
  const raw = object(
    await request(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: COLLECTION, data }, "latest"],
      }),
    }),
  );
  if (raw.error) throw new Error("Collection read failed");
  return raw.result;
}
async function onchain(id: number): Promise<Squeek> {
  const arg = BigInt(id).toString(16).padStart(64, "0");
  for (const endpoint of RPCS) {
    try {
      const uri = decodeAbiString(await ethCall(endpoint, `0xc87b56dd${arg}`));
      const metadata = object(
        JSON.parse(decodeDataUri(uri, "application/json")),
      );
      const image = validatedImage(metadata.image ?? metadata.imageDataUri);
      let owner: string | null = null;
      try {
        const result = await ethCall(endpoint, `0x6352211e${arg}`);
        if (typeof result === "string" && /^0x[0-9a-fA-F]{64}$/.test(result))
          owner = `0x${result.slice(-40)}`;
      } catch {
        /* Art still works without ownerOf. */
      }
      const rows = Array.isArray(metadata.attributes)
        ? metadata.attributes
        : [];
      const extra = (name: string) =>
        rows.find((r) => r.trait_type === name || r.traitType === name)?.value;
      return {
        id,
        name:
          typeof metadata.name === "string" ? metadata.name : `Squeek #${id}`,
        image,
        traits: attributes(rows),
        level: levelValue(metadata.level ?? extra("Level")),
        basePower: powerValue(metadata.basePower ?? extra("Base Power")),
        owner,
        source: "chain",
      };
    } catch {
      /* Try the next specified public endpoint. */
    }
  }
  throw new Error(
    "The Squeek API and both Sepolia RPCs could not load this Squeek. It may not exist yet, or the services may be unavailable.",
  );
}
export function getSqueek(id: number): Promise<Squeek> {
  if (!validId(id))
    return Promise.reject(new Error("Choose a Squeek number from 1 to 9999."));
  return cached(`token:${id}`, async () => {
    try {
      const raw = object(await request(`${API}/squeeks/${id}`));
      const metadata = object(raw.metadata);
      const custody =
        raw.custody && typeof raw.custody === "object"
          ? (raw.custody as Record<string, unknown>)
          : {};
      return {
        id,
        name: `Squeek #${id}`,
        image: validatedImage(metadata.imageDataUri),
        traits: attributes(metadata.attributes),
        level: levelValue(raw.level),
        basePower: powerValue(raw.basePower),
        owner:
          typeof custody.owner === "string" && validAddress(custody.owner)
            ? custody.owner
            : null,
        source: "api" as const,
      };
    } catch {
      return onchain(id);
    }
  });
}
export function getWallet(address: string): Promise<WalletToken[]> {
  if (!validAddress(address))
    return Promise.reject(
      new Error(
        "Enter a valid 0x wallet address with 40 hexadecimal characters.",
      ),
    );
  return cached(`wallet:${address.toLowerCase()}`, async () => {
    const tokens = new Map<number, WalletToken>();
    let cursor: string | null = null;
    const seen = new Set<string>();
    do {
      const url = `${API}/accounts/${address}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`;
      let raw: Record<string, unknown>;
      try {
        raw = object(await request(url));
      } catch {
        throw new Error(
          "The Squeek API could not load this wallet. Wallet discovery, including vault deposits, needs the API. Try again, or open a Squeek by number.",
        );
      }
      if (!Array.isArray(raw.tokens))
        throw new Error(
          "The API returned an incomplete wallet response. Please retry.",
        );
      for (const value of raw.tokens) {
        const t = object(value);
        if (!validId(String(t.tokenId))) continue;
        const id = Number(t.tokenId);
        tokens.set(id, {
          id,
          custody: t.custody === "staking" ? "staking" : "wallet",
          level: levelValue(t.level),
          basePower: powerValue(t.basePower),
          mergeState: typeof t.mergeState === "string" ? t.mergeState : "",
        });
      }
      if (
        raw.nextCursor != null &&
        typeof raw.nextCursor !== "string" &&
        typeof raw.nextCursor !== "number"
      ) {
        throw new Error(
          "The API returned an invalid page cursor. Please retry.",
        );
      }
      cursor =
        raw.nextCursor == null || raw.nextCursor === ""
          ? null
          : String(raw.nextCursor);
      if (cursor && seen.has(cursor))
        throw new Error(
          "The API repeated a page cursor. Retry to load the complete wallet.",
        );
      if (cursor) seen.add(cursor);
    } while (cursor);
    return [...tokens.values()].sort(
      (a, b) => (b.level ?? -1) - (a.level ?? -1) || a.id - b.id,
    );
  });
}
