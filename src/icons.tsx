import type { CSSProperties } from "react";
export type IconName =
  | "arrow"
  | "search"
  | "wallet"
  | "download"
  | "copy"
  | "check"
  | "close"
  | "external"
  | "image"
  | "banner"
  | "phone"
  | "desktop"
  | "sticker"
  | "card"
  | "group"
  | "back"
  | "refresh"
  | "shield"
  | "plus"
  | "x"
  | "chevron"
  | "crop"
  | "spark";
const paths: Record<IconName, React.ReactNode> = {
  arrow: (
    <>
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  wallet: (
    <>
      <path d="M20 8V5H5a2 2 0 0 0 0 4h15v11H5a2 2 0 0 1-2-2V7m17 5h-5v5h5" />
      <path d="M17 14.5h.01" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="13" rx="2" />
      <path d="M16 8V3H3v13h5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  external: (
    <>
      <path d="M14 3h7v7m0-7L10 14M10 4H4v16h16v-6" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8" cy="8" r="1.5" />
      <path d="m3 17 5-5 4 4 4-6 5 7" />
    </>
  ),
  banner: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M10 6v12m4-8h4m-4 4h3" />
    </>
  ),
  phone: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M10 18h4" />
    </>
  ),
  desktop: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M12 17v4m-5 0h10" />
    </>
  ),
  sticker: (
    <>
      <path d="M21 12a9 9 0 1 0-9 9h1l8-8v-1Z" />
      <path d="M21 13h-8v8" />
    </>
  ),
  card: (
    <>
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M8 15h8m-8 3h5" />
      <circle cx="12" cy="8" r="3" />
    </>
  ),
  group: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-4a6 6 0 0 1 12 0v4m1-17a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3" />
    </>
  ),
  back: <path d="M20 12H4m6-6-6 6 6 6" />,
  refresh: (
    <>
      <path d="M20 7V2m0 5h-5M4 17v5m0-5h5" />
      <path d="M20 7a9 9 0 0 0-16 1m0 9a9 9 0 0 0 16-1" />
    </>
  ),
  shield: (
    <>
      <path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="m4 3 16 18h-5L4 3h5l11 18M20 3 4 21" />,
  chevron: <path d="m8 4 8 8-8 8" />,
  crop: (
    <>
      <path d="M6 2v16h16M2 6h16v16" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z" />
    </>
  ),
};
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
export function DotMark({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 36 36"
      fill="currentColor"
      aria-hidden="true"
    >
      {[1, 2, 3, 4, 5, 6, 7].flatMap((y) =>
        [1, 2, 3, 4, 5, 6, 7]
          .filter(
            (x) =>
              (y < 3 && (x < 3 || x > 5)) ||
              (y >= 3 && y < 6 && x > 1 && x < 7) ||
              (y >= 6 && x > 2 && x < 6),
          )
          .map((x) => (
            <circle
              key={`${x}:${y}`}
              cx={x * 4.5}
              cy={y * 4.5}
              r={(x === 3 || x === 5) && y === 4 ? 2 : 1.4}
            />
          )),
      )}
    </svg>
  );
}
