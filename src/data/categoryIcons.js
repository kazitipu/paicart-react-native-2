/* Category icons — a small custom line-icon set (24×24 grid, 1.8 stroke,
 * round caps/joins) drawn for Paicart's storefront categories, replacing the
 * emoji. Each entry: { color, bg, shapes } where a shape is
 *   { d }            an SVG path, or
 *   { cx, cy, r }    a circle.
 * Shapes are stroked in `color`; `fill: true` fills them instead.
 *
 * SAME FILE in paicart-nextjs15 (src/lib/) and paicart-react-native
 * (src/data/) — the website renders it with <svg>, the app with
 * react-native-svg. Keep them identical. */

export const CATEGORY_ICONS = {
  'Dress & Clothing': {
    color: '#DB2777',
    bg: '#FDF2F8',
    shapes: [
      { d: 'M9 3c.8 1 1.8 1.5 3 1.5S14.2 4 15 3' },
      { d: 'M9 3 7.8 7.2l1.7 3.3L5 21h14l-4.5-10.5 1.7-3.3L15 3' },
      { d: 'M9.5 10.5h5' },
    ],
  },
  'Accessories & Shoes': {
    color: '#2563EB',
    bg: '#EFF6FF',
    shapes: [
      { d: 'M3 16V9.6c0-.6.5-1 1.1-.9l3.1.6 2.3 2.3 4.3 1.2 5.5 1.4c1.1.3 1.9 1.3 1.9 2.4V16z' },
      { d: 'M3 16v2.2h18V16' },
      { d: 'M9.2 11.6l1.4-1.4M11.6 12.6l1.4-1.4' },
    ],
  },
  'Handbags & Wallets': {
    color: '#B45309',
    bg: '#FFFBEB',
    shapes: [
      { d: 'M5 9h14l-1.3 10.2a2 2 0 0 1-2 1.8H8.3a2 2 0 0 1-2-1.8z' },
      { d: 'M9 9V7a3 3 0 0 1 6 0v2' },
      { d: 'M10.5 13h3' },
    ],
  },
  'Sports & Apparel': {
    color: '#16A34A',
    bg: '#F0FDF4',
    shapes: [
      { d: 'M8 3.5 4 6l1.8 4 1.7-.8v11.3h9V9.2l1.7.8L20 6l-4-2.5c-.6 1.3-2 2.2-4 2.2s-3.4-.9-4-2.2z' },
      { d: 'M10.4 12.8h3.2l-2 4.7' },
    ],
  },
  "Children's Clothing": {
    color: '#7C3AED',
    bg: '#F5F3FF',
    shapes: [
      { d: 'M8.5 3.5 4.5 6.5l1.8 3.2L8 8.8V14l-1.5 4.5c-.2.6.2 1.1.8 1.1h2.4c.4 0 .7-.2.9-.6L12 16.5l1.4 2.5c.2.4.5.6.9.6h2.4c.6 0 1-.5.8-1.1L16 14V8.8l1.7.9 1.8-3.2-4-3c-.7 1-2 1.7-3.5 1.7s-2.8-.7-3.5-1.7z' },
      { cx: 12, cy: 11, r: 0.6, fill: true },
      { cx: 12, cy: 13.4, r: 0.6, fill: true },
    ],
  },
  'Home Furnishings': {
    color: '#0D9488',
    bg: '#F0FDFA',
    shapes: [
      { d: 'M5 11V8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5V11' },
      { d: 'M3.5 11.5a1.5 1.5 0 0 1 3 0V14h11v-2.5a1.5 1.5 0 0 1 3 0V17a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z' },
      { d: 'M6 18v2M18 18v2' },
    ],
  },
  'Home Improvement': {
    color: '#EA580C',
    bg: '#FFF7ED',
    shapes: [
      { d: 'M4 8h10.5a2 2 0 0 1 2 2v.8a2 2 0 0 1-2 2H11L9.6 20H6.6l.9-7.2H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z' },
      { d: 'M16.5 10.4H21' },
      { d: 'M7 10.4h3' },
    ],
  },
  'Office & Pets': {
    color: '#CA8A04',
    bg: '#FEFCE8',
    shapes: [
      { d: 'M12 12.6c-2.6 0-5 2.4-5 4.6 0 1.4 1.1 2.3 2.4 2.3.9 0 1.6-.5 2.6-.5s1.7.5 2.6.5c1.3 0 2.4-.9 2.4-2.3 0-2.2-2.4-4.6-5-4.6z' },
      { cx: 6.3, cy: 10.6, r: 1.6 },
      { cx: 9.6, cy: 6.6, r: 1.7 },
      { cx: 14.4, cy: 6.6, r: 1.7 },
      { cx: 17.7, cy: 10.6, r: 1.6 },
    ],
  },
  'Beauty & Makeup': {
    color: '#E11D48',
    bg: '#FFF1F2',
    shapes: [
      { d: 'M8.5 12.5h7v8a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1z' },
      { d: 'M9.5 9h5v3.5h-5z' },
      { d: 'M10.3 9V5.7c0-.4.3-.8.7-.9l2.5-1c.3-.1.6.1.6.4V9' },
      { d: 'M8.5 15.5h7' },
    ],
  },
  'Digital & Electronics': {
    color: '#0891B2',
    bg: '#ECFEFF',
    shapes: [
      { d: 'M8 3h8a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 16 21H8a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 8 3z' },
      { d: 'M10.5 5.6h3' },
      { d: 'M11.2 18.2h1.6' },
      { d: 'M20 9.5c.7.7.7 2.3 0 3M3.9 12.5c-.7-.7-.7-2.3 0-3' },
    ],
  },
};

/* A neutral fallback (tag) for any category without its own icon */
export const FALLBACK_ICON = {
  color: '#64748B',
  bg: '#F1F5F9',
  shapes: [
    { d: 'M3.5 12.3V5a1.5 1.5 0 0 1 1.5-1.5h7.3a1.5 1.5 0 0 1 1 .4l7.3 7.3a1.5 1.5 0 0 1 0 2.1l-7.3 7.3a1.5 1.5 0 0 1-2.1 0L3.9 13.3a1.5 1.5 0 0 1-.4-1z' },
    { cx: 8, cy: 8, r: 1.3, fill: true },
  ],
};

export const categoryIcon = (id) => CATEGORY_ICONS[id] || FALLBACK_ICON;
