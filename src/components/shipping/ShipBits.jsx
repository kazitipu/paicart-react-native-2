import React, { useState } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Circle, Rect, Path } from 'react-native-svg';
import {
  ChevronDown, ChevronUp, Clock, BadgeCheck, Warehouse, PlaneTakeoff, ShieldCheck, Building2, PackageCheck, Ship,
} from 'lucide-react-native';
import { C, ORANGE, Press } from '@/components/product/ui';
import { stepsFor } from '@/lib/shipForMe';
import { isSeaShipment, READY_STATUS, READY_SEA_LABEL } from '@/lib/shipment';

/* ═══════════════════════════════════════════════════════════════════════
   Pieces of web pages/dashboard/ship-for-me/my-request/_shared.jsx (and the
   list page's local helpers), as they render below 640px.

   Both the list page and the detail page wrap everything — their modals
   included — in a root (`.sfm-list-root` / `.sfm-detail-root`) whose scoped
   <style> shrinks type below 1024px:
     text-[11px]→10  text-[10px]→9  text-[9px]→8
     text-xs→11  text-sm→13  text-base→15  text-lg→17
   Named Tailwind v4 sizes keep their line-height RATIO, so the line box
   shrinks with them; arbitrary text-[Npx] inherit the body's 1.5.
   `sf(size)` is what a phone actually renders inside those roots.
   ═══════════════════════════════════════════════════════════════════════ */

const round2 = (n) => Math.round(n * 100) / 100;
const NAMED = {
  xs: [11, 1 / 0.75],
  sm: [13, 1.25 / 0.875],
  base: [15, 1.5],
  lg: [17, 1.75 / 1.125],
};
const ARB = { 11: 10, 10: 9, 9: 8 };
const LEADING = { tight: 1.25, snug: 1.375, relaxed: 1.625 };

export const sf = (size, leading) => {
  let px;
  let ratio;
  if (NAMED[size]) {
    [px, ratio] = NAMED[size];
  } else {
    const n = Number(size);
    px = ARB[n] || n;
    ratio = 1.5;
  }
  if (typeof leading === 'number') return { fontSize: px, lineHeight: leading };
  return { fontSize: px, lineHeight: round2(px * (LEADING[leading] || ratio)) };
};

/* Tailwind palette values used by the ship-for-me pages beyond ui.jsx's C. */
export const SC = {
  teal100: '#ccfbf1',
  teal500: '#14b8a6',
  teal600: '#0d9488',
  teal700: '#0f766e',
  green500: '#22c55e',
  emerald50: '#ecfdf5',
  emerald100: '#d1fae5',
  emerald500: '#10b981',
  emerald600: '#059669',
  emerald700: '#047857',
  amber50: '#fffbeb',
  amber100: '#fef3c7',
  amber200: '#fde68a',
  amber500: '#f59e0b',
  amber600: '#d97706',
  amber700: '#b45309',
  amber800: '#92400e',
  red50: '#fef2f2',
  red100: '#fee2e2',
  red300: '#fca5a5',
  red500: '#ef4444',
  red700: '#b91c1c',
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  blue500: '#3b82f6',
  blue600: '#2563eb',
  orange50: '#fff7ed',
  orange200: '#fed7aa',
  purple50: '#faf5ff',
  purple600: '#9333ea',
  green50: '#f0fdf4',
  green600: '#16a34a',
  DARK: '#1C1C1C',
  TEAL: '#00B8A9',
  TEAL_DARK: '#00857A',
};

/* ── display helpers (cosmetic only — stored fields are untouched) ── */

/* "4/11/2026" → "2026-11-04" (the list card pads; the invoice page does not). */
export const toIsoDate = (s, pad = true) => {
  if (!s) return '';
  const [d, m, y] = String(s).split('/');
  if (!(d && m && y)) return s;
  return pad ? `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` : `${y}-${m}-${d}`;
};

export const CONTAINS_STYLE = {
  battery: { bg: '#fff7ed', fg: '#c2410c', border: '#fed7aa' },
  magnet: { bg: '#eef2ff', fg: '#4f46e5', border: '#c7d2fe' },
  liquid: { bg: '#ecfeff', fg: '#0891b2', border: '#a5f3fc' },
  powder: { bg: C.gray100, fg: C.gray600, border: C.gray200 },
  none: { bg: C.gray100, fg: C.gray500, border: C.gray200 },
};

