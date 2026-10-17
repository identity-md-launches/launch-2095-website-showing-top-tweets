import type { CSSProperties } from "react";
export type IconName =
  | "feed"
  | "bookmark"
  | "search"
  | "arrow"
  | "heart"
  | "repost"
  | "reply"
  | "eye"
  | "close"
  | "info"
  | "chip"
  | "code"
  | "users"
  | "chevron"
  | "check"
  | "x"
  | "leaf";
const paths: Record<IconName, React.ReactNode> = {
  feed: (
    <>
      <path d="m13 2-3 7H4l7 5-2 8 11-13h-7l2-7Z" />
    </>
  ),
  bookmark: <path d="M6 4h12v17l-6-4-6 4V4Z" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  arrow: (
    <>
      <path d="M6 18 18 6M6 6h12v12" />
    </>
  ),
  heart: (
    <path
      d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"
      transform="translate(1 0) scale(.91)"
    />
  ),
  repost: (
    <>
      <path d="m3 9 4-4 4 4M7 5v12h5m9-2-4 4-4-4m4 4V7h-5" />
    </>
  ),
  reply: (
    <path d="M21 11.5a9 9 0 0 1-9 9 11 11 0 0 1-4-.8L3 21l1.3-5a9 9 0 1 1 16.7-4.5Z" />
  ),
  eye: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  close: <path d="m6 6 12 12M6 18 18 6" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v1" />
    </>
  ),
  chip: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9 2v4m6-4v4m-6 12v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4" />
      <rect x="10" y="10" width="4" height="4" />
    </>
  ),
  code: (
    <>
      <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3m1-17a3 3 0 0 1 0 6m3 11v-3a6 6 0 0 0-3-5" />
    </>
  ),
  chevron: <path d="m8 5 7 7-7 7" />,
  check: <path d="m5 12 4 4L19 6" />,
  x: (
    <>
      <path d="M4 3h5l11 18h-5L4 3Zm16 0L4 21" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 3c-1 11-2 17-9 17A7 7 0 0 1 4 13C4 6 10 6 20 3Z" />
      <path d="M3 22 15 10" />
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
      focusable="false"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
