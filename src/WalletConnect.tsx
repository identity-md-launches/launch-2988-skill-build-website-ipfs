import { useEffect, useRef, useState } from "react";
import { shortAddress, validAddress } from "./data";
import { Icon } from "./icons";
type Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};
type Discovered = {
  info: { uuid: string; name: string; icon: string };
  provider: Provider;
};
declare global {
  interface Window {
    ethereum?: Provider;
  }
}
const mobileLinks = [
  {
    name: "MetaMask",
    url: (url: string) =>
      `https://link.metamask.io/dapp/${url.replace(/^https?:\/\//, "")}`,
  },
  {
    name: "Coinbase Wallet",
    url: (url: string) =>
      `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`,
  },
  {
    name: "Rabby",
    url: (url: string) =>
      `https://go.rabby.io/mobile/?_cmd=open-dapp&dapp=${encodeURIComponent(url)}`,
  },
  {
    name: "Phantom",
    url: (url: string) =>
      `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(location.origin)}`,
  },
];
export default function WalletConnect() {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<Discovered[]>([]);
  const [connected, setConnected] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    function announced(event: Event) {
      const detail = (event as CustomEvent<Discovered>).detail;
      if (
        !detail?.info?.uuid ||
        typeof detail.info.name !== "string" ||
        typeof detail.provider?.request !== "function"
      )
        return;
      setProviders((prev) =>
        prev.some((p) => p.info.uuid === detail.info.uuid)
          ? prev
          : [...prev, detail],
      );
    }
    window.addEventListener("eip6963:announceProvider", announced);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () =>
      window.removeEventListener("eip6963:announceProvider", announced);
  }, []);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  async function connect(provider: Provider, name: string) {
    setBusy(name);
    setError("");
    try {
      // This is the only wallet request made by this entire application.
      const result = await provider.request({ method: "eth_requestAccounts" });
      if (
        !Array.isArray(result) ||
        typeof result[0] !== "string" ||
        !validAddress(result[0])
      )
        throw new Error("The wallet did not share a valid address.");
      setConnected(result[0]);
      setOpen(false);
      location.hash = `/wallet/${result[0]}`;
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? e.code : null;
      setError(
        code === 4001
          ? "Connection declined. You can try again or paste an address instead."
          : e instanceof Error
            ? e.message
            : "Could not read the wallet address. Try again or paste it on the home page.",
      );
    } finally {
      setBusy(null);
    }
  }
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return (
    <>
      <button
        className="button connect-button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Icon name="wallet" size={17} />
        <span>{connected ? shortAddress(connected) : "Connect wallet"}</span>
      </button>
      <dialog
        ref={ref}
        className="wallet-dialog"
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false);
        }}
        aria-labelledby="wallet-title"
      >
        <div className="dialog-content">
          <div className="dialog-heading">
            <h2 id="wallet-title">
              {connected ? "Your wallet address" : "Connect a wallet"}
            </h2>
            <button
              className="icon-button"
              aria-label="Close wallet dialog"
              onClick={() => setOpen(false)}
            >
              <Icon name="close" />
            </button>
          </div>
          <p className="muted">
            Only your public address is read. Nothing is signed or sent.
          </p>
          {connected ? (
            <>
              <p className="full-address">{connected}</p>
              <a
                className="button primary"
                href={`#/wallet/${connected}`}
                onClick={() => setOpen(false)}
              >
                View Squeeks
                <Icon name="arrow" />
              </a>
              <button
                className="button"
                onClick={() => {
                  setConnected(null);
                  setOpen(false);
                }}
              >
                Disconnect
              </button>
            </>
          ) : (
            <div className="wallet-choices">
              {providers.map((p) => (
                <button
                  className="wallet-choice"
                  key={p.info.uuid}
                  disabled={!!busy}
                  onClick={() => void connect(p.provider, p.info.name)}
                >
                  {typeof p.info.icon === "string" &&
                  p.info.icon.startsWith("data:image/") ? (
                    <img src={p.info.icon} alt="" width="28" height="28" />
                  ) : (
                    <Icon name="wallet" size={24} />
                  )}
                  <span>{p.info.name}</span>
                  {busy === p.info.name ? (
                    "Opening…"
                  ) : (
                    <Icon name="chevron" size={16} />
                  )}
                </button>
              ))}
              {!providers.length && window.ethereum && (
                <button
                  className="wallet-choice"
                  disabled={!!busy}
                  onClick={() =>
                    void connect(window.ethereum!, "Browser wallet")
                  }
                >
                  <Icon name="wallet" size={24} />
                  <span>Browser wallet</span>
                  {busy ? "Opening…" : <Icon name="chevron" size={16} />}
                </button>
              )}
              {!providers.length && !window.ethereum && (
                <p className="wallet-note">
                  {mobile
                    ? "Open this page in your wallet’s browser to share your address."
                    : "No browser wallet was found. Open this page in a wallet browser, or paste a public address on the home page."}
                </p>
              )}
              {mobile &&
                !window.ethereum &&
                !providers.length &&
                mobileLinks.map((w) => (
                  <a
                    key={w.name}
                    className="wallet-choice"
                    href={w.url(location.href)}
                  >
                    <Icon name="wallet" size={24} />
                    <span>Open in {w.name}</span>
                    <Icon name="external" size={16} />
                  </a>
                ))}
              <a className="text-link" href="#/" onClick={() => setOpen(false)}>
                Use a public address instead
                <Icon name="arrow" size={16} />
              </a>
            </div>
          )}
          <p className="form-error" role="status">
            {error}
          </p>
        </div>
      </dialog>
    </>
  );
}