/* Rough estimate only — Air ≈ 12–14 days, Sea ≈ 35–40 days from the booking
   date; the midpoint of each window is used. */
const SHIP_ETA_DAYS = { air: { min: 12, max: 14 }, sea: { min: 35, max: 40 } };
export const shipMethodOf = (req) => ((req?.shipBy || req?.method || 'air').toLowerCase() === 'sea' ? 'sea' : 'air');

export function estimateDeliveryDate(req) {
  if (!req.date) return null;
  const [d, m, y] = String(req.date).split('/').map(Number);
  if (!d || !m || !y) return null;
  const eta = SHIP_ETA_DAYS[shipMethodOf(req)];
  const days = Math.round((eta.min + eta.max) / 2);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/* `(n).toLocaleString()` */
export const num = (n) => (Number(n) || 0).toLocaleString();

/* ── Soft pastel pills ── */
export const SOFT_COLORS = {
  orange: { bg: '#fff1e6', text: '#FF6A00' },
  blue: { bg: '#e8f1ff', text: '#1677FF' },
  teal: { bg: '#e3f8f6', text: '#00857A' },
  amber: { bg: '#fef6e0', text: '#8a5a06' },
  emerald: { bg: '#e5f9e9', text: '#00B42A' },
  red: { bg: '#fdeaea', text: '#F5222D' },
  violet: { bg: '#f2ecfe', text: '#7c3aed' },
  sky: { bg: '#e6f6fd', text: '#0284c7' },
  gray: { bg: '#f1f2f4', text: '#899999' },
};

/* `inline-flex items-center gap-1.5 font-extrabold rounded-full` + the
   caller's size/padding. `Icon` renders in the pill's text colour. */
export function SoftPill({ color = 'gray', Icon, iconSize = 9, size, px, py, uppercase, center, style, children }) {
  const c = SOFT_COLORS[color] || SOFT_COLORS.gray;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: center ? 'center' : 'flex-start',
          gap: 6,
          borderRadius: 999,
          paddingHorizontal: px,
          paddingVertical: py,
          backgroundColor: c.bg,
          alignSelf: center ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {Icon && <Icon size={iconSize} color={c.text} />}
      <Text style={[sf(size), { fontWeight: '800', color: c.text, textTransform: uppercase ? 'uppercase' : 'none' }]}>
        {children}
      </Text>
    </View>
  );
}

export const STATUS_BADGE = {
  Pending: { color: 'orange', label: 'Booking Confirmed' },
  'Rates Provided': { color: 'blue', label: 'Rates Provided' },
  'Abroad Warehouse': { color: 'violet', label: 'Abroad Warehouse' },
  [READY_STATUS]: { color: 'sky', label: READY_STATUS },
  'Bangladesh customs': { color: 'amber', label: '🇧🇩 BD Customs' },
  'Bangladesh warehouse': { color: 'teal', label: 'Custom Released' },
  'Paicart warehouse': { color: 'teal', label: 'Paicart WH' },
  Delivered: { color: 'emerald', label: 'Delivered' },
  Reject: { color: 'red', label: 'Rejected' },
  Cancelled: { color: 'red', label: 'Cancelled' },
};

/* The fly/vessel milestone is the only label that depends on freight mode. */
export const statusLabelOf = (req) =>
  req?.status === READY_STATUS && isSeaShipment(req)
    ? READY_SEA_LABEL
    : STATUS_BADGE[req?.status]?.label || req?.status || 'Pending';

/* text-[9px] px-2 py-0.5 */
export function StatusBadge({ status, req }) {
  const s = STATUS_BADGE[status] || { color: 'orange', label: status || 'Pending' };
  const label = status === READY_STATUS && isSeaShipment(req) ? READY_SEA_LABEL : s.label;
  return (
    <SoftPill color={s.color} size={9} px={8} py={2}>
      {label}
    </SoftPill>
  );
}

export function PaymentBadge({ status }) {
  const val = status || 'Not Paid';
  if (val === 'Paid')
    return (
      <SoftPill color="emerald" size={9} px={8} py={2}>
        ✓ Paid
      </SoftPill>
    );
  if (val === 'Partially Paid')
    return (
      <SoftPill color="amber" size={9} px={8} py={2}>
        ◑ Partial
      </SoftPill>
    );
  return (
    <SoftPill color="gray" size={9} px={8} py={2}>
      ✕ Unpaid
    </SoftPill>
  );
}

