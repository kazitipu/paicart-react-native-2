import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Search, ChevronDown, Plus, Ship, AlertTriangle, ArrowRight } from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import ShipmentCard from '@/components/shipping/ShipmentCard';
import ShipmentPaymentModal from '@/components/shipping/ShipmentPaymentModal';
import ShipmentEditModal from '@/components/shipping/ShipmentEditModal';
import StartShippingModal from '@/components/shipping/StartShippingModal';
import RefundApplyModal from '@/components/RefundApplyModal';
import { PickerSheet } from '@/components/profile/ProfileBits';
import { fs } from '@/components/orders/OrderBits';
import { sf, SC } from '@/components/shipping/ShipBits';
import { C, SHADOW, ORANGE, Press, ScalePress, Spinner } from '@/components/product/ui';
import { getAllShipForMeOfSingleUserRedux, updateShipForMeRedux, updateShipmentRequestRedux } from '@/store/actions';
import { canPayShipment } from '@/lib/shipForMe';
import { matchShipTab } from '@/lib/shipment';
import { toast } from '@/lib/toast';
import { TABS } from '@/navigation/routes';

/* ═══════════════════════════════════════════════════════════════════════
   Web pages/dashboard/ship-for-me/my-request/page.jsx at < 640px.
   DashboardLayout `webChrome` ("My Shipment", back arrow, "Select All" as
   the top bar's action), then `.sfm-list-root` (type shrunk — `sf`):
   count + New Request, search + Booking Date select, the bucket pill tabs,
   the Pending-edit reminder, the cards, the fixed combined-pay bar. The
   edit / start-shipping / payment modals live inside that root on the web
   (so they shrink too); the refund form sits outside it.
   ═══════════════════════════════════════════════════════════════════════ */

/* The web's STATUS_TABS and matchShipTab: the bucket rules the Cloud Function
   stamps for the dashboard counts, so a stat card's number matches its tab. */
const STATUS_TABS = ['All', 'Pending', 'Approved', 'In Shipment', 'To Receive', 'Delivered', 'Rejected'];

const BODY = '#1e293b';
const PLACEHOLDER = 'rgba(30,41,59,0.5)';
const DATE_OPTIONS = [
  { value: '', label: 'Booking Date' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last Week' },
  { value: 'month', label: 'Last Month' },
  { value: '6months', label: 'Last 6 Months' },
];
/* `py-2.5 text-sm` + 1px borders */
const FIELD_H = sf('sm').lineHeight + 22;

/* `flex gap-1 overflow-x-auto`: rounded-full pills, the active one orange
   with its count on white/25. The active pill is scrolled into view. */
function StatusPills({ value, counts, onChange }) {
  const scrollRef = useRef(null);
  const layouts = useRef({});
  const viewW = useRef(0);

  useEffect(() => {
    const l = layouts.current[value];
    if (l && viewW.current) scrollRef.current?.scrollTo({ x: Math.max(0, l.x - (viewW.current - l.width) / 2), animated: true });
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
              flexShrink: 0,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: active ? ORANGE : '#ffffff',
              borderWidth: active ? 0 : 1,
              borderColor: pressed ? 'rgba(255,106,0,0.4)' : C.gray200,
              boxShadow: active ? SHADOW.base : undefined, // v4 shadow-sm
            })}
          >
            <Text style={[sf('xs'), { fontWeight: '600', color: active ? '#ffffff' : C.gray500 }]}>{tab}</Text>
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
                <Text style={[sf(10), { fontWeight: '700', color: active ? '#ffffff' : C.gray500, textAlign: 'center' }]}>{counts[tab]}</Text>
              </View>
            )}
          </Press>
        );
      })}
    </ScrollView>
  );
}

