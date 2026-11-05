import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  ShoppingBag, Truck, CreditCard, Package, CheckCircle,
  Clock, Plane, Warehouse, Calculator, MessageCircle,
  Settings, Star, AlertCircle, RotateCcw, ChevronRight, Wallet, Copy, Check,
} from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import ComplaintModal from '@/components/ComplaintModal';
import Avatar from '@/components/Avatar';
import ProductImage from '@/components/ui/ProductImage';
import { C, SHADOW, ORANGE, Press } from '@/components/product/ui';
import { TS, RED, tpx } from '@/components/cart/CartBits';
import { toast } from '@/lib/toast';
import { getShippingMark } from '@/lib/shippingMark';
import { getBucketCounts, getLatestOfUser } from '@/lib/firebaseUtils';
import { ORDER_BUCKETS, SHIP_BUCKETS, isRefundGiven } from '@/lib/buckets';
import { canPayOrder } from '@/lib/orderMath';
import { canPayShipment } from '@/lib/shipForMe';
import { buyAgainProductId } from '@/lib/refund';
import { TABS } from '@/navigation/routes';
import { goHome } from '@/navigation/goHome';

/* ═══════════════════════════════════════════════════════════════════════
   Web pages/dashboard/page.jsx at < 640px, inside DashboardLayout
   `webChrome` (site Header + the "Overview" top bar). `space-y-4 pb-4`:
   the orange user banner (avatar + status badge, greeting, shipping mark
   copy, wallet pill), the two bucket-count strips, My Services, the most
   recent order and shipment, and "No orders yet" when every order bucket
   is empty. No scoped font shrink on this page — plain Tailwind v4 sizes.

   Like the web, the route has no sign-in gate: signed out it renders with
   "User", zero counts and no recent cards, and Complain sends to Login.
   ═══════════════════════════════════════════════════════════════════════ */

const TEAL = '#00857A';

/* Tailwind v3 palette values beyond ui.jsx's C. */
const P = {
  orange50: '#fff7ed',
  orange500: '#f97316',
  sky50: '#f0f9ff',
  sky500: '#0ea5e9',
  green50: '#f0fdf4',
  green500: '#22c55e',
  purple50: '#faf5ff',
  purple500: '#a855f7',
  yellow50: '#fefce8',
  yellow500: '#eab308',
};

/* `status` is set by admin (changeUserStatusModal):
   "Vip Partner" | "Corporate" | "Merchant" | "Customer" (the default). */
const STATUS_LABEL = { 'vip partner': 'VIP Partner', corporate: 'Corporate', merchant: 'Merchant', customer: 'Customer' };
const statusLabel = (s) => STATUS_LABEL[String(s || '').trim().toLowerCase()] || (s ? String(s) : 'Customer');

const getRecentOrder = (orders) => [...orders].sort((a, b) => (b.time || 0) - (a.time || 0))[0] || null;

/* The page's own due figure (not orderMath's): goods + shipping − paid. */
const getTotalDue = (order) => {
  const paid = (order.payments || []).reduce((s, p) => s + parseInt(p.amount || 0, 10), 0);
  let total = 0;
  order.items?.forEach((item) =>
    item.skus?.forEach((sku) => {
      total += parseInt(parseFloat(sku.price || 0) * parseInt(sku.totalQuantity || 0, 10), 10);
    }),
  );
  const goods = order.orderTotal ? parseInt(order.orderTotal, 10) : total;
  const shipping = parseInt(order.shippingChargeCustomer || 0, 10);
  return Math.max(0, goods + shipping - paid);
};

/* ReorderLink's reorderHref(record, 'order'): only once a refund has been
   given, to the first item's product page. */
const reorderProductId = (order) => (isRefundGiven(order) ? buyAgainProductId(order) : null);

/* new Date(ms).toLocaleString('en-BD') → "04/11/2026, 3:05:09 pm" (en-BD
   formats like en-001; Hermes has no such locale data, so it is spelled out). */
