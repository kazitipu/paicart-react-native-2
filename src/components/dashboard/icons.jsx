import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

/* Line icons from the dashboard design file — a straight port of the web's
   pages/dashboard/_overview/icons.jsx to react-native-svg, so the overview
   draws the same glyphs (24×24, stroke 1.8, round caps) as the web. */
const P = {
  copy: () => (
    <>
      <Rect x="8" y="8" width="12" height="12" rx="2" />
      <Path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </>
  ),
  edit: () => <Path d="m14 6 4 4M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z" />,
  wallet: () => (
    <>
      <Path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H20v14H6.5A2.5 2.5 0 0 1 4 16.5z" />
      <Path d="M4 8h13M16 12h4M7.5 14.5h.01" />
      <Path d="M8 3h10" />
    </>
  ),
  chevronRight: () => <Path d="m9 18 6-6-6-6" />,
  chevronDown: () => <Path d="m6 9 6 6 6-6" />,
  arrowRight: () => <Path d="M5 12h14m-6-6 6 6-6 6" />,
  cart: () => (
    <>
      <Path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6" />
      <Circle cx="10" cy="20" r="1" />
      <Circle cx="18" cy="20" r="1" />
    </>
  ),
  truck: () => (
    <>
      <Path d="M3 7h11v11H3zM14 11h4l3 3v4h-7z" />
      <Circle cx="7.5" cy="18.5" r="1.8" />
      <Circle cx="17.5" cy="18.5" r="1.8" />
    </>
  ),
  box: () => (
    <>
      <Path d="m12 2 8 4.5v11L12 22l-8-4.5v-11L12 2Z" />
      <Path d="m4 6.5 8 4.5 8-4.5M12 11v11" />
    </>
  ),
  info: () => (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 11v5m0-8h.01" />
    </>
  ),
  calendar: () => (
    <>
      <Path d="M4 5h16v16H4zM8 3v4m8-4v4M4 10h16" />
      <Path d="M8 14h3m-3 3h7" />
    </>
  ),
  calendarPlain: () => <Path d="M4 5h16v16H4zM8 3v4m8-4v4M4 10h16" />,
  download: () => <Path d="M12 3v12m-5-5 5 5 5-5M4 19v2h16v-2" />,
  card: () => (
    <>
      <Rect x="3" y="5" width="18" height="14" rx="2.2" />
      <Path d="M3 10h18" />
    </>
  ),
  package: () => (
    <>
      <Path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <Path d="M3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5" />
    </>
  ),
  send: () => (
    <>
      <Path d="m21 3-7.2 18-3.7-7.1L3 10.2 21 3Z" />
      <Path d="m10.1 13.9 4.6-4.6" />
    </>
  ),
  warehouse: () => (
    <>
      <Path d="M3 10 12 4l9 6v10H3V10Z" />
      <Path d="M7 20v-7h10v7M8 10h8" />
    </>
  ),
  checkCircle: () => (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="m7.5 12.2 3 3 6.2-6.3" />
    </>
  ),
  clock: () => (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  bag: () => (
    <>
      <Path d="M3 7.5h18l-1.4 12H4.4L3 7.5Z" />
      <Path d="M8 8V6a4 4 0 0 1 8 0v2M9 13h6" />
      <Path d="M12 10.5v5" />
    </>
  ),
  home: () => (
    <>
      <Path d="M3 10.5 12 3l9 7.5V21H3V10.5Z" />
      <Path d="M8 21v-7h8v7M7 10h10" />
      <Path d="M16.5 5.7h3" />
    </>
  ),
  user: () => (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21a8 8 0 0 1 16 0" />
      <Path d="M19 5h3m-1.5-1.5v3" />
    </>
  ),
  lock: () => (
    <>
      <Rect x="4" y="10" width="16" height="11" rx="2" />
      <Path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
    </>
  ),
  refund: () => (
    <>
      <Path d="M3 12a9 9 0 1 0 2.6-6.3L3 8" />
      <Path d="M3 3v5h5m4-1v5l3 2" />
    </>
  ),
  star: () => <Path d="m12 2 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 2Z" />,
  logout: () => (
    <>
      <Path d="M10 17l5-5-5-5m5 5H3" />
      <Path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
    </>
  ),
  sourcing: () => (
    <>
      <Path d="M3 3h2l2.2 11.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 1.9-1.5L22 7H6" />
      <Circle cx="10" cy="20" r="1.2" />
      <Circle cx="18" cy="20" r="1.2" />
      <Path d="M12 5.5h5m-2.5-2.5v5" />
    </>
  ),
  shipBox: () => (
    <>
      <Path d="m12 3 9 4.5v9L12 21l-9-4.5v-9L12 3Z" />
      <Path d="m3.5 7.7 8.5 4.4 8.5-4.4M12 12.1V21M8 5l8.5 4.4" />
    </>
  ),
  grid: () => (
    <>
      <Rect x="3" y="3" width="7" height="7" rx="1.5" />
      <Rect x="14" y="3" width="7" height="7" rx="1.5" />
      <Rect x="3" y="14" width="7" height="7" rx="1.5" />
      <Rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  megaphone: () => (
    <>
      <Path d="M3 11v2a2 2 0 0 0 2 2h2l5 4V5l-5 4H5a2 2 0 0 0-2 2Z" />
      <Path d="M16 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12" />
    </>
  ),
  pin: () => (
    <>
      <Path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <Circle cx="12" cy="10" r="2.5" />
    </>
  ),
  book: () => (
    <>
      <Path d="M4 4.5A3.5 3.5 0 0 1 7.5 1H20v18H7.5A3.5 3.5 0 0 0 4 22V4.5Z" />
      <Path d="M4 5v17m4-16h8m-8 4h8" />
    </>
  ),
  calc: () => (
    <>
      <Rect x="5" y="2" width="14" height="20" rx="2" />
      <Path d="M8 6h8M8 11h2m4 0h2M8 15h2m4 0h2M8 19h2m4 0h2" />
    </>
  ),
  headset: () => (
    <>
      <Path d="M4 13v-2a8 8 0 0 1 16 0v2" />
      <Path d="M4 13H3a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h3v-7H4Zm16 0h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-3v-7h2Z" />
      <Path d="M12 21h2" />
    </>
  ),
  doc: () => (
    <>
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <Path d="M14 2v6h6M8 13h8m-8 4h6" />
    </>
  ),
  chat: () => (
    <>
      <Path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
      <Path d="M8 9h8m-8 4h5" />
    </>
  ),
  question: () => (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M9.6 9a2.5 2.5 0 1 1 4.4 1.6c-.9 1-2 1.1-2 2.9m0 3h.01" />
    </>
  ),
  shield: () => (
    <>
      <Path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <Path d="m9 12 2 2 4-4" />
    </>
  ),
  terms: () => (
    <>
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <Path d="M14 2v6h6M8 13h8m-8 4h8" />
    </>
  ),
  whatsapp: () => (
    <>
      <Path d="M20.2 11.7a8.2 8.2 0 0 1-12.1 7.2L3 20l1.2-4.8a8.2 8.2 0 1 1 16-3.5Z" />
      <Path d="M8.2 8.1c.3-.6.6-.6.9-.6h.5c.2 0 .4.1.5.4l.8 1.8c.1.2.1.4-.1.6l-.6.7c-.2.2-.2.4-.1.6.5.9 1.2 1.6 2.1 2.1.2.1.4.1.6-.1l.8-.9c.2-.2.4-.2.6-.1l1.7.8c.3.1.4.3.4.5 0 .4-.2 1.1-.7 1.5-.5.5-1.2.7-1.9.6-1-.1-2.4-.7-3.8-1.9-1.2-1.1-2.1-2.5-2.3-3.5-.2-.9.1-1.9.6-2.5Z" />
    </>
  ),
  phone: () => (
    <Path d="M21 16.5v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 10.2 18a19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.9 3.2 2 2 0 0 1 3.9 1h3a2 2 0 0 1 2 1.7l.5 3a2 2 0 0 1-.6 1.7L7 9.2a16 16 0 0 0 6 6l1.8-1.8a2 2 0 0 1 1.7-.6l3 .5a2 2 0 0 1 1.5 2.2Z" />
  ),
  mail: () => (
    <>
      <Rect x="2" y="4" width="20" height="16" rx="2" />
      <Path d="m22 7-10 7L2 7" />
    </>
  ),
  facebook: () => <Path d="M14 8h3V4h-3a5 5 0 0 0-5 5v3H6v4h3v4h4v-4h3l1-4h-4V9a1 1 0 0 1 1-1Z" />,
  instagram: () => (
    <>
      <Rect x="3" y="3" width="18" height="18" rx="5" />
      <Circle cx="12" cy="12" r="4" />
      <Path d="M17.5 6.5h.01" />
    </>
  ),
  youtube: () => (
    <>
      <Rect x="2" y="5" width="20" height="14" rx="4" />
      <Path d="m10 9 5 3-5 3V9Z" />
    </>
  ),
  x: (color) => (
    <Path
      d="M18.244 2.25h3.308l-7.227 8.26L22.827 21.75h-6.763l-5.297-6.925-6.064 6.925H1.393l7.73-8.835L.91 2.25h6.93l4.787 6.326zm-1.16 17.52h1.833L6.67 4.126H4.703z"
      fill={color}
      stroke="none"
    />
  ),
  close: () => <Path d="m18 6-12 12M6 6l12 12" />,
  search: () => (
    <>
      <Circle cx="10.8" cy="10.8" r="6.8" />
      <Path d="m16 16 5 5" />
    </>
  ),
};

function Icon({ name, size = 18, color = '#20242b', strokeWidth = 1.8 }) {
  const draw = P[name];
  if (!draw) return null;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {draw(color)}
    </Svg>
  );
}

export default React.memo(Icon);
