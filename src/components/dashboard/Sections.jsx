import React from 'react';
import { View, Text } from 'react-native';
import ProductImage from '@/components/ui/ProductImage';
import { Press } from '@/components/product/ui';
import { formatDateTime } from '@/lib/dashboardData';
import Icon from './icons';
import { Grad, TitleMark, PANEL, D, enIN } from './ui';

/* Building blocks for the overview sections — the web page.jsx StatusCard,
   QuickRow, ServiceCard, request actions, contact panel and RecentCard. */

/* ── Status panels (Buy & Ship for me / Ship for me) ───────────────────── */

const TONES = {
  red: { bg: '#fff1f1', fg: '#d92e32', badge: '#dc3035' },
  amber: { bg: '#fff7e9', fg: '#e99a17', badge: '#f39a13' },
  blue: { bg: '#eef8fd', fg: '#19a5ce', badge: '#1aa5d0' },
  indigo: { bg: '#eef4ff', fg: '#427fe0', badge: '#3c7ee3' },
  purple: { bg: '#f7f0ff', fg: '#9b58d7', badge: '#9d55dc' },
  green: { bg: '#eefbf4', fg: '#2caf69', badge: '#2db96b' },
};

function StatusCard({ tone = 'red', icon, label, count, onPress }) {
  const t = TONES[tone];
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={`${label}: ${count}`}
      style={({ pressed }) => ({
        flex: 1, minWidth: 0, minHeight: 104, alignItems: 'center', justifyContent: 'flex-end', gap: 9,
        paddingTop: 18, paddingBottom: 12, paddingHorizontal: 2, borderRadius: 16, borderWidth: 1,
        borderColor: pressed ? '#ffc99f' : '#f0ece8', backgroundColor: pressed ? '#fffaf6' : '#ffffff',
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={23} color={t.fg} strokeWidth={1.9} />
      </View>
      <Text style={{ fontSize: 10, lineHeight: 13, fontWeight: '600', color: '#6d747d', textAlign: 'center' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
      <View style={{ position: 'absolute', top: 5, right: 4, minWidth: 21, height: 21, paddingHorizontal: 4, borderRadius: 11, backgroundColor: t.badge, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#ffffff' }}>{count}</Text>
      </View>
    </Press>
  );
}

export function StatusPanel({ title, subtitle, actionLabel, onAction, cards }) {
  return (
    <View style={{ ...PANEL, borderColor: '#f0e4dc', boxShadow: '0 9px 24px rgba(53,39,28,0.045)', overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingHorizontal: 11, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f3ece6' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1, flexWrap: 'wrap' }}>
          <TitleMark width={4} height={20} />
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#252b32', letterSpacing: -0.25 }}>{title}</Text>
          <Text style={{ fontSize: 10.5, color: '#969da6' }}>{subtitle}</Text>
        </View>
        <Press onPress={onAction} hitSlop={8} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 2, opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#b84443' }}>{actionLabel}</Text>
          <Icon name="chevronRight" size={14} color="#b84443" strokeWidth={2.2} />
        </Press>
      </View>
      <View style={{ flexDirection: 'row', gap: 5, paddingHorizontal: 7, paddingVertical: 11 }}>
        {cards.map((c) => <StatusCard key={c.label} {...c} />)}
      </View>
    </View>
  );
}

/* ── My Request action cards ───────────────────────────────────────────── */

export function RequestAction({ icon, title, sub, blue, onPress }) {
  return (
    <Press
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1, minWidth: 0, minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11,
        borderRadius: 17, borderWidth: 1, borderColor: pressed ? '#ffc69f' : '#f1e2d7', backgroundColor: '#ffffff',
        boxShadow: '0 4px 13px rgba(32,42,54,0.035)', transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{ width: 40, height: 40, borderRadius: 13, borderWidth: 1, borderColor: blue ? '#d9e9fc' : '#ffe0cb', backgroundColor: blue ? '#e3f0ff' : '#ffe9da', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={21} color={blue ? '#3478bc' : '#e85d04'} strokeWidth={1.85} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={{ fontSize: 12, lineHeight: 15.5, fontWeight: '800', color: '#252b32' }} numberOfLines={2}>{title}</Text>
        <Text style={{ fontSize: 10, lineHeight: 13.5, color: '#7d8793' }} numberOfLines={2}>{sub}</Text>
      </View>
    </Press>
  );
}

/* ── Quick rows (My Account / Information) ─────────────────────────────── */

const ICON_TONES = {
  orange: { bg: '#ffeedf', border: '#f8e7d8', fg: '#d96a20' },
  blue: { bg: '#e9f2ff', border: '#e1eaf8', fg: '#477dbb' },
  violet: { bg: '#f0eaff', border: '#e9e1fb', fg: '#8164bf' },
  green: { bg: '#e7f8ee', border: '#def0e5', fg: '#299269' },
  slate: { bg: '#eff2f6', border: '#e7ebf0', fg: '#65758a' },
  red: { bg: '#ffeae8', border: '#f7dfdd', fg: '#c75a54' },
};

export function QuickRow({ icon, tone = 'slate', title, sub, onPress, logout, last }) {
  const t = ICON_TONES[logout ? 'red' : tone];
  return (
    <Press
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 12,
        backgroundColor: logout ? (pressed ? '#fff0ef' : '#fff8f7') : pressed ? '#f8f9fb' : 'transparent',
        ...(logout ? { marginTop: 3, borderWidth: 1, borderColor: '#fae8e7' } : !last ? { borderBottomWidth: 1, borderBottomColor: '#f0f2f5' } : null),
      })}
    >
      <View style={{ width: 39, height: 39, borderRadius: 13, borderWidth: 1, borderColor: t.border, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={19} color={t.fg} strokeWidth={1.75} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: logout ? '#b94e49' : D.ink }} numberOfLines={1}>{title}</Text>
        <Text style={{ fontSize: 10.5, color: '#8a94a1' }} numberOfLines={1}>{sub}</Text>
      </View>
      <View style={{ width: 25, height: 25, borderRadius: 9, borderWidth: 1, borderColor: '#edf0f4', backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="chevronRight" size={12} color={logout ? '#c47772' : '#9aa4b1'} strokeWidth={2} />
      </View>
    </Press>
  );
}

export function QuickList({ rows }) {
  return (
    <View style={{ ...PANEL, padding: 4 }}>
      {rows.map((r, i) => <QuickRow key={r.title} {...r} last={i === rows.length - 1} />)}
    </View>
  );
}

/* ── My Services ───────────────────────────────────────────────────────── */

const SERVICE_ICON = {
  orange: { stops: [[0, '#ff9b50'], [1, '#e85f00']], arrow: '#d96b22' },
  blue: { stops: [[0, '#6da9ec'], [1, '#326bb7']], arrow: '#427bbb' },
  violet: { stops: [[0, '#a68ae8'], [1, '#7659c4']], arrow: '#7659c4' },
};

export function ServiceCard({ icon, title, sub, onPress, tone = 'orange', primary, small }) {
  const s = SERVICE_ICON[tone];
  const size = small ? 36 : 42;
  return (
    <Press
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1, minWidth: 0, minHeight: small ? 76 : 96, flexDirection: 'row', alignItems: 'center', gap: 9,
        paddingHorizontal: small ? 9 : 10, paddingVertical: small ? 10 : 12, borderRadius: small ? 15 : 18, borderWidth: 1,
        borderColor: pressed ? '#ffc89f' : primary ? (tone === 'blue' ? '#dce8f5' : '#ffdfc9') : '#edf0f4',
        backgroundColor: primary ? (tone === 'blue' ? '#f6faff' : '#fff8f2') : '#ffffff',
        boxShadow: '0 3px 10px rgba(39,49,63,0.035)', transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <View style={{ width: size, height: size, borderRadius: small ? 12 : 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <Grad stops={s.stops} />
        <Icon name={icon} size={small ? 18 : 21} color="#ffffff" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: small ? 11.5 : 12, lineHeight: 15.5, fontWeight: '800', color: D.ink }} numberOfLines={2}>{title}</Text>
        <Text style={{ fontSize: 10, lineHeight: 13.5, color: '#7f8996', marginTop: 3 }} numberOfLines={2}>{sub}</Text>
      </View>
      {primary ? (
        <View style={{ width: 23, height: 23, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 7px rgba(34,44,58,0.06)' }}>
          <Icon name="arrowRight" size={12} color={s.arrow} strokeWidth={2} />
        </View>
      ) : null}
    </Press>
  );
}

/* Lays cards out two per row, like the web's 2-column service grid. */
export function TwoCol({ children, gap = 10 }) {
  const items = React.Children.toArray(children);
  const rows = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={{ gap }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', gap }}>
          {r}
          {r.length < 2 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

/* ── Get in Touch ──────────────────────────────────────────────────────── */

export function ContactPanel({ onWhatsApp, items, note }) {
  return (
    <View style={{ ...PANEL, padding: 12 }}>
      <Press
        onPress={onWhatsApp}
        accessibilityLabel="Chat with Paicart on WhatsApp"
        style={({ pressed }) => ({
          minHeight: 62, marginBottom: 11, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 10,
          borderRadius: 15, borderWidth: 1, borderColor: '#ccebd9', backgroundColor: pressed ? '#e0f6e9' : '#ebfbf2',
          boxShadow: '0 5px 15px rgba(32,145,86,0.10)',
        })}
      >
        <View style={{ width: 39, height: 39, borderRadius: 13, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <Grad stops={[[0, '#29c875'], [1, '#0da95a']]} />
          <Icon name="whatsapp" size={21} color="#ffffff" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: '#176b43' }}>Chat with us on WhatsApp</Text>
          <Text style={{ fontSize: 10.5, color: '#54836b', marginTop: 2 }}>Quick help from the Paicart support team</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#26945d' }}>↗</Text>
      </Press>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {items.map((s) => (
          <Press
            key={s.name}
            onPress={s.onPress}
            accessibilityLabel={s.label}
            style={({ pressed }) => ({
              flexBasis: '30%', flexGrow: 1, minHeight: 65, alignItems: 'center', justifyContent: 'center', gap: 6,
              borderRadius: 14, borderWidth: 1, borderColor: pressed ? '#ffd5b8' : '#edf0f4', backgroundColor: '#fcfcfd',
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: '#ffeadb', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={s.name} size={15} color="#df681c" />
            </View>
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#4d5968' }} numberOfLines={1}>{s.label}</Text>
          </Press>
        ))}
      </View>
      <Text style={{ marginTop: 10, marginHorizontal: 3, fontSize: 10.5, lineHeight: 15, color: D.muted, textAlign: 'center' }}>{note}</Text>
    </View>
  );
}

/* ── Recent Activity ───────────────────────────────────────────────────── */

const PAY_LABEL = { Paid: 'Paid', 'Partially Paid': 'Partially Paid', pending: 'Payment Pending', 'Not Paid': 'Unpaid' };

export function RecentCard({ kind, title, refLabel, reference, status, image, name, time, due, onDetails }) {
  const paid = status === 'Paid';
  const ship = kind === 'ship';
  return (
    <View style={{ overflow: 'hidden', borderWidth: 1, borderColor: '#e9edf1', borderRadius: 19, backgroundColor: '#ffffff', boxShadow: '0 3px 14px rgba(32,42,54,0.045)' }}>
      <View style={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f2f4' }}>
        <View style={{ width: 5, height: 22, borderRadius: 8, backgroundColor: ship ? '#0f9a8e' : '#f6741a' }} />
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#252b34', letterSpacing: -0.25 }}>{title}</Text>
      </View>
      <View style={{ paddingHorizontal: 12, paddingTop: 13, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
          <View style={{ flexShrink: 1, gap: 3 }}>
            <Text style={{ fontSize: 11, color: '#929ba6' }}>{refLabel}</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: ship ? '#00857A' : '#e62222', letterSpacing: 0.1 }} numberOfLines={1}>{reference}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 28, paddingHorizontal: 10, borderRadius: 999, backgroundColor: paid ? '#e1fbea' : '#f4eaff' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: paid ? '#159653' : '#7534d3' }} />
            <Text style={{ fontSize: 10, fontWeight: '800', color: paid ? '#159653' : '#7534d3' }}>{PAY_LABEL[status] || status}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 62, height: 62, borderRadius: 13, borderWidth: 1, borderColor: '#edf0f3', overflow: 'hidden', backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
            {image ? (
              <ProductImage uri={image} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Icon name={ship ? 'box' : 'bag'} size={30} color="#c3cad3" />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 12.5, lineHeight: 17, fontWeight: '700', color: '#202832' }} numberOfLines={2}>{name}</Text>
            <Text style={{ fontSize: 10, color: '#9099a5', marginTop: 4 }}>{formatDateTime(time)}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', gap: 7, marginTop: 4 }}>
          <Text style={{ fontSize: 10.5, color: '#929ba6' }}>Total Due</Text>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#18222d' }}>৳{enIN(Math.max(due, 0))}</Text>
        </View>

        <Press
          onPress={onDetails}
          style={({ pressed }) => ({ minHeight: 46, marginTop: 12, borderRadius: 13, borderWidth: 1, borderColor: '#e1e6eb', backgroundColor: pressed ? '#f6f7f9' : '#fcfcfd', alignItems: 'center', justifyContent: 'center' })}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#344050' }}>Details</Text>
        </Press>
      </View>
    </View>
  );
}

export function EmptyPanel({ children }) {
  return (
    <View style={{ ...PANEL, paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center' }}>
      <Text style={{ fontSize: 12, color: D.muted, textAlign: 'center' }}>{children}</Text>
    </View>
  );
}
