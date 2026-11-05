import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle, Rect, Path } from 'react-native-svg';
import {
  Check, Package, Plane, Ship, Clock, BadgeCheck, Warehouse, PlaneTakeoff, ShieldCheck, Building2, PackageCheck,
} from 'lucide-react-native';
import CopyIdButton from '@/components/CopyIdButton';
import ProductImage from '@/components/ui/ProductImage';
import { C, ORANGE, Spinner } from '@/components/product/ui';
import { stepsFor } from '@/lib/shipForMe';
import { isSeaShipment, statusDisplay } from '@/lib/shipment';
import { UNPAID_WINDOW_MS } from '@/lib/orderTabs';
import useNow from '@/lib/useNow';

/* ═══════════════════════════════════════════════════════════════════════
   Pieces shared by the My Orders list and the order detail port
   (web pages/dashboard/buy-and-ship-for-me/my-orders[/orderId], < 640px).

   The LIST page wraps everything — modals included — in `.myorders-root`,
   whose scoped <style> shrinks type below 1024px:
     text-[13px]→11  text-[11px]→9  text-[10px]→8
     text-xs→10  text-sm→12  text-base→14  text-lg→16
   Named Tailwind v4 sizes keep their line-height RATIO, so the line box
   shrinks with them; arbitrary text-[Npx] inherit the body's 1.5. The DETAIL
   page has no such block. `fs(size, shrink, leading)` returns the size a
   phone actually renders for either page.
   ═══════════════════════════════════════════════════════════════════════ */

const round2 = (n) => Math.round(n * 100) / 100;
const NAMED = {
  xs: [12, 10, 1 / 0.75],
  sm: [14, 12, 1.25 / 0.875],
  base: [16, 14, 1.5],
  lg: [18, 16, 1.75 / 1.125],
};
const ARB_SHRINK = { 13: 11, 11: 9, 10: 8 };
const LEADING = { tight: 1.25, snug: 1.375, relaxed: 1.625 };

export const fs = (size, shrink = false, leading) => {
  let px;
  let ratio;
  if (NAMED[size]) {
    const [full, small, r] = NAMED[size];
    px = shrink ? small : full;
    ratio = r;
  } else {
    const n = Number(size);
    px = shrink && ARB_SHRINK[n] ? ARB_SHRINK[n] : n;
    ratio = 1.5;
  }
  if (typeof leading === 'number') return { fontSize: px, lineHeight: leading };
  return { fontSize: px, lineHeight: round2(px * (LEADING[leading] || ratio)) };
};

/* Tailwind v3 palette values used here beyond ui.jsx's C. */
export const OC = {
  green100: '#dcfce7',
  green500: '#22c55e',
  orange100: '#ffedd5',
  orange500: '#f97316',
  orange700: '#c2410c',
  purple100: '#f3e8ff',
  purple700: '#7e22ce',
  blue200: '#bfdbfe',
  blue700: '#1d4ed8',
  red50: '#fef2f2',
  red100: '#fee2e2',
  DARK: '#1C1C1C',
  RED: '#e62222',
  PEACH: '#FFD6B0',
};

/* ── dates, as the web's toLocaleDateString calls print them ── */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/* toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' }) → "04 Nov 2026" */
export const enBDDate = (ms) => {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')} ${MON[d.getMonth()]} ${d.getFullYear()}`;
};
/* The web's order date: `time` formatted, else the stored `orderedDate`. */
export const orderDate = (order) => (order.time ? enBDDate(order.time) : order.orderedDate || '__');

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const BN_MONTHS = [
  'জানুয়ারী', 'ফেব্রুয়ারী', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];
const bnNum = (n) => String(n).replace(/\d/g, (c) => BN_DIGITS[c]);
/* toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }) → "৭ নভেম্বর, ২০২৬".
   Hermes ships no bn locale data, so it is spelled out here. */
export const bnBDDate = (ms) => {
  const d = new Date(ms);
  return `${bnNum(d.getDate())} ${BN_MONTHS[d.getMonth()]}, ${bnNum(d.getFullYear())}`;
};
/* Plain toLocaleDateString() (en-US) → "11/4/2026" */
export const usDate = (ms) => {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};

export const money = (n) => (Number(n) || 0).toLocaleString();