const enBDDateTime = (ms) => {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  const h = d.getHours();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${h % 12 || 12}:${pad(d.getMinutes())}:${pad(
    d.getSeconds(),
  )} ${h < 12 ? 'am' : 'pm'}`;
};

const CARD = {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: C.gray100,
  boxShadow: SHADOW.base,
  overflow: 'hidden',
};

/* A number that counts up to its new value (a stat badge refreshing). */
function CountUp({ value, style }) {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  useEffect(() => {
    const from = shownRef.current;
    if (from === value) return undefined;
    const t0 = Date.now();
    let raf;
    const step = () => {
      const p = Math.min(1, (Date.now() - t0) / 500);
      const v = Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3)));
      shownRef.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <Text style={style}>{shown}</Text>;
}

/* `flex items-center justify-between px-4 py-3 border-b border-gray-50`:
   a w-1 h-4 bar, the title (text-sm bold) and an optional text-[10px] note. */
function SectionHead({ bar = ORANGE, title, note, right }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: C.gray50,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
        <View style={{ width: 4, height: 16, borderRadius: 999, backgroundColor: bar }} />
        <Text style={[TS.sm, { fontWeight: '700', color: C.gray800 }]}>{title}</Text>
        {note ? (
          <Text style={[tpx(10), { color: C.gray400, flexShrink: 1 }]} numberOfLines={1}>
            {note}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/* "All Orders ›" — text-[11px] font-semibold text-[#e62222] */
function HeadLink({ label, onPress }) {
  return (
    <Press onPress={onPress} hitSlop={8} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 2, opacity: pressed ? 0.6 : 1 })}>
      {({ pressed }) => (
        <>
          <Text style={[tpx(11), { fontWeight: '600', color: RED, textDecorationLine: pressed ? 'underline' : 'none' }]}>{label}</Text>
          <ChevronRight size={12} color={RED} />
        </>
      )}
    </Press>
  );
}

/* StatCard: `flex-1 min-w-[72px] flex-col items-center gap-1.5 bg-white
   rounded-2xl py-4 px-2 shadow-sm border border-gray-100`, a w-11 h-11
   tinted icon tile with the count badge on its corner, a text-[10px] label. */
function StatCard({ Icon, label, count, color, bg, badge, onPress }) {
  return (
    <Press
      onPress={onPress}
      style={({ pressed }) => ({
        flexGrow: 1,
        flexBasis: 0,
        minWidth: 72,
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: C.gray100,
        boxShadow: pressed ? SHADOW.md : SHADOW.base,
      })}
    >
      <View>
        <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
          <Icon size={20} color={color} />
        </View>
        <View
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: badge,
          }}
        >
          <CountUp value={count} style={[tpx(10), { fontWeight: '800', color: '#ffffff' }]} />
        </View>
      </View>
      <Text style={{ fontSize: 10, lineHeight: 12.5, color: C.gray500, textAlign: 'center' }}>{label}</Text>
    </Press>
  );
}

/* `flex gap-2 p-3 overflow-x-auto` — one row, scrolling sideways on a phone. */
function StatStrip({ children }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ flexGrow: 1, gap: 8, padding: 12 }}
    >
      {children}
    </ScrollView>
  );
}

/* ServiceBtn: `flex-col items-center gap-1.5 py-3 px-1 rounded-2xl`, a w-12
   h-12 tinted tile, text-[11px] font-medium gray-600 leading-tight. */
function ServiceBtn({ Icon, label, color, bg, onPress }) {
  return (
    <Press
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderRadius: 16,
        backgroundColor: pressed ? C.gray50 : 'transparent',
      })}
    >
      <View style={{ width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
        <Icon size={22} color={color} />
      </View>
      <Text style={{ fontSize: 11, lineHeight: 13.75, fontWeight: '500', color: C.gray600, textAlign: 'center' }}>{label}</Text>
    </Press>
  );
}

/* `text-[10px] font-bold px-3 py-1 rounded-full` */
function Badge({ badge }) {
  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: badge.bg }}>
      <Text style={[tpx(10), { fontWeight: '700', color: badge.fg }]}>{badge.label}</Text>
    </View>
  );
}

const orderBadge = (o) => {
  const ps = o.paymentStatus;
  if ((o.orderStatus || '').toLowerCase() === 'reject') return { label: 'Rejected', bg: '#fdeaea', fg: '#F5222D' };
  if (ps === 'Paid') return { label: 'Paid', bg: '#dcfce7', fg: '#16a34a' };
  if (ps === 'pending') return { label: 'Payment Pending', bg: '#f3e8ff', fg: '#7c3aed' };
  if (ps === 'Partially Paid') return { label: 'Partially Paid', bg: '#fff7ed', fg: '#ea580c' };
  return { label: 'Not Paid', bg: '#fff7ed', fg: '#ea580c' };
};

const shipBadge = (r) => {
  const st = r.status;
  const ps = r.paymentStatus;
  if (st === 'Reject' || st === 'Cancelled') return { label: 'Rejected', bg: '#fdeaea', fg: '#F5222D' };
  if (ps === 'Paid') return { label: 'Paid', bg: '#dcfce7', fg: '#16a34a' };
  if (r.paymentRequested || ps === 'pending') return { label: 'Payment Pending', bg: '#f3e8ff', fg: '#7c3aed' };
  if (ps === 'Partially Paid') return { label: 'Partially Paid', bg: '#fff7ed', fg: '#ea580c' };
  if (!r.shippingChargeCustomer) return { label: st || 'Pending', bg: '#fef6e0', fg: '#8a5a06' };
  return { label: 'Not Paid', bg: '#fff7ed', fg: '#ea580c' };
};

/* w-14 h-14 rounded-xl picture, or a gray-100 tile with the fallback icon. */
function Thumb({ uri, Fallback, thumb }) {
  if (!uri) {
    return (
      <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: C.gray100, alignItems: 'center', justifyContent: 'center' }}>
        <Fallback size={20} color={C.gray400} />
      </View>
    );
  }
  return (
    <View style={{ width: 56, height: 56, borderRadius: 12, borderWidth: 1, borderColor: C.gray100, overflow: 'hidden' }}>
      <ProductImage uri={uri} thumb={thumb} style={{ width: '100%', height: '100%' }} />
    </View>
  );
}

/* Details — `py-2.5 rounded-xl border border-gray-200 text-sm font-semibold
   text-gray-700`; the orange ones — `py-2.5 rounded-xl text-white text-sm
   font-bold` on #FF6A00. */
function ActionBtn({ kind, label, Icon, onPress }) {
  const outline = kind === 'outline';
  return (
    <Press
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        ...(outline
          ? { borderWidth: 1, borderColor: C.gray200, backgroundColor: pressed ? C.gray50 : '#ffffff' }
          : { backgroundColor: ORANGE, opacity: pressed ? 0.9 : 1 }),
      })}
    >
      {Icon ? <Icon size={14} color="#ffffff" /> : null}
      <Text style={[TS.sm, { fontWeight: outline ? '600' : '700', color: outline ? C.gray700 : '#ffffff' }]}>{label}</Text>
    </Press>
  );
}

/* `grid gap-2 grid-cols-2` (or cols-1 when Details is alone). */
function ActionGrid({ actions }) {
  const cols = actions.length > 1 ? 2 : 1;
  const rows = [];
  for (let i = 0; i < actions.length; i += cols) rows.push(actions.slice(i, i + cols));
  return (
    <View style={{ gap: 8 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((a) => (
            <ActionBtn key={a.label} {...a} />
          ))}
          {row.length < cols ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}

/* The body of a "Recent Active" card (`p-4`). */
function RecentBody({ idLabel, id, idColor, badge, thumb, name, time, due, actions }) {
  return (
    <View style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <View style={{ flexShrink: 1 }}>
          <Text style={[tpx(10), { color: C.gray400, fontWeight: '500' }]}>{idLabel}</Text>
          <Text style={[TS.sm, { fontWeight: '700', color: idColor }]}>{id}</Text>
        </View>
        <Badge badge={badge} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        {thumb}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 14, lineHeight: 19.25, fontWeight: '600', color: C.gray800 }} numberOfLines={2}>
            {name}
          </Text>
          <Text style={[tpx(10), { color: C.gray400, marginTop: 2 }]}>{time ? enBDDateTime(time) : ''}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <Text style={[tpx(10), { color: C.gray400 }]}>Total Due</Text>
          <Text style={[TS.sm, { fontWeight: '800', color: C.gray800 }]}>{due}</Text>
        </View>
      </View>

      <ActionGrid actions={actions} />
    </View>
  );
}

export default function DashboardOverview() {
  const navigation = useNavigation();
  const currentUser = useSelector((s) => s.user?.currentUser);
  const ordersApi = useSelector((s) => s.orders?.ordersApi || []);
  /* Same store key the ship-for-me request list fills */
  const shipForMeList = useSelector((s) => s.bookingRequests?.shipForMeOfSingleUser || []);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const uid = currentUser?.id;

  const openComplaint = () => {
    if (!uid) {
      toast.error('Please login first');
      navigation.navigate('Login', { returnTo: 'DashboardOverview' });
      return;
    }
    setComplaintOpen(true);
  };

  const shippingMark = getShippingMark(currentUser);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  const copyShippingMark = () => {
    try {
      Clipboard.setString(shippingMark);
      toast.success('Shipping mark copied');
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  /* Tab counts are server-side aggregates on the `bucket` field the Cloud
     Function stamps on every document (lib/buckets.js); the newest order /
     shipment are one doc each, falling back to whatever lists are already
     in the store if that query fails. The web refetched on every visit; a
     stack keeps this screen mounted, so it refetches whenever it regains
     focus (back from paying, say), and on pull-to-refresh. */
  const [counts, setCounts] = useState(null);
  const [latest, setLatest] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const gen = useRef(0);

  useEffect(() => {
    setCounts(null);
    setLatest(null);
  }, [uid]);

  const load = useCallback(() => {
    if (!uid) return Promise.resolve();
    const g = ++gen.current;
    const latestOf = (name) =>
      getLatestOfUser(name, uid).catch((error) => {
        console.error(`latest(${name})`, error);
        return undefined;
      });
    return Promise.all([
      Promise.all([getBucketCounts('ordersApi', uid, ORDER_BUCKETS), getBucketCounts('shipForMe', uid, SHIP_BUCKETS)]).then(
        ([orders, ship]) => {
          if (g === gen.current) setCounts({ orders, ship });
        },
      ),
      Promise.all([latestOf('ordersApi'), latestOf('shipForMe')]).then(([order, ship]) => {
        if (g === gen.current) setLatest({ order, ship });
      }),
    ]).catch(() => {});
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }, [load]);

  const oc = counts?.orders || {};
  const sc = counts?.ship || {};

  const storeRecentOrder = useMemo(() => getRecentOrder(ordersApi), [ordersApi]);
  const storeRecentShip = useMemo(() => getRecentOrder(shipForMeList), [shipForMeList]);
  const recentOrder = latest?.order !== undefined ? latest?.order : storeRecentOrder;
  const recentShip = latest?.ship !== undefined ? latest?.ship : storeRecentShip;

  const toOrders = (tab) => navigation.navigate('BuyShipMyOrders', tab ? { tab } : undefined);
  const toShips = (tab) => navigation.navigate('ShipMyRequests', tab ? { tab } : undefined);
  const toMore = (screen) => navigation.navigate(TABS.MORE, { screen });

  let orderCard = null;
  if (recentOrder) {
    const item = recentOrder.items?.[0];
    const img = item?.imgUrl || item?.picture || item?.pictures?.[0] || item?.skus?.[0]?.image || '';
    const openDetail = () => navigation.navigate('BuyShipOrderDetail', { orderId: recentOrder.orderId });
    const reorderId = reorderProductId(recentOrder);
    const actions = [{ kind: 'outline', label: 'Details', onPress: openDetail }];
    if (canPayOrder(recentOrder)) actions.push({ label: 'Pay Now', onPress: openDetail });
    if (reorderId) {
      actions.push({
        label: 'Buy Again',
        Icon: RotateCcw,
        onPress: () => navigation.navigate(TABS.HOME, { screen: 'Product', params: { id: reorderId } }),
      });
    }
    orderCard = (
      <Animated.View entering={FadeIn.duration(220)} style={CARD}>
        <SectionHead title="Recent Active Order" />
        <RecentBody
          idLabel="Order ID"
          id={recentOrder.orderId}
          idColor={RED}
          badge={orderBadge(recentOrder)}
          thumb={<Thumb uri={img} Fallback={Package} thumb />}
          name={item?.name || item?.productName || ''}
          time={recentOrder.time}
          due={`৳${getTotalDue(recentOrder).toLocaleString()}`}
          actions={actions}
        />
      </Animated.View>
    );
  }

  let shipCard = null;
  if (recentShip) {
    const shipDue = Math.max(
      0,
      (parseInt(recentShip.shippingChargeCustomer, 10) || 0) -
        (recentShip.payments || []).reduce((a, p) => a + (parseInt(p.amount, 10) || 0), 0),
    );
    const openDetail = () => navigation.navigate('ShipRequestDetail', { bookingId: recentShip.bookingId });
    const actions = [{ kind: 'outline', label: 'Details', onPress: openDetail }];
    if (canPayShipment(recentShip)) actions.push({ label: 'Pay Now', onPress: openDetail });
    shipCard = (
      <Animated.View entering={FadeIn.duration(220)} style={CARD}>
        <SectionHead bar={TEAL} title="Recent Active Shipment" />
        <RecentBody
          idLabel="Booking ID"
          id={`PC-${recentShip.bookingId}`}
          idColor={TEAL}
          badge={shipBadge(recentShip)}
          thumb={<Thumb uri={recentShip.imageUrl} Fallback={Truck} />}
          name={recentShip.othersProductName || 'Shipment request'}
          time={recentShip.time}
          due={recentShip.shippingChargeCustomer ? `৳${shipDue.toLocaleString()}` : '__'}
          actions={actions}
        />
      </Animated.View>
    );
  }

  const noOrders = counts && Object.values(counts.orders).every((n) => n === 0);

  return (
    <DashboardLayout
      webChrome
      title="Overview"
      onRefresh={uid ? onRefresh : null}
      refreshing={refreshing}
      overlays={<ComplaintModal visible={complaintOpen} currentUser={currentUser} onClose={() => setComplaintOpen(false)} />}
    >
      <View style={{ gap: 16, paddingBottom: 16 }}>
        {/* ── User banner ── */}
        <View style={{ borderRadius: 16, padding: 16, backgroundColor: ORANGE, overflow: 'hidden' }}>
          <View
            pointerEvents="none"
            style={{ position: 'absolute', right: -24, top: -24, width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(255,255,255,0.1)' }}
          />
          <View
            pointerEvents="none"
            style={{ position: 'absolute', right: -8, bottom: 0, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)' }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            {/* Badge under the avatar, so a long name keeps the row. */}
            <View style={{ alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <Avatar user={currentUser} editable textStyle={{ fontSize: 24, lineHeight: 32 }} />
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.3)',
                  borderRadius: 999,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 8, lineHeight: 8, fontWeight: '700', color: '#ffffff' }} numberOfLines={1}>
                  {statusLabel(currentUser?.status)}
                </Text>
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[TS.base, { fontWeight: '700', color: '#ffffff', marginBottom: 2 }]} numberOfLines={1}>
                {currentUser?.displayName || 'User'}
              </Text>
              <Text style={[TS.xs, { color: 'rgba(255,255,255,0.8)' }]}>{greeting}!</Text>
              <Text style={[tpx(10), { color: 'rgba(255,255,255,0.6)' }]} numberOfLines={1}>
                {currentUser?.email || ''}
              </Text>
              {shippingMark ? (
                <Press
                  onPress={copyShippingMark}
                  accessibilityLabel="Copy shipping mark"
                  style={({ pressed }) => ({
                    marginTop: 6,
                    alignSelf: 'flex-start',
                    maxWidth: '100%',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: pressed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.25)',
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  })}
                >
                  <Text style={[tpx(9), { color: 'rgba(255,255,255,0.7)', flexShrink: 0 }]}>Shipping Mark</Text>
                  <Text style={[tpx(11), { fontWeight: '700', color: '#ffffff', flexShrink: 1 }]} numberOfLines={1}>
                    {shippingMark}
                  </Text>
                  {copied ? (
                    <Animated.View entering={FadeIn.duration(150)}>
                      <Check size={11} color="#ffffff" />
                    </Animated.View>
                  ) : (
                    <Copy size={11} color="rgba(255,255,255,0.7)" />
                  )}
                </Press>
              ) : null}
            </View>
          </View>

          {/* Wallet pill */}
          <View
            style={{
              marginTop: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(0,0,0,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.1)',
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Wallet size={16} color="rgba(255,255,255,0.7)" />
              <Text style={[TS.sm, { fontWeight: '500', color: 'rgba(255,255,255,0.8)' }]}>Paicart Wallet</Text>
            </View>
            <Text style={[TS.sm, { fontWeight: '700', color: 'rgba(255,255,255,0.9)' }]}>৳0.00</Text>
          </View>
        </View>

        {/* ── Buy & Ship for me stats ── */}
        <View style={CARD}>
          <SectionHead
            title="Buy & Ship for me"
            note="(Website Order)"
            right={<HeadLink label="All Orders" onPress={() => toOrders()} />}
          />
          <StatStrip>
            <StatCard Icon={CreditCard} label="To Pay" count={oc['To Pay'] ?? 0} color={RED} bg={C.red50} badge={RED} onPress={() => toOrders('To Pay')} />
            <StatCard Icon={Package} label="To Ship" count={oc['To Ship'] ?? 0} color={P.orange500} bg={P.orange50} badge={P.orange500} onPress={() => toOrders('To Ship')} />
            <StatCard Icon={Plane} label="In Shipment" count={oc['In Shipment'] ?? 0} color={P.sky500} bg={P.sky50} badge={P.sky500} onPress={() => toOrders('In Shipment')} />
            <StatCard Icon={Warehouse} label="To Receive" count={oc['To Receive'] ?? 0} color={C.blue500} bg={C.blue50} badge={C.blue500} onPress={() => toOrders('To Receive')} />
            <StatCard Icon={CheckCircle} label="Delivered" count={oc.Delivered ?? 0} color={P.green500} bg={P.green50} badge={P.green500} onPress={() => toOrders('Delivered')} />
          </StatStrip>
        </View>

        {/* ── Ship for me stats ── */}
        <View style={CARD}>
          <SectionHead
            title="Ship for me"
            note="(Only Shipment)"
            /* The web's "All Shipments" link carries ?tab=Delivered. */
            right={<HeadLink label="All Shipments" onPress={() => toShips('Delivered')} />}
          />
          <StatStrip>
            <StatCard Icon={Clock} label="Pending" count={sc.Pending ?? 0} color={C.amber500} bg={C.amber50} badge={C.amber500} onPress={() => toShips('Pending')} />
            <StatCard Icon={Warehouse} label="Approved" count={sc.Approved ?? 0} color={P.purple500} bg={P.purple50} badge={P.purple500} onPress={() => toShips('Approved')} />
            <StatCard Icon={Truck} label="In Shipment" count={sc['In Shipment'] ?? 0} color={P.sky500} bg={P.sky50} badge={P.sky500} onPress={() => toShips('In Shipment')} />
            <StatCard Icon={Warehouse} label="To Receive" count={sc['To Receive'] ?? 0} color={C.blue500} bg={C.blue50} badge={C.blue500} onPress={() => toShips('To Receive')} />
            <StatCard Icon={CheckCircle} label="Delivered" count={sc.Delivered ?? 0} color={P.green500} bg={P.green50} badge={P.green500} onPress={() => toShips('Delivered')} />
          </StatStrip>
        </View>

        {/* ── My Services ── `grid grid-cols-4 gap-1 p-3` */}
        <View style={CARD}>
          <SectionHead title="My Services" />
          <View style={{ padding: 12, gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <ServiceBtn Icon={Calculator} label="Cost Calc" color={RED} bg={C.red50} onPress={() => toMore('CostCalculator')} />
              <ServiceBtn Icon={ShoppingBag} label="Buy For Me" color={P.orange500} bg={P.orange50} onPress={() => toMore('BuyForMe')} />
              <ServiceBtn Icon={Truck} label="Ship For Me" color={C.blue500} bg={C.blue50} onPress={() => toMore('ShipForMeForm')} />
              <ServiceBtn Icon={RotateCcw} label="Refund" color={P.purple500} bg={P.purple50} onPress={() => navigation.navigate('Refunds')} />
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <ServiceBtn Icon={MessageCircle} label="Support" color={P.green500} bg={P.green50} onPress={() => toMore('Contact')} />
              <ServiceBtn Icon={AlertCircle} label="Complain" color={C.amber500} bg={C.amber50} onPress={openComplaint} />
              <ServiceBtn Icon={Star} label="Points" color={P.yellow500} bg={P.yellow50} onPress={() => navigation.navigate('Points')} />
              <ServiceBtn Icon={Settings} label="Settings" color={C.gray500} bg={C.gray100} onPress={() => navigation.navigate('UserInformation')} />
            </View>
          </View>
        </View>

        {orderCard}
        {shipCard}

        {/* Empty state */}
        {noOrders ? (
          <Animated.View entering={FadeIn.duration(220)} style={[CARD, { padding: 32, alignItems: 'center', gap: 12 }]}>
            <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: C.red50, alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={28} color={RED} />
            </View>
            <Text style={[TS.base, { fontWeight: '700', color: C.gray700, textAlign: 'center' }]}>No orders yet</Text>
            <Text style={[TS.xs, { color: C.gray400, textAlign: 'center' }]}>
              Start shopping from Taobao or 1688 and your orders will appear here.
            </Text>
            <Press
              onPress={goHome}
              style={({ pressed }) => ({
                marginTop: 4,
                paddingHorizontal: 24,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: ORANGE,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={[TS.sm, { fontWeight: '700', color: '#ffffff' }]}>Start Shopping</Text>
            </Press>
          </Animated.View>
        ) : null}
      </View>
    </DashboardLayout>
  );
}
