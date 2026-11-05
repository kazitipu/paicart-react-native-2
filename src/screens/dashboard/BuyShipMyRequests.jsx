import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Search, ChevronDown, Package, Plus, ArrowRight } from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import RequestCard from '@/components/orders/RequestCard';
import { fs } from '@/components/orders/OrderBits';
import { openProductLink, openBookAgain, openNewRequest } from '@/components/requests/RequestBits';
import RefundApplyModal from '@/components/RefundApplyModal';
import BookingPaymentModal from '@/components/payments/BookingPaymentModal';
import { PickerSheet } from '@/components/profile/ProfileBits';
import { C, SHADOW, ORANGE, Press, ScalePress, Spinner } from '@/components/product/ui';
import { getAllBookingsOfSingleUserRedux } from '@/store/actions';
import { refundMode } from '@/lib/refund';
import { getRequestBucket } from '@/lib/buckets';
import { canPayBooking, getTotalDue } from '@/lib/requestMath';

/* ═══════════════════════════════════════════════════════════════════════
   Web pages/dashboard/buy-and-ship-for-me/my-request/page.jsx at < 640px.
   DashboardLayout `webChrome` (title "My Product Requests", showBack,
   "Select All" as the top-bar action), then `space-y-3 pb-20`: the count +
   New Request row, search + "Request Date" select, the bucket pills, the
   cards, and the fixed combined-pay bar. No scoped font shrink on this page.
   ═══════════════════════════════════════════════════════════════════════ */

/* Same pipeline as My Orders (1688), with Pending → Approved in front while
   the price is agreed. Rules: lib/buckets.js getRequestBucket. */
const STATUS_TABS = ['All', 'Pending', 'Approved', 'To Ship', 'In Shipment', 'To Receive', 'Delivered', 'Refunds', 'Rejected'];
const matchesTab = (booking, tab) => {
  if (tab === 'All') return true;
  /* Cross-cutting flag, not a stage — same as the My Orders Refunds tab */
  if (tab === 'Refunds') return !!booking.refundStatus;
  return getRequestBucket(booking) === tab;
};

const DATE_OPTIONS = [
  { value: '', label: 'Request Date' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last Week' },
  { value: 'month', label: 'Last Month' },
  { value: '6months', label: 'Last 6 Months' },
];

const PLACEHOLDER = '#9ca3af';
const BODY = '#1e293b';
const SM = fs('sm');

/* `flex gap-1 overflow-x-auto pb-0.5`; each pill `px-3 py-1.5 rounded-full
   text-xs font-semibold` — active orange + shadow-sm (no border), inactive
   white with a gray-200 border; count `text-[10px] font-bold px-1.5 py-0.5
   rounded-full min-w-[18px]`. The active pill is scrolled into view. */
function StatusPills({ value, counts, onChange }) {
  const scrollRef = useRef(null);
  const layouts = useRef({});
  const viewW = useRef(0);

  useEffect(() => {
    const l = layouts.current[value];
    if (l && viewW.current) {
      scrollRef.current?.scrollTo({ x: Math.max(0, l.x - (viewW.current - l.width) / 2), animated: true });
    }
  }, [value]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(e) => {
        viewW.current = e.nativeEvent.layout.width;
      }}
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ gap: 4, paddingBottom: 2 }}
    >
      {STATUS_TABS.map((tab) => {
        const active = value === tab;
        return (
          <Press
            key={tab}
            onPress={() => onChange(tab)}
            onLayout={(e) => {
              layouts.current[tab] = e.nativeEvent.layout;
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              flexShrink: 0,
              backgroundColor: active ? ORANGE : '#ffffff',
              borderWidth: active ? 0 : 1,
              borderColor: pressed ? 'rgba(255,106,0,0.4)' : C.gray200,
              boxShadow: active ? SHADOW.base : undefined,
            })}
          >
            <Text style={[fs('xs'), { fontWeight: '600', color: active ? '#ffffff' : C.gray500 }]}>{tab}</Text>
            {counts[tab] > 0 && (
              <View
                style={{
                  minWidth: 18,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 999,
                  alignItems: 'center',
                  backgroundColor: active ? 'rgba(255,255,255,0.25)' : C.gray100,
                }}
              >
                <Text style={[fs(10), { fontWeight: '700', color: active ? '#ffffff' : C.gray500, textAlign: 'center' }]}>
                  {counts[tab]}
                </Text>
              </View>
            )}
          </Press>
        );
      })}
    </ScrollView>
  );
}