/* ── soft pill ── */
export const SOFT = {
  orange: { bg: '#fff1e6', text: '#FF6A00' },
  blue: { bg: '#e8f1ff', text: '#1677FF' },
  amber: { bg: '#fef6e0', text: '#8a5a06' },
  emerald: { bg: '#e5f9e9', text: '#00B42A' },
  red: { bg: '#fdeaea', text: '#F5222D' },
  gray: { bg: '#f1f2f4', text: '#899999' },
};

/* `inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full` */
export function Pill({ color = 'gray', Icon, spin = false, shrink, children }) {
  const c = SOFT[color] || SOFT.gray;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: c.bg,
        alignSelf: 'flex-start',
      }}
    >
      {Icon && (spin ? <Spinner size={11} color={c.text} /> : <Icon size={11} color={c.text} />)}
      <Text style={[fs(10, shrink), { fontWeight: '700', color: c.text }]}>{children}</Text>
    </View>
  );
}

export function PayBadge({ status, shrink }) {
  if (!status || status === 'purchaseLater') return <Pill shrink={shrink} color="gray">Not Paid</Pill>;
  if (status === 'Paid') return <Pill shrink={shrink} color="emerald" Icon={Check}>Paid</Pill>;
  if (status === 'Partially Paid') return <Pill shrink={shrink} color="orange">Partially Paid</Pill>;
  if (status === 'pending') {
    return (
      <Pill shrink={shrink} color="amber" Icon={Check} spin>
        Payment Pending
      </Pill>
    );
  }
  return <Pill shrink={shrink} color="gray">{status}</Pill>;
}

export function OrderStatusPill({ order, shrink }) {
  const s = order.orderStatus;
  if (!s || s === 'pending') return <Pill shrink={shrink} color="amber">Pending</Pill>;
  if (s === 'Purchased') return <Pill shrink={shrink} color="blue">Purchased</Pill>;
  if (s === 'Reject') return <Pill shrink={shrink} color="red">Rejected</Pill>;
  return <Pill shrink={shrink} color="gray">{statusDisplay(s)}</Pill>;
}

/* ── bill breakdown row ── */
export function Row({ label, value, bold, tone, small, shrink }) {
  const size = small ? 11 : 13;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <Text
        style={[
          fs(size, shrink),
          { flexShrink: 1, fontWeight: bold ? '700' : '400', color: bold ? C.gray800 : C.gray500 },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          fs(size, shrink),
          { fontWeight: '700', color: tone === 'green' ? C.green600 : tone === 'due' ? ORANGE : C.gray800 },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/* `border-t border-dashed border-gray-200` */
export function DashedDivider() {
  return <View style={{ height: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.gray200 }} />;
}

/* PriceTag: amount with the original struck through (gap-1.5, 0.85em, gray-400). */
export function PriceTag({ amount, original, style }) {
  const showOriginal = original != null && original > amount;
  const size = style?.fontSize || 12;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', justifyContent: 'flex-end', columnGap: 6 }}>
      <Text style={style}>৳{Math.round(amount).toLocaleString()}</Text>
      {showOriginal && (
        <Text
          style={{
            fontSize: size * 0.85,
            lineHeight: style?.lineHeight,
            color: C.gray400,
            fontWeight: '400',
            textDecorationLine: 'line-through',
          }}
        >
          ৳{Math.round(original).toLocaleString()}
        </Text>
      )}
    </View>
  );
}

/* Product tile: `w-16 h-16 rounded-xl border border-gray-100 bg-gray-50
   overflow-hidden`, Package 18 gray-300 when there is no picture. */
export function ItemThumb({ uri, size = 64, radius = 12 }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: C.gray100,
        backgroundColor: C.gray50,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {uri ? (
        <ProductImage uri={uri} thumb style={{ width: '100%', height: '100%' }} />
      ) : (
        <Package size={18} color={C.gray300} />
      )}
    </View>
  );
}

/* `rounded-xl bg-gray-50 border border-gray-100 flex divide-x divide-gray-200`:
   Order Id (with copy) | Shipment Method. */
export function IdMethodStrip({ order, shrink, style }) {
  const sea = (order.shipmentMethod || 'Air') === 'Sea';
  const label = [
    fs(10, shrink),
    { fontWeight: '700', color: C.gray400, textTransform: 'uppercase', letterSpacing: fs(10, shrink).fontSize * 0.05 },
  ];
  const value = [fs(13, shrink), { fontWeight: '700' }];
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'stretch',
          borderRadius: 12,
          backgroundColor: C.gray50,
          borderWidth: 1,
          borderColor: C.gray100,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
        <Text style={label}>Order Id</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Text style={[value, { color: C.gray800, flexShrink: 1 }]}>{order.orderId}</Text>
          <CopyIdButton value={order.orderId} />
        </View>
      </View>
      <View style={{ width: 1, backgroundColor: C.gray200 }} />
      <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 10 }}>
        <Text style={label}>Shipment Method</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          {sea ? <Ship size={13} color={ORANGE} /> : <Plane size={13} color={ORANGE} />}
          <Text style={[value, { color: ORANGE }]}>{sea ? 'Sea Shipment' : 'Air Shipment'}</Text>
        </View>
      </View>
    </View>
  );
}

