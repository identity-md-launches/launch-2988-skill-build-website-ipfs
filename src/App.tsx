import { useEffect, useRef, useState } from "react";
import {
  clearCache,
  getSqueek,
  getWallet,
  powerLabel,
  shortAddress,
  validAddress,
  validId,
  type Squeek,
  type WalletToken,
} from "./data";
import { DotMark, Icon } from "./icons";
import Studio from "./Studio";
import { PRESETS, type PresetKey } from "./render";
import WalletConnect from "./WalletConnect";

function useRoute() {
  const [hash, setHash] = useState(location.hash || "#/");
  useEffect(() => {
    const change = () => {
      setHash(location.hash || "#/");
      window.scrollTo(0, 0);
    };
    addEventListener("hashchange", change);
    return () => removeEventListener("hashchange", change);
  }, []);
  return hash.slice(1);
}
function useLoad<T>(key: string, load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setLoading(true);
    setError("");
    load()
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            e instanceof Error
              ? e.message
              : "Could not load data. Please retry.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Callers key all resource identities; retry clears the corresponding session cache.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, revision]);
  return {
    data,
    error,
    loading,
    retry: () => {
      clearCache(key);
      setRevision((n) => n + 1);
    },
  };
}
function ErrorState({
  title = "Could not load this Squeek",
  message,
  retry,
}: {
  title?: string;
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="empty-state">
      <span className="state-icon">
        <Icon name="search" size={32} />
      </span>
      <h2>{title}</h2>
      <p role="alert">{message}</p>
      <div className="state-actions">
        {retry && (
          <button className="button primary" onClick={retry}>
            <Icon name="refresh" size={18} />
            Retry
          </button>
        )}
        <a className="button" href="#/">
          Back to the studio
        </a>
      </div>
    </div>
  );
}
function Lookup({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = value.trim();
    if (validAddress(input)) {
      location.hash = `/wallet/${input}`;
      return;
    }
    const number = input.replace(/^#/, "");
    if (validId(number)) {
      location.hash = `/squeek/${Number(number)}`;
      return;
    }
    setError("Enter a 0x wallet address or a Squeek number from 1 to 9999.");
    ref.current?.focus();
  }
  return (
    <form
      className={`lookup ${compact ? "compact" : ""}`}
      onSubmit={submit}
      noValidate
    >
      <label htmlFor="lookup">Wallet address or Squeek number</label>
      <div className="lookup-row">
        <div className="input-wrap">
          <Icon name="search" size={20} />
          <input
            ref={ref}
            id="lookup"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="0x… or #1"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError("");
            }}
            aria-invalid={!!error}
            aria-describedby={error ? "lookup-error" : "lookup-help"}
          />
        </div>
        <button type="submit" className="button primary">
          Open Studio
          <Icon name="arrow" size={18} />
        </button>
      </div>
      <p
        id={error ? "lookup-error" : "lookup-help"}
        className={error ? "form-error" : "lookup-help"}
        role={error ? "alert" : undefined}
      >
        {error || (
          <>
            <Icon name="shield" size={14} />
            Free and read-only, with nothing to sign.
          </>
        )}
      </p>
    </form>
  );
}
function Home() {
  return (
    <>
      <section className="home-hero">
        <div className="hero-copy">
          <h1>
            Your Squeek.
            <br />
            <span>Everywhere.</span>
          </h1>
          <p className="hero-description">
            Turn your onchain Squeek into profile pictures, banners, wallpapers
            and more.
          </p>
          <Lookup />
        </div>
        <div
          className="hero-art"
          role="img"
          aria-label="Squeek #1 as a profile picture and Squeek #2 as an X header"
        >
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="hero-profile">
            <div className="mockup-label">
              <span>
                <Icon name="image" size={16} />
                Profile picture
              </span>
              <Icon name="crop" size={18} />
            </div>
            <div className="hero-avatar">
              <img
                src="./art/squeek-1-cutout.svg"
                alt="Purple dot-grid Squeek #1"
                width="320"
                height="320"
                fetchPriority="high"
              />
            </div>
          </div>
          <div className="hero-banner">
            <img
              src="./art/squeek-2-cutout.svg"
              alt=""
              width="155"
              height="155"
            />
            <div>
              <span>Squeek #2</span>
              <small>Your next X header</small>
            </div>
            <Icon name="spark" size={22} />
          </div>
          <span className="hero-spark spark-one" aria-hidden="true">
            +
          </span>
          <span className="hero-spark spark-two" aria-hidden="true">
            +
          </span>
        </div>
      </section>
      <section className="samples-section" aria-labelledby="samples-heading">
        <div className="section-heading">
          <div>
            <h2 id="samples-heading">Try a Squeek</h2>
            <p>Pick a character to try the studio.</p>
          </div>
          <span className="subtle-label">Original Squeek SVGs</span>
        </div>
        <div className="sample-grid">
          {[
            { id: 1, palette: "Void Violet", color: "violet" },
            { id: 2, palette: "Spectral Electric Cyan", color: "blue" },
            { id: 3, palette: "Spectral Electric Cyan", color: "gold" },
          ].map((s) => (
            <a
              className={`sample-card ${s.color}`}
              href={`#/squeek/${s.id}`}
              key={s.id}
            >
              <div className="sample-art">
                <img
                  src={`./art/squeek-${s.id}-cutout.svg`}
                  alt={`Dot-grid art for Squeek #${s.id}`}
                  width="300"
                  height="300"
                  loading="lazy"
                />
                <span className="sample-number" aria-hidden="true">
                  0{s.id}
                </span>
                <span className="sample-open">
                  <Icon name="arrow" size={22} />
                </span>
              </div>
              <div className="sample-info">
                <h3>Squeek #{s.id}</h3>
                <span>{s.palette}</span>
                <Icon name="chevron" size={18} />
              </div>
            </a>
          ))}
        </div>
      </section>
      <section
        className="formats-section"
        id="formats"
        aria-labelledby="formats-heading"
      >
        <div className="section-heading">
          <div>
            <h2 id="formats-heading">A format for every screen</h2>
            <p>Full-resolution PNGs, made right in your browser.</p>
          </div>
          <Icon name="spark" size={28} />
        </div>
        <div className="format-list">
          {PRESETS.map((p) => (
            <a
              key={p.key}
              href={`#/squeek/1?preset=${p.key}`}
              className="format-item"
            >
              <Icon name={p.icon} size={26} />
              <span>
                {p.name}
                <small>
                  {p.width} × {p.height}
                </small>
              </span>
              <Icon name="arrow" size={16} />
            </a>
          ))}
        </div>
      </section>
      <section className="how-section" id="how">
        <div>
          <DotMark />
          <h2>From onchain to all yours</h2>
          <p>
            Original Squeek art, your choice of colour and crop. Every export is
            rendered from the SVG, so every little dot stays sharp.
          </p>
          <a
            href="https://squeekchain.com"
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            Meet Squeekchain
            <Icon name="external" size={16} />
          </a>
        </div>
        <ol className="how-steps">
          <li>
            <span>01</span>
            <div>
              <h3>Find your Squeek</h3>
              <p>
                Use a wallet address or a Squeek number. Vault Squeeks come
                along, too.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Make a little magic</h3>
              <p>
                Pick a format, choose a background and add your finishing
                touches.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Take it everywhere</h3>
              <p>Download a PNG, copy the image or share a link on X.</p>
            </div>
          </li>
        </ol>
      </section>
    </>
  );
}
function SqueekPage({
  id,
  initialPreset,
}: {
  id: number;
  initialPreset: PresetKey;
}) {
  const state = useLoad(`token:${id}`, () => getSqueek(id));
  if (state.loading)
    return (
      <div className="detail-loading" role="status">
        <div className="skeleton-art" />
        <div>
          <h1>Finding Squeek #{id}…</h1>
          <p>Loading its onchain art and traits.</p>
          <p className="muted">
            If the API is unavailable, the studio tries two public Sepolia RPCs.
          </p>
        </div>
      </div>
    );
  if (state.error || !state.data)
    return <ErrorState message={state.error} retry={state.retry} />;
  const token = state.data;
  return (
    <>
      <a className="back-link" href="#/">
        <Icon name="back" size={17} />
        Back to the studio
      </a>
      <section className="squeek-detail" aria-labelledby="squeek-title">
        <div className="detail-art">
          <img
            src={token.image}
            alt={`Original onchain dot-grid art for Squeek #${id}`}
            width="700"
            height="700"
          />
          <span className="original-art-label">
            <Icon name="image" size={15} />
            Original onchain art
          </span>
        </div>
        <div className="detail-info">
          <div className="detail-title">
            <h1 id="squeek-title">Squeek #{id}</h1>
            <span className="network-label">
              <span className="status-dot" />
              Sepolia
            </span>
          </div>
          <div className="token-stats">
            <div>
              <span>Level</span>
              <strong>{token.level ?? "Unavailable"}</strong>
            </div>
            <div>
              <span>Base power</span>
              <strong>{powerLabel(token.basePower)}</strong>
            </div>
            <div className="owner-stat">
              <span>Owner</span>
              {token.owner ? (
                <a
                  href={`https://sepolia.etherscan.io/address/${token.owner}`}
                  title={token.owner}
                  aria-label={`Owner ${token.owner} on Sepolia Etherscan`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {shortAddress(token.owner)}
                  <Icon name="external" size={13} />
                </a>
              ) : (
                <strong>Unavailable</strong>
              )}
            </div>
          </div>
          {token.source === "chain" && (
            <p className="fallback-note" role="status">
              Loaded directly from Sepolia because the API was unavailable.
              Level and base power are shown only when the token metadata
              provides them. The owner is the onchain holder, which may be a
              vault contract.
            </p>
          )}
          <h2 className="traits-title">The little details</h2>
          <dl className="traits-grid">
            {token.traits.map((t) => (
              <div key={t.name}>
                <dt>{t.name}</dt>
                <dd>{t.value}</dd>
              </div>
            ))}
          </dl>
          <button
            className="button primary detail-cta"
            onClick={() =>
              document.getElementById("studio")?.scrollIntoView({
                behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                  ? "instant"
                  : "smooth",
              })
            }
          >
            Make something
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </section>
      <Studio tokens={[token]} initialPreset={initialPreset} />
    </>
  );
}
function LazyTokenCard({
  token,
  selecting,
  selected,
  onSelect,
  atLimit,
}: {
  token: WalletToken;
  selecting: boolean;
  selected: boolean;
  onSelect: () => void;
  atLimit: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [art, setArt] = useState<Squeek | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "180px" },
    );
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setError(false);
    getSqueek(token.id)
      .then((v) => {
        if (!cancelled) setArt(v);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, token.id, attempt]);
  return (
    <article ref={root} className={`wallet-card ${selected ? "chosen" : ""}`}>
      <div className="wallet-card-image">
        <a
          href={`#/squeek/${token.id}`}
          aria-label={`Open Squeek #${token.id}`}
          tabIndex={selecting ? -1 : 0}
        >
          {art ? (
            <img
              src={art.image}
              alt={`Squeek #${token.id} onchain art`}
              width="400"
              height="400"
              loading="lazy"
            />
          ) : (
            <div className="art-placeholder">
              {error
                ? "Art unavailable"
                : visible
                  ? "Loading art…"
                  : `Squeek #${token.id}`}
            </div>
          )}
        </a>
        {selecting && (
          <button
            className="select-token"
            aria-label={`${selected ? "Deselect" : "Select"} Squeek #${token.id}`}
            aria-pressed={selected}
            disabled={!selected && atLimit}
            onClick={onSelect}
          >
            {selected ? (
              <Icon name="check" size={20} />
            ) : (
              <Icon name="plus" size={20} />
            )}
          </button>
        )}
        {token.custody === "staking" && (
          <span className="vault-tag">
            <Icon name="shield" size={14} />
            In the vault
          </span>
        )}
        {error && (
          <button
            className="retry-art button small"
            onClick={() => {
              clearCache(`token:${token.id}`);
              setAttempt((a) => a + 1);
            }}
          >
            <Icon name="refresh" size={14} />
            Retry art
          </button>
        )}
      </div>
      <div className="wallet-card-info">
        <a href={`#/squeek/${token.id}`}>
          Squeek #{token.id}
          <Icon name="arrow" size={17} />
        </a>
        <span>
          Level {token.level ?? "unavailable"}
          <span>Base power {powerLabel(token.basePower)}</span>
        </span>
      </div>
    </article>
  );
}
function WalletPage({ address }: { address: string }) {
  const state = useLoad(`wallet:${address.toLowerCase()}`, () =>
    getWallet(address),
  );
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  if (state.loading)
    return (
      <div className="empty-state" role="status">
        <span className="state-icon">
          <Icon name="wallet" size={32} />
        </span>
        <h1>Finding your Squeeks…</h1>
        <p>Checking your wallet and vault deposits.</p>
      </div>
    );
  if (state.error || !state.data)
    return (
      <ErrorState
        title="Could not load this wallet"
        message={state.error}
        retry={state.retry}
      />
    );
  const tokens = state.data;
  return (
    <>
      <a className="back-link" href="#/">
        <Icon name="back" size={17} />
        Look up another wallet
      </a>
      <section className="wallet-heading">
        <div>
          <h1>Your Squeeks</h1>
          <a
            className="wallet-address"
            href={`https://sepolia.etherscan.io/address/${address}`}
            target="_blank"
            rel="noreferrer"
          >
            {address}
            <Icon name="external" size={14} />
          </a>
          <p>
            {tokens.length} {tokens.length === 1 ? "Squeek" : "Squeeks"} ·
            Wallet and vault · Highest level first
          </p>
        </div>
        {tokens.length >= 2 && (
          <button
            className="button"
            onClick={() => {
              setSelecting(!selecting);
              setSelected([]);
            }}
          >
            <Icon name={selecting ? "close" : "group"} size={18} />
            {selecting ? "Cancel selection" : "Make a group shot"}
          </button>
        )}
      </section>
      {tokens.length === 0 ? (
        <div className="empty-state">
          <DotMark />
          <h2>No Squeeks here yet</h2>
          <p>
            This wallet has no Squeeks in its wallet or vault. Explore the
            collection, or try a different address.
          </p>
          <a
            className="button primary"
            href="https://squeekchain.com"
            target="_blank"
            rel="noreferrer"
          >
            Explore Squeekchain
            <Icon name="external" size={18} />
          </a>
          <a className="text-link" href="#/">
            Try another wallet
          </a>
        </div>
      ) : (
        <>
          {selecting && (
            <div className="selection-bar">
              <div>
                <strong>{selected.length} of 6 selected</strong>
                <p>Choose 2–6 Squeeks for a header or wallpaper.</p>
              </div>
              <button
                className="button primary"
                disabled={selected.length < 2}
                onClick={() => {
                  location.hash = `/wallet/${address}/group?ids=${selected.join(",")}`;
                }}
              >
                Create group shot
                <Icon name="arrow" size={17} />
              </button>
            </div>
          )}
          <div className="wallet-grid">
            {tokens.map((t) => (
              <LazyTokenCard
                key={t.id}
                token={t}
                selecting={selecting}
                selected={selected.includes(t.id)}
                atLimit={selected.length >= 6}
                onSelect={() =>
                  setSelected((s) =>
                    s.includes(t.id)
                      ? s.filter((id) => id !== t.id)
                      : s.length < 6
                        ? [...s, t.id]
                        : s,
                  )
                }
              />
            ))}
          </div>
          {tokens.length === 1 && (
            <p className="muted single-token-note">
              Group shots need at least two Squeeks in the same wallet.
            </p>
          )}
        </>
      )}
    </>
  );
}
function GroupPage({ address, ids }: { address: string; ids: number[] }) {
  const key = `group:${address}:${ids.join(",")}`;
  const state = useLoad(key, async () => {
    if (
      ids.length < 2 ||
      ids.length > 6 ||
      new Set(ids).size !== ids.length ||
      ids.some((n) => !validId(n))
    )
      throw new Error("Choose 2–6 different Squeeks from the wallet page.");
    const wallet = await getWallet(address);
    if (ids.some((id) => !wallet.some((t) => t.id === id)))
      throw new Error(
        "Each Squeek in the group must belong to this wallet or its vault. Select your group again.",
      );
    return Promise.all(ids.map((id) => getSqueek(id)));
  });
  if (state.loading)
    return (
      <div className="empty-state" role="status">
        <Icon name="group" size={32} />
        <h1>Getting the squad together…</h1>
        <p>Loading original art for {ids.length} Squeeks.</p>
      </div>
    );
  if (state.error || !state.data)
    return (
      <ErrorState
        title="Could not load the group"
        message={state.error}
        retry={() => {
          for (const id of ids) clearCache(`token:${id}`);
          clearCache(`wallet:${address.toLowerCase()}`);
          state.retry();
        }}
      />
    );
  return (
    <>
      <a className="back-link" href={`#/wallet/${address}`}>
        <Icon name="back" size={17} />
        Choose a different group
      </a>
      <div className="group-heading">
        <h1>Better together.</h1>
        <p>{state.data.map((t) => `Squeek #${t.id}`).join(" · ")}</p>
      </div>
      <Studio tokens={state.data} group />
    </>
  );
}
export default function App() {
  const route = useRoute();
  const [path, query = ""] = route.split("?");
  const parts = path.split("/").filter(Boolean);
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    document.title =
      parts[0] === "squeek" && validId(parts[1])
        ? `Squeek #${Number(parts[1])} · Squeek Studio`
        : parts[0] === "wallet"
          ? "Your Squeeks · Squeek Studio"
          : "Squeek Studio — Your Squeek. Everywhere.";
    mainRef.current?.focus({ preventScroll: true });
  }, [route]);
  const params = new URLSearchParams(query);
  const requestedPreset = params.get("preset");
  const preset: PresetKey = PRESETS.some((p) => p.key === requestedPreset)
    ? (requestedPreset as PresetKey)
    : "profile";
  let content;
  if (!parts.length) content = <Home />;
  else if (parts[0] === "squeek" && parts.length === 2)
    content = validId(parts[1]) ? (
      <SqueekPage
        key={`${parts[1]}:${preset}`}
        id={Number(parts[1])}
        initialPreset={preset}
      />
    ) : (
      <ErrorState
        title="That Squeek number is invalid"
        message="Choose a Squeek number from 1 to 9999."
      />
    );
  else if (
    parts[0] === "wallet" &&
    (parts.length === 2 || (parts.length === 3 && parts[2] === "group"))
  )
    content = !validAddress(parts[1]) ? (
      <ErrorState
        title="That wallet address is invalid"
        message="Use a 0x address followed by 40 hexadecimal characters. ENS names are not supported."
      />
    ) : parts[2] === "group" ? (
      <GroupPage
        key={route}
        address={parts[1]}
        ids={(params.get("ids") ?? "").split(",").map(Number)}
      />
    ) : (
      <WalletPage key={parts[1]} address={parts[1]} />
    );
  else
    content = (
      <ErrorState
        title="This page wandered off"
        message="Head back to the studio to find a Squeek."
      />
    );
  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <a className="brand" href="#/" aria-label="Squeek Studio home">
          <DotMark />
          <span>
            squeek<span className="brand-studio">studio</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a className={`nav-link ${!parts.length ? "active" : ""}`} href="#/">
            The studio
          </a>
          <a
            className="nav-link external-nav"
            href="https://squeekchain.com"
            target="_blank"
            rel="noreferrer"
          >
            Squeekchain
            <Icon name="external" size={13} />
          </a>
        </nav>
        <WalletConnect />
      </header>
      <main
        ref={mainRef}
        id="main"
        tabIndex={-1}
        className={`page ${!parts.length ? "home" : ""}`}
      >
        {content}
      </main>
      <footer className="site-footer">
        <div className="footer-brand">
          <DotMark />
          <span>A little art, a lot of Squeek.</span>
        </div>
        <p>
          Unofficial fan tool for Squeekchain. Art from the Squeek onchain
          renderer; data from{" "}
          <a
            href="https://api.squeekchain.com"
            target="_blank"
            rel="noreferrer"
          >
            api.squeekchain.com
          </a>
          . Read-only: nothing is signed or sent.
        </p>
        <div className="footer-notes">
          <span>
            <Icon name="shield" size={14} />
            No cookies. No trackers. Just Squeeks.
          </span>
          <a href="https://squeekchain.com" target="_blank" rel="noreferrer">
            Visit Squeekchain
            <Icon name="external" size={14} />
          </a>
        </div>
      </footer>
    </>
  );
}