/* `appearance-none border border-gray-200 rounded-xl pl-3.5 pr-8 py-2.5
   text-sm font-semibold text-gray-700 bg-white` + ChevronDown 14. A native
   <select> is as wide as its longest option, so every label is laid out
   (invisibly, at zero height) to size the box. */
function DateSelect({ value, open, onPress }) {
  return (
    <Press
      onPress={onPress}
      style={{
        flexShrink: 0,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: open ? ORANGE : C.gray200,
        borderRadius: 12,
        paddingLeft: 14,
        paddingRight: 32,
        paddingVertical: 10,
        backgroundColor: '#ffffff',
      }}
    >
      <Text style={[SM, { fontWeight: '600', color: C.gray700 }]} numberOfLines={1}>
        {DATE_OPTIONS.find((o) => o.value === value)?.label}
      </Text>
      <View style={{ height: 0, overflow: 'hidden' }}>
        {DATE_OPTIONS.map((o) => (
          <Text key={o.value} style={[SM, { fontWeight: '600' }]}>
            {o.label}
          </Text>
        ))}
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', right: 10 }}>
        <ChevronDown size={14} color={C.gray400} />
      </View>
    </Press>
  );
}

/* `flex items-center gap-1.5 bg-[#FF6A00] text-white rounded-xl font-bold` */
function NewRequestButton({ onPress, big }) {
  return (
    <ScalePress
      onPress={onPress}
      scaleTo={0.97}
      containerStyle={{ flexShrink: 0 }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: ORANGE,
        paddingHorizontal: big ? 20 : 16,
        paddingVertical: big ? 10 : 8,
        borderRadius: 12,
        boxShadow: big ? undefined : '0 1px 3px 0 #fed7aa, 0 1px 2px -1px #fed7aa',
      }}
    >
      <Plus size={big ? 14 : 13} color="#ffffff" />
      <Text style={[fs(big ? 'sm' : 'xs'), { fontWeight: '700', color: '#ffffff' }]}>New Request</Text>
    </ScalePress>
  );
}

