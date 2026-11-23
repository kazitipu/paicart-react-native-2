import React, { useId } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { TABS } from '@/navigation/routes';

/* Shared bits for the dashboard overview (screens/dashboard/DashboardOverview)
   — the RN side of the web's pages/dashboard/_overview/dashboard.css. */

export const D = {
  brand: '#ff6a00',
  brandDark: '#e85f00',
  ink: '#20242b',
  muted: '#87909c',
  line: '#edf0f3',
  page: '#f6f7f9',
  panelBorder: '#eef0f3',
  shadow: '0 7px 24px rgba(28,39,56,0.055)',
};

/* ── Taka amount, like the web's bdt() ──
   English digits with Indian grouping (12,34,567). Hermes' Intl locale data
   is not guaranteed on every build, so it is done by hand and always looks
   the same. */
const indianGroup = (intStr) => {
  if (intStr.length <= 3) return intStr;
  const last3 = intStr.slice(-3);
  const rest = intStr.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${rest},${last3}`;
};
export const bdt = (amount, digits = 0) => {
  const n = Math.max(0, Number(amount) || 0);
  const [i, f] = n.toFixed(digits).split('.');
  const s = indianGroup(i) + (f ? `.${f}` : '');
  return `৳ ${s}`;
};

/* `৳1,23,456` in Latin digits — the web's toLocaleString('en-IN'). */
export const money = (n) => `৳${indianGroup(String(Math.round(Math.max(0, Number(n) || 0))))}`;
export const enIN = (n) => indianGroup(String(Math.round(Number(n) || 0)));

/* ── Gradient fill ──
   No linear-gradient package in this app; an SVG rect behind the content
   (the parent needs overflow: 'hidden' + its borderRadius). `stops` is
   [[offset, color], …]; `dir` 'diag' | 'down' | 'right'. */
const DIRS = {
  diag: { x1: '0', y1: '0', x2: '1', y2: '1' },
  down: { x1: '0', y1: '0', x2: '0', y2: '1' },
  right: { x1: '0', y1: '0', x2: '1', y2: '0' },
};
export function Grad({ stops, dir = 'diag' }) {
  const id = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id={id} {...DIRS[dir]}>
          {stops.map(([o, c, op]) => (
            <Stop key={`${o}${c}`} offset={String(o)} stopColor={c} stopOpacity={op == null ? 1 : op} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/* ── Section heading: orange mark + title (+ subtitle / right action) ── */
export function TitleMark({ height = 17, width = 4 }) {
  return <View style={{ width, height, borderRadius: 5, backgroundColor: '#f86d10' }} />;
}

export function SectionHeading({ title, subtitle, right }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginHorizontal: 2, marginBottom: 9 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
        <TitleMark />
        <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '800', color: '#282522' }} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right || (subtitle ? <Text style={{ fontSize: 11, color: D.muted }} numberOfLines={1}>{subtitle}</Text> : null)}
    </View>
  );
}

export const PANEL = {
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#e9edf1',
  borderRadius: 18,
  boxShadow: D.shadow,
};

/* ── Where the web's hrefs go in the app ──
   dashboardData builds web URLs; here each record kind maps to its screen.
   All of these live in the Orders tab stack, alongside this screen. */
export const LIST_SCREEN = { order: 'BuyShipMyOrders', request: 'BuyShipMyRequests', ship: 'ShipMyRequests' };

export const openRecord = (navigation, kind, id) => {
  if (!id) return;
  if (kind === 'order') navigation.navigate('BuyShipOrderDetail', { orderId: String(id) });
  else if (kind === 'request') navigation.navigate('BuyShipRequestDetail', { orderId: String(id) });
  else navigation.navigate('ShipRequestDetail', { bookingId: String(id) });
};

export const openList = (navigation, kind, tab) =>
  navigation.navigate(LIST_SCREEN[kind] || 'BuyShipMyOrders', tab ? { tab } : undefined);

/* A transaction's invoice link: one record → its detail, several → the list. */
export const openTxnTarget = (navigation, t) => {
  if (t.ids && t.ids.length === 1) openRecord(navigation, t.kind, t.ids[0]);
  else openList(navigation, t.kind);
};

export const toMore = (navigation, screen) => navigation.navigate(TABS.MORE, { screen });
export const toHomeTab = (navigation, screen, params) => navigation.navigate(TABS.HOME, { screen, params });