/* ── 72h unpaid window ── */
export const unpaidDeadline = (order) => (order.time || 0) + UNPAID_WINDOW_MS;

/* Countdown banner for a fully-unpaid order approaching its auto-cancel
   deadline. Shown on any fully-unpaid order (the web gates on payment only),
   gone once the deadline passes — the sweep cancels it then. */
export function UnpaidCountdownBanner({ order, shrink }) {
  const deadline = unpaidDeadline(order);
  /* Stops ticking once the deadline has passed (the banner is gone then). */
  const now = useNow(1000, deadline > Date.now());

  const remaining = deadline - now;
  if (remaining <= 0) return null;
  const pad = (n) => String(n).padStart(2, '0');
  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 10,
        backgroundColor: '#fef6f6',
        borderWidth: 1,
        borderColor: '#fbdede',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
        <Clock size={13} color="#F5222D" />
        <Text style={[fs(11, shrink), { fontWeight: '700', color: '#F5222D', flexShrink: 1 }]}>
          পেমেন্ট বাকি (শেষ সময়: {bnBDDate(deadline)})
        </Text>
      </View>
      <View
        style={{
          backgroundColor: '#ffffff',
          borderWidth: 1,
          borderColor: 'rgba(245,34,45,0.25)',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 4,
          flexShrink: 0,
        }}
      >
        <Text style={[fs('xs', shrink), { fontWeight: '800', color: '#F5222D', fontVariant: ['tabular-nums'] }]}>
          {pad(h)}h : {pad(m)}m : {pad(s)}s
        </Text>
      </View>
    </View>
  );
}

/* ── ShipmentProgressVertical (ship-for-me/my-request/_shared.jsx), the
   `sm:hidden` mobile variant ── */
const STEP_ICONS = [Clock, BadgeCheck, Warehouse, PlaneTakeoff, ShieldCheck, Building2, PackageCheck];
const ORANGE_DARK = '#E05900';

function GradCircle({ size }) {
  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={ORANGE} />
          <Stop offset="1" stopColor={ORANGE_DARK} />
        </LinearGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#g)" />
    </Svg>
  );
}

function GradBar({ from, to, height }) {
  return (
    <Svg width={3} height={height} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="b" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={from} />
          <Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={3} height={height} rx={1.5} fill="url(#b)" />
    </Svg>
  );
}

export function ShipmentProgressVertical({ score = 1, req }) {
  const isSea = isSeaShipment(req);
  const steps = stepsFor(isSea);
  const icons = isSea ? STEP_ICONS.map((I, i) => (i === 3 ? Ship : I)) : STEP_ICONS;
  const active = Math.max(1, Math.min(score, steps.length));
  return (
    <View>
      <Text
        style={{ fontSize: 9, lineHeight: 13.5, fontWeight: '700', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.9 }}
      >
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
                <Text style={{ fontSize: 12, lineHeight: 24, fontWeight: '600', color: done ? C.gray700 : current ? ORANGE : C.gray300 }}>
                  {step}
                </Text>
                {current && (
                  <View style={{ marginLeft: 6, backgroundColor: OC.red50, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 999 }}>
                    <Text style={{ fontSize: 9, lineHeight: 13.5, fontWeight: '800', color: ORANGE }}>Current</Text>
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