export default function ShipMyRequests() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  const currentUser = useSelector((s) => s.user?.currentUser);
  const requests = useSelector((s) => s.bookingRequests?.shipForMeOfSingleUser || []);

  /* Arriving from a dashboard stat card lands on that card's tab. */
  const tabParam = route.params?.tab;
  const [activeTab, setActiveTab] = useState(() => (STATUS_TABS.includes(tabParam) ? tabParam : 'All'));
  useEffect(() => {
    if (tabParam && STATUS_TABS.includes(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [editingReq, setEditingReq] = useState(null);
  const [saving, setSaving] = useState(false);
  const [startShipReq, setStartShipReq] = useState(null);
  const [startSubmitting, setStartSubmitting] = useState(false);
  const [payModal, setPayModal] = useState(null); // array of requests being paid
  const [refundClaimTarget, setRefundClaimTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [loaded, setLoaded] = useState(requests.length > 0);
  const [refreshing, setRefreshing] = useState(false);

  const refreshRequests = useCallback(
    () => (currentUser?.id ? Promise.resolve(dispatch(getAllShipForMeOfSingleUserRedux(currentUser.id))) : Promise.resolve()),
    [currentUser?.id, dispatch],
  );

  useEffect(() => {
    refreshRequests().finally(() => setLoaded(true));
  }, [refreshRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    refreshRequests().finally(() => setRefreshing(false));
  };

  const toggleSelect = useCallback((bookingId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookingId)) next.delete(bookingId);
      else next.add(bookingId);
      return next;
    });
  }, []);

  /* Only drop the requests that were just paid from the selection — not a
     blanket clear — so unrelated checkboxes survive. */
  const handlePaySuccess = () => {
    refreshRequests();
    if (payModal) {
      const paidIds = new Set(payModal.map((r) => r.bookingId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paidIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const handleSave = async (updated) => {
    setSaving(true);
    try {
      await dispatch(updateShipForMeRedux(updated));
      toast.success('Request updated successfully!');
      setEditingReq(null);
    } catch {
      toast.error('Failed to update. Please try again.');
    }
    setSaving(false);
  };

  const handleStartShipping = async () => {
    setStartSubmitting(true);
    try {
      await dispatch(updateShipmentRequestRedux({ ...startShipReq, shipping: true, readTermsAndConditions: true }));
      toast.success('Shipping started! Please send your parcel to the warehouse.');
      setStartShipReq(null);
      refreshRequests();
    } catch {
      toast.error('Failed to start shipping. Please try again.');
    }
    setStartSubmitting(false);
  };

  const tabCounts = useMemo(
    () =>
      Object.fromEntries(STATUS_TABS.map((t) => [t, t === 'All' ? requests.length : requests.filter((r) => matchShipTab(r, t)).length])),
    [requests],
  );

  const filtered = useMemo(() => {
    let list = requests.filter((r) => matchShipTab(r, activeTab));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          String(r.othersProductName || '').toLowerCase().includes(q) ||
          String(r.bookingId || '').toLowerCase().includes(q) ||
          String(r.status || '').toLowerCase().includes(q) ||
          String(r.trackingNo || '').toLowerCase().includes(q),
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
      list = list.filter((r) => (r.time || 0) >= cutoff);
    }
    return list;
  }, [requests, activeTab, search, dateFilter]);

  /* "Select All" applies to the payable shipments in view. */
  const payableVisible = useMemo(() => filtered.filter(canPayShipment), [filtered]);
  const allVisibleSelected = payableVisible.length > 0 && payableVisible.every((r) => selectedIds.has(r.bookingId));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) return new Set();
      const next = new Set(prev);
      payableVisible.forEach((r) => next.add(r.bookingId));
      return next;
    });
  };

  const selectedRequests = useMemo(() => requests.filter((r) => selectedIds.has(r.bookingId) && canPayShipment(r)), [requests, selectedIds]);

  /* Drop anything since paid or under payment review. */
  useEffect(() => {
    setSelectedIds((prev) => {
      const payable = new Set(requests.filter(canPayShipment).map((r) => r.bookingId));
      const next = new Set([...prev].filter((id) => payable.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [requests]);
  const combinedDue = selectedRequests.reduce((a, r) => a + (parseInt(r.shippingChargeCustomer, 10) || 0), 0);

  const newRequest = useCallback(() => navigation.navigate(TABS.MORE, { screen: 'ShipForMeForm' }), [navigation]);
  const onOpen = useCallback((r) => navigation.navigate('ShipRequestDetail', { bookingId: r.bookingId }), [navigation]);
  const onInvoice = useCallback((r) => navigation.navigate('ShipmentInvoice', { bookingId: r.bookingId }), [navigation]);
  const onPayNow = useCallback((r) => setPayModal([r]), []);

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

  const empty =
    requests.length === 0 ? (
      <View style={{ backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: C.gray100, padding: 48, alignItems: 'center' }}>
        {!loaded ? (
          <Spinner size={28} color={ORANGE} />
        ) : (
          <>
            <View
              style={{ width: 64, height: 64, backgroundColor: C.gray50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}
            >
              <Ship size={28} color={C.gray200} />
            </View>
            <Text style={[sf('sm'), { fontWeight: '600', color: C.gray500, marginBottom: 4 }]}>No orders yet</Text>
            <Text style={[sf('xs'), { color: C.gray400, marginBottom: 16, textAlign: 'center' }]}>Submit a ship-for-me request to get started</Text>
            <ScalePress
              onPress={newRequest}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: ORANGE, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 }}
            >
              <Plus size={14} color="#ffffff" />
              <Text style={[sf('sm'), { fontWeight: '700', color: '#ffffff' }]}>New Request</Text>
            </ScalePress>
          </>
        )}
      </View>
    ) : (
      <View style={{ backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: C.gray100, padding: 32, alignItems: 'center' }}>
        <View style={{ marginBottom: 8 }}>
          <Search size={24} color={C.gray200} />
        </View>
        <Text style={[sf('sm'), { color: C.gray400, textAlign: 'center' }]}>
          {search ? `No results for "${search}"` : `No orders in "${activeTab}"`}
        </Text>
      </View>
    );

  return (
    /* The payment sheet sits outside DashboardLayout so it covers the whole
       screen, header included (the web's fixed inset-0). */
    <View style={{ flex: 1 }}>
      <DashboardLayout
        webChrome
        title="My Shipment"
        showBack
        headerAction={headerAction}
        onRefresh={onRefresh}
        refreshing={refreshing}
        list={{
          data: filtered,
          keyExtractor: (r, i) => String(r.bookingId || i),
          extraData: selectedIds,
          renderItem: ({ item }) => (
            <Animated.View entering={FadeIn.duration(220)}>
              <ShipmentCard
                req={item}
                selected={selectedIds.has(item.bookingId)}
                onToggleSelect={toggleSelect}
                onEdit={setEditingReq}
                onStartShipping={setStartShipReq}
                onPayNow={onPayNow}
                onRefundClaim={setRefundClaimTarget}
                onOpen={onOpen}
                onInvoice={onInvoice}
              />
            </Animated.View>
          ),
          ItemSeparatorComponent: Gap,
          ListEmptyComponent: empty,
          ListFooterComponent: <View style={{ height: selectedRequests.length > 0 ? 96 : 16 }} />,
          initialNumToRender: 4,
          maxToRenderPerBatch: 4,
          windowSize: 7,
          keyboardDismissMode: 'on-drag',
        }}
        overlays={
          <>
            {/* Sticky combined-pay bar: fixed bottom-16 left-2 right-2 — 4px
                above the 60px BottomNav, i.e. 4px above the tab bar here. */}
            {selectedRequests.length > 0 && (
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
                    backgroundColor: SC.DARK,
                    boxShadow: SHADOW.xl,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={[sf('xs'), { fontWeight: '800', color: '#ffffff' }]}>{selectedRequests.length}</Text>
                    </View>
                    <View style={{ flexShrink: 1 }}>
                      <Text style={[sf(10), { fontWeight: '600', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.225 }]}>
                        Selected Total Due
                      </Text>
                      <Text style={[sf('base'), { fontWeight: '800', color: '#ffffff' }]}>৳{combinedDue.toLocaleString()}</Text>
                    </View>
                  </View>
                  <ScalePress
                    onPress={() => setPayModal(selectedRequests)}
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
                    <Text style={[sf('xs'), { fontWeight: '700', color: '#ffffff' }]}>Pay Combined</Text>
                    <ArrowRight size={13} color="#ffffff" />
                  </ScalePress>
                </View>
              </Animated.View>
            )}

            <ShipmentEditModal booking={editingReq} onClose={() => setEditingReq(null)} onSave={handleSave} saving={saving} />

            <StartShippingModal
              booking={startShipReq}
              onClose={() => setStartShipReq(null)}
              onSubmit={handleStartShipping}
              submitting={startSubmitting}
              onTerms={() => navigation.navigate(TABS.MORE, { screen: 'Terms' })}
            />

            {/* Outside `.sfm-list-root` on the web — full-size type. */}
            <RefundApplyModal
              inline
              target={refundClaimTarget}
              kind="shipment"
              mode="afterSale"
              onClose={() => setRefundClaimTarget(null)}
              onSuccess={refreshRequests}
            />

            <PickerSheet
              visible={datePickerOpen}
              title="Booking Date"
              options={DATE_OPTIONS}
              value={dateFilter}
              onSelect={(v) => {
                setDateFilter(v);
                setDatePickerOpen(false);
              }}
              onClose={() => setDatePickerOpen(false)}
            />
          </>
        }
      >
        <View style={{ gap: 12, marginBottom: 12 }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <Text style={[sf('xs'), { color: C.gray400 }]}>
              {requests.length} shipment order{requests.length !== 1 ? 's' : ''}
            </Text>
            <ScalePress
              onPress={newRequest}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: ORANGE,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 12,
                boxShadow: '0 1px 3px 0 #fecaca, 0 1px 2px -1px #fecaca', // shadow-sm shadow-red-200
              }}
            >
              <Plus size={13} color="#ffffff" />
              <Text style={[sf('xs'), { fontWeight: '700', color: '#ffffff' }]}>New Request</Text>
            </ScalePress>
          </View>

          {/* Search bar */}
          {requests.length > 0 && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View
                style={{
                  flex: 1,
                  height: FIELD_H,
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
                  placeholder="Search by product name, booking ID, tracking…"
                  placeholderTextColor={PLACEHOLDER}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  style={[sf('sm'), { height: '100%', paddingVertical: 0, paddingLeft: 36, paddingRight: 16, color: BODY, includeFontPadding: false }]}
                />
              </View>
              <Press
                onPress={() => setDatePickerOpen(true)}
                style={{
                  flexShrink: 0,
                  height: FIELD_H,
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: datePickerOpen ? ORANGE : C.gray200,
                  borderRadius: 12,
                  paddingLeft: 14,
                  paddingRight: 32,
                  backgroundColor: '#ffffff',
                }}
              >
                <Text style={[sf('sm'), { fontWeight: '600', color: C.gray700 }]} numberOfLines={1}>
                  {DATE_OPTIONS.find((o) => o.value === dateFilter)?.label}
                </Text>
                <View pointerEvents="none" style={{ position: 'absolute', right: 10 }}>
                  <ChevronDown size={14} color={C.gray400} />
                </View>
              </Press>
            </View>
          )}

          {/* Status tabs */}
          {requests.length > 0 && <StatusPills value={activeTab} counts={tabCounts} onChange={setActiveTab} />}

          {/* Pending edit reminder */}
          {requests.some((r) => !r.status || r.status === 'Pending') && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 8,
                backgroundColor: SC.amber50,
                borderWidth: 1,
                borderColor: SC.amber100,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <View style={{ marginTop: 2 }}>
                <AlertTriangle size={13} color={SC.amber500} />
              </View>
              <Text style={[sf('xs'), { color: SC.amber700, flexShrink: 1 }]}>
                You can edit requests while they are in <Text style={{ fontWeight: '700' }}>Pending</Text> status.
              </Text>
            </View>
          )}
        </View>
      </DashboardLayout>

      <ShipmentPaymentModal
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
