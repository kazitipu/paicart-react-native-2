import React from 'react';
import { View, Text, Linking } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { C, ORANGE, Press } from '@/components/product/ui';
import { fs } from '@/components/orders/OrderBits';
import { STATUS_BADGE } from '@/components/ui/StatusBadge';
import { SOFT_COLORS } from '@/components/ui/SoftPill';
import { READY_STATUS, READY_SEA_LABEL, isSeaShipment } from '@/lib/shipment';
import { TABS } from '@/navigation/routes';

/* ═══════════════════════════════════════════════════════════════════════
   Pieces of the web "My Product Requests" pages
   (pages/dashboard/buy-and-ship-for-me/my-request[/orderId], < 640px).
   Neither page has a scoped font shrink, so every size is plain Tailwind v4
   (fs(size) with shrink off).
   ═══════════════════════════════════════════════════════════════════════ */

/* ship-for-me/_shared SoftPill: `inline-flex items-center gap-1.5
   font-extrabold rounded-full` + the caller's size/padding. */
export function SoftPill({ color = 'gray', size = 10, px = 10, py = 4, children }) {
  const c = SOFT_COLORS[color] || SOFT_COLORS.gray;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: px,
        paddingVertical: py,
        borderRadius: 999,
        backgroundColor: c.bg,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={[fs(size), { fontWeight: '800', color: c.text }]}>{children}</Text>
    </View>
  );
}

/* _shared StatusBadge at < 640px: `text-[9px] px-2 py-0.5`. */
export function RequestStatusBadge({ status, req }) {
  const s = STATUS_BADGE[status] || { color: 'orange', label: status || 'Pending' };
  const label = status === READY_STATUS && isSeaShipment(req) ? READY_SEA_LABEL : s.label;
  return (
    <SoftPill color={s.color} size={9} px={8} py={2}>
      {label}
    </SoftPill>
  );
}

/* _shared PaymentBadge at < 640px. */
export function RequestPaymentBadge({ status }) {
  const val = status || 'Not Paid';
  const pill = (color, label) => (
    <SoftPill color={color} size={9} px={8} py={2}>
      {label}
    </SoftPill>
  );
  if (val === 'Paid') return pill('emerald', '✓ Paid');
  if (val === 'Partially Paid') return pill('amber', '◑ Partial');
  return pill('gray', '✕ Unpaid');
}

/* Collapsible header button: `w-full flex justify-between gap-2 bg-gray-50
   hover:bg-gray-100/80 rounded-xl px-3 py-2.5`, label text-xs bold gray-700,
   state text-[11px] bold orange + chevron 13. */
export function PanelToggle({ Icon, label, open, openLabel, closedLabel, onPress }) {
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: !!open }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        backgroundColor: pressed ? 'rgba(243,244,246,0.8)' : C.gray50,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
        <Icon size={14} color={C.gray400} />
        <Text style={[fs('xs'), { fontWeight: '700', color: C.gray700 }]}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[fs(11), { fontWeight: '700', color: ORANGE }]}>{open ? openLabel : closedLabel}</Text>
        {open ? <ChevronUp size={13} color={ORANGE} /> : <ChevronDown size={13} color={ORANGE} />}
      </View>
    </Press>
  );
}

/* A request's product link is whatever the customer pasted (1688, Taobao,
   any shop) and the web opens it in a new tab. A paicart.com product URL
   opens the app's own product screen instead. */
const PAICART_PRODUCT = /^https?:\/\/(?:www\.)?paicart\.com\/product\/([^/?#]+)/i;
export function openProductLink(navigation, url) {
  if (!url) return;
  const m = String(url).trim().match(PAICART_PRODUCT);
  if (m) {
    navigation.navigate(TABS.HOME, { screen: 'Product', params: { id: decodeURIComponent(m[1]) } });
    return;
  }
  const href = /^https?:\/\//i.test(String(url).trim()) ? String(url).trim() : `https://${String(url).trim()}`;
  Linking.openURL(href).catch(() => {});
}

/* ReorderLink kind 'request' → Book Again: Buy For Me pre-filled from the
   request (the web's /pages/buy-for-me?rebook=<bookingId>). */
export function openBookAgain(navigation, bookingId) {
  navigation.navigate(TABS.MORE, { screen: 'BuyForMe', params: { rebook: String(bookingId) } });
}

export function openNewRequest(navigation) {
  navigation.navigate(TABS.MORE, { screen: 'BuyForMe' });
}
