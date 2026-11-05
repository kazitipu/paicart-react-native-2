import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Search, ChevronDown, ShoppingBag, ArrowRight } from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import MyOrderCard from '@/components/orders/MyOrderCard';
import { fs } from '@/components/orders/OrderBits';
import OrderPaymentModal from '@/components/OrderPaymentModal';
import RefundApplyModal from '@/components/RefundApplyModal';
import { PickerSheet } from '@/components/profile/ProfileBits';
import { C, SHADOW, ORANGE, Press, ScalePress, Spinner } from '@/components/product/ui';
import { getAllOrdersApiRedux, cancelUnpaidOrderRedux } from '@/store/actions';
import { getAllPartials } from '@/lib/firebaseUtils';
import { activePartialFrom } from '@/lib/partialOffers';
import { STATUS_TABS, matchesTab, expiredUnpaidOrders } from '@/lib/orderTabs';
import { canPayOrder, getTotalDue } from '@/lib/orderMath';
import { refundMode } from '@/lib/refund';
import { setJSON, KEYS } from '@/lib/storage';
import { toast } from '@/lib/toast';
import { TABS } from '@/navigation/routes';
import { goHome } from '@/navigation/goHome';

/* ═══════════════════════════════════════════════════════════════════════
   Web pages/dashboard/buy-and-ship-for-me/my-orders/page.jsx at < 640px.
   DashboardLayout `webChrome` (site Header + the dashboard top bar with
   "Select All" as its action), then inside `.myorders-root` (type shrunk —
   S below): search + two selects on gray-50, the bucket tabs, the cards,
   the fixed combined-pay bar. The web BottomNav DashboardLayout renders
   here is the app's tab bar, which stays visible.
   ═══════════════════════════════════════════════════════════════════════ */

const S = true;
const BODY = '#1e293b';
const PLACEHOLDER = 'rgba(30,41,59,0.5)';

const DATE_OPTIONS = [
  { value: '', label: 'Order Date' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last Week' },
  { value: 'month', label: 'Last Month' },
  { value: '6months', label: 'Last 6 Months' },
];
const PAY_OPTIONS = [
  { value: '', label: 'Payment Status' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Partially Paid', label: 'Partially Paid' },
  { value: 'unpaid', label: 'Not Paid' },
  { value: 'pending', label: 'Payment Pending' },
];

/* `flex gap-5 overflow-x-auto pb-0.5 border-b border-gray-100`; each tab
   `pb-2.5 text-sm font-semibold border-b-2 -mb-px` with its count. The
   active underline slides between tabs (a non-tappable indicator). */
function StatusTabs({ value, counts, onChange }) {
  const layouts = useRef({});
  const scrollRef = useRef(null);
  const viewW = useRef(0);
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const [measured, setMeasured] = useState(false);

  const place = useCallback(
    (tab, animate) => {
      const l = layouts.current[tab];
      if (!l) return;
      const cfg = { duration: 240, easing: Easing.out(Easing.cubic) };
      x.value = animate ? withTiming(l.x, cfg) : l.x;
      w.value = animate ? withTiming(l.width, cfg) : l.width;
      if (animate && viewW.current) {
        scrollRef.current?.scrollTo({ x: Math.max(0, l.x - (viewW.current - l.width) / 2), animated: true });
      }
    },
    [x, w],
  );

  useEffect(() => {
    place(value, true);
  }, [value, place]);

  const indicator = useAnimatedStyle(() => ({ left: x.value, width: w.value }));

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(e) => {
        viewW.current = e.nativeEvent.layout.width;
      }}
      style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: C.gray100 }}
      contentContainerStyle={{ gap: 20, paddingBottom: 1 }}
    >
      {STATUS_TABS.map((tab) => {
        const active = value === tab;
        return (
          <Press
            key={tab}
            onPress={() => onChange(tab)}
            onLayout={(e) => {
              layouts.current[tab] = e.nativeEvent.layout;
              if (tab === value) {
                place(tab, false);
                if (!measured) setMeasured(true);
              }
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 12, flexShrink: 0 }}
          >
            {({ pressed }) => (
              <>
                <Text style={[fs('sm', S), { fontWeight: '600', color: active ? ORANGE : pressed ? C.gray700 : C.gray500 }]}>
                  {tab}
                </Text>
                {counts[tab] > 0 && (
                  <View
                    style={{
                      minWidth: 20,
                      height: 20,
                      paddingHorizontal: 6,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active ? ORANGE : C.gray100,
                    }}
                  >
                    <Text style={[fs('xs', S), { fontWeight: '700', color: active ? '#ffffff' : C.gray500 }]}>{counts[tab]}</Text>
                  </View>
                )}
              </>
            )}
          </Press>
        );
      })}
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', bottom: 1, height: 2, backgroundColor: ORANGE, opacity: measured ? 1 : 0 }, indicator]}
      />
    </ScrollView>
  );
}

