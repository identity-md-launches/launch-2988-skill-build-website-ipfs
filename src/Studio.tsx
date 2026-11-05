import { useEffect, useRef, useState } from "react";
import { type Squeek } from "./data";
import {
  DEFAULT_OPTIONS,
  PRESETS,
  inspectSvg,
  pngBlob,
  render,
  type Options,
  type PresetKey,
} from "./render";
import { Icon } from "./icons";

export default function Studio({
  tokens,
  group = false,
  initialPreset = "profile",
}: {
  tokens: Squeek[];
  group?: boolean;
  initialPreset?: PresetKey;
}) {
  const [key, setKey] = useState<PresetKey>(group ? "header" : initialPreset);
  const [options, setOptions] = useState<Options>(() => ({
    ...DEFAULT_OPTIONS,
    ...(initialPreset === "sticker"
      ? { background: "transparent", badge: false }
      : {}),
  }));
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const latestCanvas = useRef<HTMLCanvasElement | null>(null);
  const preset = PRESETS.find((p) => p.key === key)!;
  const presets = group
    ? PRESETS.filter((p) => p.key === "header" || p.key === "desktop")
    : PRESETS;
  const palette = (() => {
    try {
      return inspectSvg(tokens[0].image).colors;
    } catch {
      return [];
    }
  })();
  const supportsCopy =
    typeof ClipboardItem !== "undefined" &&
    !!navigator.clipboard?.write &&
    window.isSecureContext;
  const set = <K extends keyof Options>(name: K, value: Options[K]) => {
    setOptions((o) => ({ ...o, [name]: value }));
    setMessage("");
  };
  function choosePreset(next: PresetKey) {
    setKey(next);
    setMessage("");
    if (next === "sticker")
      setOptions((o) => ({ ...o, background: "transparent", badge: false }));
    else if (
      options.background === "transparent" &&
      !["profile", "header", "desktop"].includes(next)
    )
      setOptions((o) => ({ ...o, background: "own" }));
  }
  useEffect(() => {
    let cancelled = false;
    setRendering(true);
    setError("");
    latestCanvas.current = null;
    const canvas = document.createElement("canvas");
    render(canvas, tokens, preset, options)
      .then(() => {
        if (cancelled || !previewRef.current) return;
        latestCanvas.current = canvas;
        previewRef.current.width = canvas.width;
        previewRef.current.height = canvas.height;
        previewRef.current.getContext("2d")?.drawImage(canvas, 0, 0);
        setRendering(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Preview failed. Try again.",
          );
          setRendering(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tokens, preset, options, attempt]);
  async function download() {
    const canvas = latestCanvas.current;
    if (!canvas) return;
    setWorking(true);
    setMessage("");
    try {
      const blob = await pngBlob(canvas);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `squeek-${group ? "group" : tokens[0].id}-${key}-${preset.width}x${preset.height}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage("PNG downloaded. Make it yours.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Download failed. Please retry.",
      );
    } finally {
      setWorking(false);
    }
  }
  async function copy() {
    const canvas = latestCanvas.current;
    if (!canvas || !supportsCopy) return;
    setWorking(true);
    setMessage("");
    try {
      // Start clipboard.write in the gesture: Safari can reject it after an awaited toBlob.
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob(canvas) }),
      ]);
      setMessage("Image copied. Ready to paste.");
    } catch {
      setMessage(
        "The browser could not copy this image. Use Download PNG instead.",
      );
    } finally {
      setWorking(false);
    }
  }
  function share() {
    const url = new URL(location.href);
    url.hash = `/squeek/${tokens[0].id}`;
    const text = group
      ? `The Squeek squad, made with Squeek Studio.`
      : `Squeek #${tokens[0].id}, with a little studio treatment. Made with Squeek Studio.`;
    window.open(
      `https://x.com/intent/post?${new URLSearchParams({ text, url: url.href })}`,
      "_blank",
      "noopener,noreferrer",
    );
  }
  const transparentAllowed = [
    "profile",
    "header",
    "desktop",
    "sticker",
  ].includes(key);
  return (
    <section
      className="studio"
      id={group ? "group-studio" : "studio"}
      aria-labelledby={group ? "group-studio-title" : "studio-title"}
    >
      <div className="section-heading studio-heading">
        <div>
          <h2 id={group ? "group-studio-title" : "studio-title"}>
            {group ? "The whole Squeek squad." : "Make it your own."}
          </h2>
          <p>Choose a format, find your look, take it with you.</p>
        </div>
        <span className="subtle-label">
          <Icon name="shield" size={16} /> Rendered in your browser
        </span>
      </div>
      <div
        className={`preset-grid ${group ? "two" : ""}`}
        role="group"
        aria-label="Export format"
      >
        {presets.map((p) => (
          <button
            key={p.key}
            className={`preset ${p.key === key ? "selected" : ""}`}
            aria-pressed={p.key === key}
            onClick={() => choosePreset(p.key)}
          >
            <Icon name={p.icon} size={22} />
            <span>
              {p.name}
              <small>
                {p.width} × {p.height}
              </small>
            </span>
            {p.key === key && <Icon name="check" size={16} />}
          </button>
        ))}
      </div>
      <div className="editor-layout">
        <div className="preview-panel">
          <div className="preview-head">
            <span>
              <span className="status-dot" />
              Live preview
            </span>
            <span>
              {preset.width} × {preset.height} px
            </span>
          </div>
          <div
            className={`preview-stage ${key === "phone" ? "portrait" : ""}`}
            aria-busy={rendering}
          >
            <canvas
              ref={previewRef}
              className={`output-canvas ${key}`}
              role="img"
              aria-label={`${preset.name} preview for ${tokens.map((t) => `Squeek #${t.id}`).join(", ")}`}
            />
            {rendering && (
              <span className="render-status" role="status">
                Rendering SVG…
              </span>
            )}
            {error && (
              <div className="render-error">
                <p role="alert">{error}</p>
                <button
                  className="button small"
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  <Icon name="refresh" size={16} />
                  Retry preview
                </button>
              </div>
            )}
          </div>
          <div className="preview-foot">
            <span>{preset.note}</span>
            <span>PNG · Full resolution</span>
          </div>
        </div>
        <div className="editor-controls">
          <div className="controls-title">
            <h3>Finishing touches</h3>
            <button
              className="text-button"
              onClick={() => {
                setOptions({
                  ...DEFAULT_OPTIONS,
                  ...(key === "sticker"
                    ? { background: "transparent", badge: false }
                    : {}),
                });
                setMessage("");
              }}
            >
              <Icon name="refresh" size={14} />
              Reset
            </button>
          </div>
          <fieldset className="background-controls">
            <legend>Background</legend>
            <div className="background-basics">
              {[
                { value: "own", label: "Original" },
                { value: "black", label: "Black" },
                { value: "white", label: "White" },
                ...(transparentAllowed
                  ? [{ value: "transparent", label: "Transparent" }]
                  : []),
              ].map((b) => (
                <button
                  key={b.value}
                  className={`bg-option ${options.background === b.value ? "active" : ""}`}
                  aria-pressed={options.background === b.value}
                  onClick={() => set("background", b.value)}
                >
                  {b.label}
                </button>
              ))}
            </div>
            {palette.length > 0 && (
              <>
                <p className="field-hint">
                  {group
                    ? "From the first Squeek’s palette"
                    : "From this Squeek’s palette"}
                </p>
                <div className="color-swatches">
                  {palette.map((color) => (
                    <button
                      key={color}
                      className={`swatch ${options.background === color ? "active" : ""}`}
                      style={{ "--swatch": color } as React.CSSProperties}
                      aria-label={`Background ${color}`}
                      aria-pressed={options.background === color}
                      onClick={() => set("background", color)}
                    >
                      {options.background === color && (
                        <Icon name="check" size={16} />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </fieldset>
          <div className="range-field">
            <label htmlFor={`${group ? "group-" : ""}zoom`}>
              Zoom <output>{options.zoom}%</output>
            </label>
            <input
              id={`${group ? "group-" : ""}zoom`}
              type="range"
              min="60"
              max="140"
              step="1"
              value={options.zoom}
              onChange={(e) => set("zoom", Number(e.target.value))}
            />
          </div>
          <div className="range-field">
            <label htmlFor={`${group ? "group-" : ""}offset`}>
              Vertical offset{" "}
              <output>
                {options.offset > 0 ? "+" : ""}
                {options.offset}%
              </output>
            </label>
            <input
              id={`${group ? "group-" : ""}offset`}
              type="range"
              min="-50"
              max="50"
              step="1"
              value={options.offset}
              onChange={(e) => set("offset", Number(e.target.value))}
            />
          </div>
          <div className="caption-field">
            <label htmlFor={`${group ? "group-" : ""}caption`}>
              Caption <span>{Array.from(options.caption).length}/24</span>
            </label>
            <input
              id={`${group ? "group-" : ""}caption`}
              type="text"
              value={options.caption}
              onChange={(e) =>
                set("caption", Array.from(e.target.value).slice(0, 24).join(""))
              }
              placeholder="A little personality…"
              autoComplete="off"
            />
          </div>
          {!group && key === "header" && (
            <div className="position-field">
              <span>Art position</span>
              <div role="group" aria-label="Art position">
                <button
                  aria-pressed={options.side === "left"}
                  className={options.side === "left" ? "active" : ""}
                  onClick={() => set("side", "left")}
                >
                  Left
                </button>
                <button
                  aria-pressed={options.side === "right"}
                  className={options.side === "right" ? "active" : ""}
                  onClick={() => set("side", "right")}
                >
                  Right
                </button>
              </div>
            </div>
          )}
          <div className="check-options">
            <label>
              <input
                type="checkbox"
                checked={options.badge}
                onChange={(e) => set("badge", e.target.checked)}
              />
              <span>Show level badge</span>
            </label>
            {key === "profile" && (
              <label>
                <input
                  type="checkbox"
                  checked={options.round}
                  onChange={(e) => set("round", e.target.checked)}
                />
                <span>
                  Round crop <small>Transparent corners</small>
                </span>
              </label>
            )}
            {key === "sticker" && (
              <p className="field-hint">Stickers always have a round crop.</p>
            )}
          </div>
          <div className="export-actions">
            <button
              className="button primary"
              onClick={download}
              disabled={rendering || !!error || working}
            >
              <Icon name="download" />
              {working ? "Preparing PNG…" : "Download PNG"}
              <Icon name="arrow" size={18} />
            </button>
            <div className="secondary-exports">
              {supportsCopy && (
                <button
                  className="button"
                  disabled={rendering || !!error || working}
                  onClick={copy}
                >
                  <Icon name="copy" size={17} />
                  Copy image
                </button>
              )}
              <button className="button" onClick={share}>
                <Icon name="x" size={17} />
                Share on X
              </button>
            </div>
            <p className="export-status" role="status">
              {message}
            </p>
            {!supportsCopy && (
              <p className="field-hint">
                Image copying is unavailable in this browser. Download PNG to
                save.
              </p>
            )}
            <p className="field-hint">
              Sharing opens a post with a link. Attach your PNG on X.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