export default function BuyShipMyRequests() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.user?.currentUser);
  const requests = useSelector((s) => s.bookingRequests?.bookingsArrayOfSingleUser || []);

  /* The web page always opens on All; an in-app caller may pass a bucket. */
  const tabParam = route.params?.tab;
  const [activeTab, setActiveTab] = useState(() => (STATUS_TABS.includes(tabParam) ? tabParam : 'All'));
  useEffect(() => {
    if (tabParam && STATUS_TABS.includes(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [picker, setPicker] = useState(false);
  const [payModal, setPayModal] = useState(null); // array of bookings being paid
  const [refundTarget, setRefundTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [loaded, setLoaded] = useState(requests.length > 0);
  const [refreshing, setRefreshing] = useState(false);

  const refreshRequests = useCallback(
    () => (currentUser?.id ? Promise.resolve(dispatch(getAllBookingsOfSingleUserRedux(currentUser.id))) : Promise.resolve()),
    [currentUser?.id, dispatch],
  );

  useEffect(() => {
    refreshRequests().finally(() => setLoaded(true));
  }, [refreshRequests]);

  const toggleSelect = useCallback((bookingId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookingId)) next.delete(bookingId);
      else next.add(bookingId);
      return next;
    });
  }, []);

  const tabCounts = useMemo(
    () =>
      Object.fromEntries(
        STATUS_TABS.map((t) => [t, t === 'All' ? requests.length : requests.filter((r) => matchesTab(r, t)).length]),
      ),
    [requests],
  );

  const filtered = useMemo(() => {
    let list = requests.filter((b) => matchesTab(b, activeTab));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          String(b.bookingId || '').toLowerCase().includes(q) ||
          String(b.trackingNo || '').toLowerCase().includes(q) ||
          String(b.date || '').toLowerCase().includes(q) ||
          String(b.productType || '').toLowerCase().includes(q),
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
      list = list.filter((b) => (b.time || 0) >= cutoff);
    }
    return list;
  }, [requests, activeTab, search, dateFilter]);

  /* As on the web, Select All ticks every card in view (payable or not);
     only the payable ones count toward the combined total. */
  const allVisibleSelected = filtered.length > 0 && filtered.every((b) => selectedIds.has(b.bookingId));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return new Set();
      const next = new Set(prev);
      filtered.forEach((b) => next.add(b.bookingId));
      return next;
    });
  };

  const selectedBookings = useMemo(
    () => requests.filter((b) => selectedIds.has(b.bookingId) && canPayBooking(b)),
    [requests, selectedIds],
  );
  const combinedDue = selectedBookings.reduce((a, b) => a + Math.max(0, getTotalDue(b)), 0);

  /* Only drop the bookings that were actually just paid from the selection —
     not a blanket clear — so unrelated checkboxes survive. The sheet closes
     itself right after (onClose). */
  const handlePaySuccess = () => {
    refreshRequests();
    if (payModal) {
      const paidIds = new Set(payModal.map((b) => b.bookingId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paidIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    refreshRequests().finally(() => setRefreshing(false));
  };

  const onPayNow = useCallback((b) => setPayModal([b]), []);
  const onOpen = useCallback((b) => navigation.navigate('BuyShipRequestDetail', { orderId: b.bookingId }), [navigation]);
  const onInvoice = useCallback(
    (b) => navigation.navigate('OrderInvoice', { bookingId: b.bookingId, kind: 'productRequest' }),
    [navigation],
  );
  const onProduct = useCallback((url) => openProductLink(navigation, url), [navigation]);
  const onBookAgain = useCallback((id) => openBookAgain(navigation, id), [navigation]);
  const newRequest = () => openNewRequest(navigation);

  const headerAction =
    filtered.length > 0 ? (
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

  const emptyCard = { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: C.gray100, alignItems: 'center' };

  const empty =
    requests.length === 0 ? (
      <View style={[emptyCard, { padding: 48 }]}>
        {!loaded ? (
          <Spinner size={28} color={ORANGE} />
        ) : (
          <>
            <View
              style={{
                width: 64,
                height: 64,
                backgroundColor: C.gray50,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Package size={28} color={C.gray200} />
            </View>
            <Text style={[SM, { fontWeight: '600', color: C.gray500, marginBottom: 4, textAlign: 'center' }]}>No requests yet</Text>
            <Text style={[fs('xs'), { color: C.gray400, marginBottom: 16, textAlign: 'center' }]}>
              Submit a product request to get started
            </Text>
            <NewRequestButton big onPress={newRequest} />
          </>
        )}
      </View>
    ) : (
      <View style={[emptyCard, { padding: 32 }]}>
        <View style={{ marginBottom: 8 }}>
          <Search size={24} color={C.gray200} />
        </View>
        <Text style={[SM, { color: C.gray400, textAlign: 'center' }]}>
          {search ? `No results for "${search}"` : `No orders in "${activeTab}"`}
        </Text>
      </View>
    );

  return (
    /* The payment sheet sits outside DashboardLayout so it covers the whole
       screen, header included (the web's fixed inset-0), not just the body. */
    <View style={{ flex: 1 }}>
      <DashboardLayout
        webChrome
        title="My Product Requests"
        showBack
        headerAction={headerAction}
        onRefresh={onRefresh}
        refreshing={refreshing}
        list={{
          data: filtered,
          keyExtractor: (b, i) => String(b.bookingId || i),
          extraData: selectedIds,
          renderItem: ({ item }) => (
            <Animated.View entering={FadeIn.duration(220)}>
              <RequestCard
                booking={item}
                selected={selectedIds.has(item.bookingId)}
                onToggleSelect={toggleSelect}
                onPayNow={onPayNow}
                onApplyRefund={setRefundTarget}
                onOpen={onOpen}
                onInvoice={onInvoice}
                onProduct={onProduct}
                onBookAgain={onBookAgain}
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
            {selectedBookings.length > 0 && (
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
                      <Text style={[fs('xs'), { fontWeight: '800', color: '#ffffff' }]}>{selectedBookings.length}</Text>
                    </View>
                    <View style={{ flexShrink: 1 }}>
                      <Text style={[fs(10), { fontWeight: '600', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.25 }]}>
                        Selected Total Due
                      </Text>
                      <Text style={[fs('base'), { fontWeight: '800', color: '#ffffff' }]}>৳{combinedDue.toLocaleString()}</Text>
                    </View>
                  </View>
                  <ScalePress
                    onPress={() => setPayModal(selectedBookings)}
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
                    <Text style={[fs('xs'), { fontWeight: '700', color: '#ffffff' }]}>Pay Combined</Text>
                    <ArrowRight size={13} color="#ffffff" />
                  </ScalePress>
                </View>
              </Animated.View>
            )}

            <RefundApplyModal
              inline
              target={refundTarget}
              kind="productRequest"
              mode={refundTarget ? refundMode(refundTarget) : 'quick'}
              onClose={() => setRefundTarget(null)}
            />

            <PickerSheet
              visible={picker}
              title="Request Date"
              options={DATE_OPTIONS}
              value={dateFilter}
              onSelect={(v) => {
                setDateFilter(v);
                setPicker(false);
              }}
              onClose={() => setPicker(false)}
            />
          </>
        }
      >
        <View style={{ gap: 12, marginBottom: 12 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <Text style={[fs('xs'), { color: C.gray400 }]}>
              {requests.length} total request{requests.length !== 1 ? 's' : ''}
            </Text>
            <NewRequestButton onPress={newRequest} />
          </View>

          {/* Search */}
          {requests.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'stretch' }}>
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: searchFocused ? ORANGE : C.gray200,
                  borderRadius: 12,
                  backgroundColor: '#ffffff',
                }}
              >
                <View pointerEvents="none" style={{ position: 'absolute', left: 14 }}>
                  <Search size={14} color={C.gray400} />
                </View>
                {/* Uncontrolled — re-rendering the list on each keystroke must not drop characters. */}
                <TextInput
                  onChangeText={setSearch}
                  placeholder="Search by booking ID, tracking no, date, product type…"
                  placeholderTextColor={PLACEHOLDER}
                  numberOfLines={1}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  style={[
                    SM,
                    {
                      height: SM.lineHeight + 20,
                      paddingVertical: 0,
                      paddingLeft: 36,
                      paddingRight: 16,
                      color: BODY,
                      includeFontPadding: false,
                    },
                  ]}
                />
              </View>
              <DateSelect value={dateFilter} open={picker} onPress={() => setPicker(true)} />
            </View>
          )}

          {/* Status tabs */}
          {requests.length > 0 && <StatusPills value={activeTab} counts={tabCounts} onChange={setActiveTab} />}
        </View>
      </DashboardLayout>

      <BookingPaymentModal
        visible={!!payModal && !!currentUser}
        bookings={payModal || []}
        currentUser={currentUser}
        onClose={() => setPayModal(null)}
        onSuccess={handlePaySuccess}
      />
    </View>
  );
}

function Gap() {
  return <View style={{ height: 12 }} />;
}