/* `w-full appearance-none border-2 border-gray-200 rounded-full pl-4 pr-8
   py-2 text-sm font-bold text-gray-800 bg-white` + ChevronDown 15. */
function SelectPill({ label, open, onPress }) {
  return (
    <Press
      onPress={onPress}
      style={{
        flex: 1,
        height: fs('sm', S).lineHeight + 20,
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: open ? ORANGE : C.gray200,
        borderRadius: 999,
        paddingLeft: 16,
        paddingRight: 32,
        backgroundColor: '#ffffff',
      }}
    >
      <Text style={[fs('sm', S), { fontWeight: '700', color: C.gray800 }]} numberOfLines={1}>
        {label}
      </Text>
      <View pointerEvents="none" style={{ position: 'absolute', right: 12 }}>
        <ChevronDown size={15} color={C.gray400} />
      </View>
    </Press>
  );
}

export default function BuyShipMyOrders() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.user?.currentUser);
  const orders = useSelector((s) => s.orders?.ordersApi || []);

  /* Arriving from a dashboard stat card lands on that card's tab. */
  const tabParam = route.params?.tab;
  const [activeTab, setActiveTab] = useState(() => (STATUS_TABS.includes(tabParam) ? tabParam : 'All'));
  useEffect(() => {
    if (tabParam && STATUS_TABS.includes(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterPay, setFilterPay] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [picker, setPicker] = useState(null); // 'date' | 'pay'
  const [payTarget, setPayTarget] = useState(null); // array of orders being paid
  const [refundTarget, setRefundTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [loaded, setLoaded] = useState(orders.length > 0);
  const [refreshing, setRefreshing] = useState(false);

  const refreshOrders = useCallback(
    () => (currentUser?.id ? Promise.resolve(dispatch(getAllOrdersApiRedux(currentUser.id))) : Promise.resolve()),
    [currentUser?.id, dispatch],
  );

  useEffect(() => {
    refreshOrders().finally(() => setLoaded(true));
  }, [refreshOrders]);

  /* "Pay More, Get More" config — the same admin-managed offer the
     pre-payment modal uses, so an order paid later can still take it. */
  const [partials, setPartials] = useState([]);
  useEffect(() => {
    getAllPartials()
      .then((list) => setPartials(list || []))
      .catch(() => {});
  }, []);
  const activePartial = activePartialFrom(partials);

  /* Auto-cancel sweep, exactly as the web: an order sitting completely unpaid
     past its 72h window is marked cancelled (orderStatus 'reject',
     autoCancelled) — kept on record under Rejected. Client-side: there is no
     server cron, so an order is only swept once a client loads this list
     with it present. The ref only stops the same id being written twice
     while its first write is still in flight. */
  const cancelling = useRef(new Set());
  useEffect(() => {
    expiredUnpaidOrders(orders).forEach((o) => {
      if (cancelling.current.has(o.orderId)) return;
      cancelling.current.add(o.orderId);
      Promise.resolve(dispatch(cancelUnpaidOrderRedux(o.orderId, 'unpaid-window-expired'))).finally(() =>
        cancelling.current.delete(o.orderId),
      );
    });
  }, [orders, dispatch]);

  const openProduct = useCallback(
    (id) => navigation.navigate(TABS.HOME, { screen: 'Product', params: { id } }),
    [navigation],
  );

  /* Buy Again — seed each item's product page with the previous selection
     (the same pending-selection restore the post-login return uses) and send
     the customer there, so today's price is pulled live before anything is
     added or ordered. The web opened every further item in its own browser
     tab; a phone has one stack, so the first opens and the rest keep their
     seeded selection for when they are opened. */
  const handleBuyAgain = useCallback(
    (order) => {
      const items = (order.items || []).filter((item) => item?.id);
      if (items.length === 0) {
        toast.error('No items found to buy again.');
        return;
      }
      items.forEach((item) => {
        const skuQtys = {};
        let simpleQty = 0;
        (item.skus || []).forEach((sku) => {
          const qty = parseInt(sku.totalQuantity, 10) || 0;
          if (sku.properties) skuQtys[sku.properties] = qty;
          else simpleQty += qty;
        });
        setJSON(KEYS.pendingProduct(item.id), { skuQtys, simpleQty, intent: 'order' });
      });
      if (items.length > 1) {
        toast.info(`Reopening ${items.length} products with your previous selections so you can confirm today's price.`);
      }
      openProduct(items[0].id);
    },
    [openProduct],
  );

  const filtered = useMemo(() => {
    let list = orders.filter((o) => matchesTab(o, activeTab));
    if (filterPay === 'Paid') list = list.filter((o) => o.paymentStatus === 'Paid');
    if (filterPay === 'Partially Paid') list = list.filter((o) => o.paymentStatus === 'Partially Paid');
    if (filterPay === 'unpaid') list = list.filter((o) => !o.paymentStatus || o.paymentStatus === 'purchaseLater');
    if (filterPay === 'pending') list = list.filter((o) => o.paymentStatus === 'pending');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (o) =>
          String(o.orderId || '').toLowerCase().includes(q) ||
          (o.shopName || '').toLowerCase().includes(q) ||
          (o.trackingNo || '').toLowerCase().includes(q) ||
          o.items?.some(
            (item) => (item.name || '').toLowerCase().includes(q) || (item.productType || '').toLowerCase().includes(q),
          ),
      );
    }
    if (dateFilter) {
      const now = Date.now();
      const startOfToday = new Date().setHours(0, 0, 0, 0);
      const cutoff =
        dateFilter === 'today'
          ? startOfToday
          : dateFilter === 'week'
            ? now - 7 * 24 * 60 * 60 * 1000
            : dateFilter === 'month'
              ? now - 30 * 24 * 60 * 60 * 1000
              : dateFilter === '6months'
                ? now - 182 * 24 * 60 * 60 * 1000
                : 0;
      list = list.filter((o) => (o.time || 0) >= cutoff);
    }
    return [...list].sort((a, b) => (b.time || 0) - (a.time || 0));
  }, [orders, activeTab, filterPay, searchQuery, dateFilter]);

  const tabCounts = useMemo(
    () =>
      Object.fromEntries(
        STATUS_TABS.map((t) => [t, t === 'All' ? orders.length : orders.filter((o) => matchesTab(o, t)).length]),
      ),
    [orders],
  );

  const toggleSelect = useCallback((orderId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }, []);

  /* "Select All" applies to the payable orders in view. */
  const payableVisible = useMemo(() => filtered.filter(canPayOrder), [filtered]);
  const allVisibleSelected = payableVisible.length > 0 && payableVisible.every((o) => selectedIds.has(o.orderId));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return new Set();
      const next = new Set(prev);
      payableVisible.forEach((o) => next.add(o.orderId));
      return next;
    });
  };

  /* Only orders payable right now count toward the combined total. */
  const selectedOrders = useMemo(() => orders.filter((o) => selectedIds.has(o.orderId) && canPayOrder(o)), [orders, selectedIds]);
  const combinedDue = selectedOrders.reduce((a, o) => a + Math.max(0, getTotalDue(o)), 0);

  /* Drop anything since paid, rejected or under payment review. */
  useEffect(() => {
    setSelectedIds((prev) => {
      const payable = new Set(orders.filter(canPayOrder).map((o) => o.orderId));
      const next = new Set([...prev].filter((id) => payable.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [orders]);

  /* Web handlePaySuccess: refresh, and drop only the orders that were just
     paid from the selection — other checked orders survive. The sheet
     closes itself right after (onClose). */
  const handlePaySuccess = () => {
    refreshOrders();
    if (payTarget) {
      const paidIds = new Set(payTarget.map((o) => o.orderId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paidIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    refreshOrders().finally(() => setRefreshing(false));
  };

  const onPayNow = useCallback((o) => setPayTarget([o]), []);
  const onOpen = useCallback((o) => navigation.navigate('BuyShipOrderDetail', { orderId: o.orderId }), [navigation]);
  const onInvoice = useCallback(
    (o) => navigation.navigate('OrderInvoice', { bookingId: o.orderId, kind: 'order' }),
    [navigation],
  );

  const headerAction =
    payableVisible.length > 0 ? (
      <Press
        onPress={toggleSelectAll}
        style={({ pressed }) => ({
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 999,
          flexShrink: 0,
          backgroundColor: '#fff1e6',
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={[fs('xs'), { fontWeight: '700', color: ORANGE }]}>{allVisibleSelected ? 'Deselect All' : 'Select All'}</Text>
      </Press>
    ) : null;

  const empty = (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.gray100,
        boxShadow: SHADOW.base,
        padding: 48,
        alignItems: 'center',
      }}
    >
      {!loaded && orders.length === 0 ? (
        <Spinner size={28} color={ORANGE} />
      ) : (
        <>
          <View style={{ marginBottom: 12 }}>
            <ShoppingBag size={40} color={C.gray200} />
          </View>
          <Text style={{ fontSize: 16, lineHeight: 24, fontWeight: '700', color: C.gray700, textAlign: 'center' }}>No orders found</Text>
          <Text style={[fs('xs', S), { color: C.gray400, marginTop: 4, textAlign: 'center' }]}>
            {orders.length === 0 ? 'Place your first order to see it here.' : 'Try a different tab or search.'}
          </Text>
          {orders.length === 0 && (
            <Press onPress={goHome} style={{ marginTop: 16 }}>
              {({ pressed }) => (
                <Text
                  style={[fs('xs', S), { fontWeight: '700', color: ORANGE, textDecorationLine: pressed ? 'underline' : 'none' }]}
                >
                  Start Shopping →
                </Text>
              )}
            </Press>
          )}
        </>
      )}
    </View>
  );

  return (
    /* The payment sheet sits outside DashboardLayout so it covers the whole
       screen, header included (the web's fixed inset-0), not just the body. */
    <View style={{ flex: 1 }}>
      <DashboardLayout
        webChrome
        title="My Orders"
        showBack
        headerAction={headerAction}
        onRefresh={onRefresh}
        refreshing={refreshing}
        list={{
          data: filtered,
          keyExtractor: (o) => String(o.orderId),
          extraData: selectedIds,
          renderItem: ({ item }) => (
            <Animated.View entering={FadeIn.duration(220)}>
              <MyOrderCard
                order={item}
                selected={selectedIds.has(item.orderId)}
                onToggleSelect={toggleSelect}
                onPayNow={onPayNow}
                onApplyRefund={setRefundTarget}
                onBuyAgain={handleBuyAgain}
                onOpen={onOpen}
                onInvoice={onInvoice}
                onProduct={openProduct}
                onReorder={openProduct}
              />
            </Animated.View>
          ),
          ItemSeparatorComponent: Gap,
          ListEmptyComponent: empty,
          ListFooterComponent: <View style={{ height: 80 }} />,
          initialNumToRender: 4,
          maxToRenderPerBatch: 4,
          windowSize: 7,
          keyboardDismissMode: 'on-drag',
        }}
        overlays={
          <>
            {/* Sticky combined-pay bar: fixed bottom-16 left-2 right-2 — 4px
                above the 60px BottomNav, i.e. 4px above the tab bar here. */}
            {selectedOrders.length > 0 && (
              <Animated.View
                entering={FadeIn.duration(180)}
                pointerEvents="box-none"
                style={{ position: 'absolute', bottom: 4, left: 8, right: 8, zIndex: 30 }}
              >
                <View
                  style={{
                    borderRadius: 16,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    backgroundColor: '#1C1C1C',
                    boxShadow: SHADOW.xl,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
                    <View
                      style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={[fs('xs', S), { fontWeight: '800', color: '#ffffff' }]}>{selectedOrders.length}</Text>
                    </View>
                    <View style={{ flexShrink: 1 }}>
                      <Text
                        style={[fs(10, S), { fontWeight: '600', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.2 }]}
                      >
                        Selected Total Due
                      </Text>
                      <Text style={[fs('base', S), { fontWeight: '800', color: '#ffffff' }]}>৳{combinedDue.toLocaleString()}</Text>
                    </View>
                  </View>
                  <ScalePress
                    onPress={() => setPayTarget(selectedOrders)}
                    containerStyle={{ flexShrink: 0 }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: ORANGE,
                    }}
                  >
                    <Text style={[fs('xs', S), { fontWeight: '700', color: '#ffffff' }]}>Pay Combined</Text>
                    <ArrowRight size={13} color="#ffffff" />
                  </ScalePress>
                </View>
              </Animated.View>
            )}

            <RefundApplyModal
              inline
              shrink
              target={refundTarget}
              kind="order"
              mode={refundTarget ? refundMode(refundTarget) : 'quick'}
              onClose={() => setRefundTarget(null)}
            />

            <PickerSheet
              visible={picker === 'date'}
              title="Order Date"
              options={DATE_OPTIONS}
              value={dateFilter}
              onSelect={(v) => {
                setDateFilter(v);
                setPicker(null);
              }}
              onClose={() => setPicker(null)}
            />
            <PickerSheet
              visible={picker === 'pay'}
              title="Payment Status"
              options={PAY_OPTIONS}
              value={filterPay}
              onSelect={(v) => {
                setFilterPay(v);
                setPicker(null);
              }}
              onClose={() => setPicker(null)}
            />
          </>
        }
      >
        {/* Search + filter band: -mx-2 px-2 py-3 bg-gray-50 space-y-2.5 */}
        <View style={{ marginHorizontal: -8, paddingHorizontal: 8, paddingVertical: 12, backgroundColor: C.gray50, gap: 10 }}>
          <View
            style={{
              height: fs('sm', S).lineHeight + 22,
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: searchFocused ? ORANGE : C.gray200,
              borderRadius: 999,
              backgroundColor: '#ffffff',
            }}
          >
            <View pointerEvents="none" style={{ position: 'absolute', left: 16 }}>
              <Search size={16} color={C.gray400} />
            </View>
            {/* Uncontrolled — re-rendering the list on each keystroke must not drop characters. */}
            <TextInput
              onChangeText={setSearchQuery}
              placeholder="Search by Order ID or Product…"
              placeholderTextColor={PLACEHOLDER}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={[
                fs('sm', S),
                { height: '100%', paddingVertical: 0, paddingLeft: 40, paddingRight: 16, color: BODY, includeFontPadding: false },
              ]}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SelectPill
              label={DATE_OPTIONS.find((o) => o.value === dateFilter)?.label}
              open={picker === 'date'}
              onPress={() => setPicker('date')}
            />
            <SelectPill
              label={PAY_OPTIONS.find((o) => o.value === filterPay)?.label}
              open={picker === 'pay'}
              onPress={() => setPicker('pay')}
            />
          </View>
        </View>

        {/* mt-3, then space-y-3 down to the list */}
        <View style={{ marginTop: 12, marginBottom: 12 }}>
          <StatusTabs value={activeTab} counts={tabCounts} onChange={setActiveTab} />
        </View>
      </DashboardLayout>

      <OrderPaymentModal
        visible={!!payTarget && !!currentUser}
        orders={payTarget || []}
        currentUser={currentUser}
        activePartial={activePartial}
        onClose={() => setPayTarget(null)}
        onSuccess={handlePaySuccess}
      />
    </View>
  );
}

function Gap() {
  return <View style={{ height: 12 }} />;
}
