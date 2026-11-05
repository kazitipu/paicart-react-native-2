import React, { createContext, useContext } from 'react';
import { View, Text } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { ChevronRight } from 'lucide-react-native';
import { C, SHADOW, ORANGE, Press } from '@/components/product/ui';
import { TS, tpx } from '@/components/cart/CartBits';
import { toast } from '@/lib/toast';
import { goHome } from '@/navigation/goHome';

/* ═══════════════════════════════════════════════════════════════════════
   Pieces shared by the static information pages (web src/app/pages/
   about-us, contact, faq, how-to-order, privacy-policy, refund-policy,
   tax-and-Shipping, terms-and-coditions), as they render below 640px.
   None of these pages has a scoped mobile font shrink or `prose` styles —
   they are plain Tailwind v4 sizes. A named size keeps its own line-height
   unless a leading-* class overrides it; text-[Npx] inherits the body 1.5.
   ═══════════════════════════════════════════════════════════════════════ */

export { TS, tpx, C, SHADOW, ORANGE, Press };

export const RED = '#e62222';
export const INK = '#1C1C1C';
export const PAGE_BG = '#f7f8fa'; // bg-[#f7f8fa]

/* Palette values these pages use beyond ui.jsx's C. */
export const SC = {
  red300: '#fca5a5',
  red400: '#f87171',
  teal50: '#f0fdfa',
  teal100: '#ccfbf1',
  teal600: '#0d9488',
  purple50: '#faf5ff',
  purple100: '#f3e8ff',
  purple600: '#9333ea',
  orange600: '#ea580c',
  green500: '#22c55e',
  blue700: '#1d4ed8',
};

/* leading-relaxed (1.625) / leading-snug (1.375) on a named size. */
export const relaxed = (n) => ({ fontSize: n, lineHeight: n * 1.625 });
export const snug = (n) => ({ fontSize: n, lineHeight: n * 1.375 });

/* shadow-md shadow-<color>: Tailwind v4 swaps the shadow colour in at full
   opacity. */
export const coloredShadowMd = (c) => `0 4px 6px -1px ${c}, 0 2px 4px -2px ${c}`;

/* Long-press affordance on contact details (the web shows them as plain
   text; nothing about the layout changes). */
export const copyText = (value) => {
  Clipboard.setString(String(value));
  toast.success('Copied!');
};

/* ── Table-of-contents registry ──
   ContentPage provides it; SectionCard / Divider register their y offset
   inside <Body> so the jump sheet can scroll to them. */
export const TocContext = createContext(null);
const useTocLayout = (label) => {
  const ctx = useContext(TocContext);
  return ctx && label ? (e) => ctx.registerSection(label, e.nativeEvent.layout.y) : undefined;
};

/* Breadcrumb strip: px-4 py-3, bg #1C1C1C, text-sm, gap-1.5. */
export function Breadcrumb({ title, right }) {
  return (
    <View
      style={{
        backgroundColor: INK,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: right ? 'space-between' : 'flex-start',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
        <Press
          onPress={goHome}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          {({ pressed }) => (
            <Text style={[TS.sm, { color: pressed ? '#ffffff' : C.red200, fontWeight: '500' }]}>
              Home
            </Text>
          )}
        </Press>
        <ChevronRight size={12} color={SC.red300} />
        <Text style={[TS.sm, { color: '#ffffff', fontWeight: '600', flexShrink: 1 }]}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

/* Page hero: bg-white border-b border-gray-100 px-4 py-6; a 48px orange
   rounded-2xl icon tile, text-lg extrabold title, text-xs gray-400 sub. */
export function Hero({ Icon, title, subtitle }) {
  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: C.gray100,
        paddingHorizontal: 16,
        paddingVertical: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          backgroundColor: ORANGE,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: coloredShadowMd(C.orange200),
        }}
      >
        <Icon size={22} color="#ffffff" />
      </View>
      <View style={{ flexShrink: 1 }}>
        <Text style={[TS.lg, { fontWeight: '800', color: C.gray900 }]}>{title}</Text>
        {!!subtitle && (
          <Text style={[TS.xs, { color: C.gray400, marginTop: 2 }]}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
}

/* bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden */
export function Card({ style, children, onLayout }) {
  return (
    <View
      onLayout={onLayout}
      style={[
        {
          backgroundColor: '#ffffff',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.gray100,
          boxShadow: SHADOW.base,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* The legal pages' SectionCard: a 2px colour rule, a px-5 py-3 header with
   a 28px rounded-lg icon tile + text-sm bold title, and a px-5 py-4 body
   with space-y-{gap}. */
export function SectionCard({ Icon, title, color = ORANGE, gap = 8, children }) {
  const onLayout = useTocLayout(title);
  return (
    <Card onLayout={onLayout}>
      <View style={{ height: 2, backgroundColor: color }} />
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: C.gray50,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={13} color="#ffffff" />
        </View>
        <Text style={[TS.sm, { fontWeight: '700', color: C.gray800, flexShrink: 1 }]}>{title}</Text>
      </View>
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, gap }}>{children}</View>
    </Card>
  );
}

/* <p className="text-sm text-gray-600 leading-relaxed"> */
export function P({ children, style }) {
  return <Text style={[relaxed(14), { color: C.gray600 }, style]}>{children}</Text>;
}

const Label = ({ label }) =>
  label ? <Text style={{ fontWeight: '700', color: C.gray800 }}>{label}: </Text> : null;

/* Numbered item: a 24px red/10 circle (mt-0.5) beside text-sm relaxed copy,
   with an optional bold "Label: " lead-in. `after` renders block content
   below the text inside the same column (the refund page nests bullets). */
export function Item({ n, label, children, after }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: 'rgba(230,34,34,0.1)',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}
      >
        <Text style={[TS.xs, { color: RED, fontWeight: '800' }]}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[relaxed(14), { color: C.gray600 }]}>
          <Label label={label} />
          {children}
        </Text>
        {after}
      </View>
    </View>
  );
}

/* 6px orange dot (mt-2) + text-sm relaxed copy. */
export function Bullet({ label, children }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ORANGE, marginTop: 8 }} />
      <Text style={[relaxed(14), { color: C.gray600, flex: 1 }]}>
        <Label label={label} />
        {children}
      </Text>
    </View>
  );
}

/* "English Policy" / "English Terms" rule: py-1, gap-3, h-px gray-200
   lines, text-xs bold gray-400 px-2 label. */
export function Divider({ label }) {
  const onLayout = useTocLayout(label);
  return (
    <View onLayout={onLayout} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: C.gray200 }} />
      <Text style={[TS.xs, { fontWeight: '700', color: C.gray400, paddingHorizontal: 8 }]}>{label}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: C.gray200 }} />
    </View>
  );
}

/* Red prohibited-goods chip: "❌ item" in one text run. */
export function ProhibitedChip({ item, bg, border, px, py, weight = '400' }) {
  return (
    <View
      style={{
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        borderRadius: 999,
        paddingHorizontal: px,
        paddingVertical: py,
      }}
    >
      <Text style={[TS.xs, { color: C.red700, fontWeight: weight }]}>❌ {item}</Text>
    </View>
  );
}