/* ── Collapsible section (list card) ──
   `mt-3 rounded-xl border border-gray-100 overflow-hidden`; header button
   `px-2.5 py-2 bg-gray-50`, `text-[10px] font-bold text-gray-700`. */
export function Collapsible({ Icon, title, defaultOpen = false, accent = ORANGE, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={{ marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: C.gray100, overflow: 'hidden' }}>
      <Press
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 8,
          backgroundColor: pressed ? C.gray100 : C.gray50,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
          <Icon size={12} color={accent} />
          <Text style={[sf(10), { fontWeight: '700', color: C.gray700, flexShrink: 1 }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {open ? <ChevronUp size={13} color={C.gray400} /> : <ChevronDown size={13} color={C.gray400} />}
      </Press>
      {open && (
        <Animated.View entering={FadeIn.duration(180)} style={{ paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#ffffff' }}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}

/* ── ShipmentProgressVertical (the `sm:hidden` mobile stepper) ── */
const STEP_ICONS = [Clock, BadgeCheck, Warehouse, PlaneTakeoff, ShieldCheck, Building2, PackageCheck];
const ORANGE_DARK = '#E05900';

function GradCircle({ size }) {
  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="sfmc" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={ORANGE} />
          <Stop offset="1" stopColor={ORANGE_DARK} />
        </LinearGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#sfmc)" />
    </Svg>
  );
}

function GradBar({ from, to, height }) {
  return (
    <Svg width={3} height={height} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="sfmb" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={3} height={height} rx={1.5} fill="url(#sfmb)" />
    </Svg>
  );
}

export function ShipmentProgressVertical({ score = 1, req }) {
  const isSea = isSeaShipment(req);
  const steps = stepsFor(isSea);
  const icons = isSea ? STEP_ICONS.map((I, i) => (i === 3 ? Ship : I)) : STEP_ICONS;
  const active = Math.max(1, Math.min(parseInt(score, 10) || 1, steps.length));
  return (
    <View>
      <Text style={[sf(9), { fontWeight: '700', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.8 }]}>
        Shipment Progress
      </Text>
      <View style={{ marginTop: 8 }}>
        {steps.map((step, i) => {
          const done = i + 1 < active;
          const current = i + 1 === active;
          const isLast = i === steps.length - 1;
          const Icon = icons[i];
          return (
            <View key={step} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <View style={{ width: 24, alignItems: 'center', flexShrink: 0 }}>
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: done ? 'transparent' : '#ffffff',
                    borderWidth: done ? 0 : current ? 2.5 : 2,
                    borderColor: current ? ORANGE : C.gray200,
                    boxShadow: current
                      ? '0 0 0 4px rgba(255,106,0,0.094), 0 2px 8px rgba(255,106,0,0.2)'
                      : done
                        ? '0 2px 6px rgba(255,106,0,0.267)'
                        : undefined,
                  }}
                >
                  {done && <GradCircle size={24} />}
                  {done ? (
                    <Svg width={9} height={9} viewBox="0 0 12 12" fill="none">
                      <Path d="M2 6l3 3 5-5" stroke="#ffffff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  ) : (
                    <Icon size={9} strokeWidth={1.8} color={current ? ORANGE : '#c4c9d4'} />
                  )}
                </View>
                {!isLast && (
                  <View style={{ width: 3, height: 20, marginVertical: 2, borderRadius: 4, overflow: 'hidden', backgroundColor: C.gray200 }}>
                    {done && <GradBar from={ORANGE} to={ORANGE_DARK} height={20} />}
                    {current && <GradBar from={ORANGE_DARK} to={C.gray200} height={20} />}
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', flexShrink: 1, minHeight: 24 }}>
                <Text style={[sf('xs', 24), { fontWeight: '600', color: done ? C.gray700 : current ? ORANGE : C.gray300 }]}>{step}</Text>
                {current && (
                  <View style={{ marginLeft: 6, backgroundColor: SC.red50, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 999 }}>
                    <Text style={[sf(9), { fontWeight: '800', color: ORANGE }]}>Current</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
