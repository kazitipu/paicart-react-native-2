import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, FlatList, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Search, Ship } from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import ShipmentCard from '@/components/shipping/ShipmentCard';
import ShipmentPaymentModal from '@/components/shipping/ShipmentPaymentModal';
import RefundApplyModal from '@/components/RefundApplyModal';
import Tabs from '@/components/ui/Tabs';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { getAllShipForMeOfSingleUserRedux } from '@/store/actions';
import { canPayShipment, getTotal, STEPS } from '@/lib/shipForMe';
import { refundMode } from '@/lib/refund';
import colors from '@/theme/colors';

const TABS = ['All', ...STEPS];

const matches = (r, tab) => {
  if (tab === 'All') return true;
  return String(r.status || 'Pending') === tab;
};

export default function ShipMyRequests() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  const currentUser = useSelector((s) => s.user?.currentUser);
  const requests = useSelector((s) => s.bookingRequests?.shipForMeOfSingleUser || []);

  const [activeTab, setActiveTab] = useState(route.params?.tab || 'All');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState({});
  const [payTarget, setPayTarget] = useState(null);
  const [refundTarget, setRefundTarget] = useState(null);

  const load = useCallback(() => {
    if (currentUser?.id) dispatch(getAllShipForMeOfSingleUserRedux(currentUser.id));
  }, [currentUser?.id, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((t) => [
          t,
          t === 'All' ? requests.length : requests.filter((r) => matches(r, t)).length,
        ]),
      ),
    [requests],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (!matches(r, activeTab)) return false;
      if (!q) return true;
      return (
        String(r.bookingId).toLowerCase().includes(q) ||
        String(r.productName || '').toLowerCase().includes(q) ||
        String(r.trackingNo || '').toLowerCase().includes(q)
      );
    });
  }, [requests, activeTab, query]);

  const selectedReqs = useMemo(
    () => requests.filter((r) => selected[r.bookingId] && canPayShipment(r)),
    [requests, selected],
  );
  const combinedDue = selectedReqs.reduce((a, r) => {
    const bill =
      (parseInt(r.shippingChargeCustomer, 10) || 0) +
      (parseInt(r.otherCost, 10) || 0) -
      (parseInt(r.discount, 10) || 0);
    return a + Math.max(0, bill - getTotal(r));
  }, 0);

  return (
    <DashboardLayout title="My Shipments" scroll={false}>
      <View className="px-3 py-2 bg-white">
        <View className="flex-row items-center bg-gray-100 rounded-full px-3">
          <Search size={14} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by booking ID or tracking"
            placeholderTextColor="#9ca3af"
            className="flex-1 text-smd text-foreground py-2.5 px-2"
          />
        </View>
      </View>

      <Tabs
        items={TABS.map((t) => ({ key: t, label: t, count: counts[t] }))}
        value={activeTab}
        onChange={(t) => {
          setActiveTab(t);
          setSelected({});
        }}
        className="bg-white"
      />

      <FlatList
        data={filtered}
        keyExtractor={(r) => String(r.bookingId)}
        contentContainerStyle={{ padding: 12, paddingBottom: selectedReqs.length ? 110 : 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
              setTimeout(() => setRefreshing(false), 700);
            }}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Ship size={36} color={colors.muted} />}
            title="No shipment requests"
            subtitle="Send us a parcel you bought yourself and we'll ship it."
            actionLabel="Ship For Me"
            onAction={() => navigation.navigate('MoreTab', { screen: 'ShipForMeForm' })}
          />
        }
        renderItem={({ item }) => (
          <ShipmentCard
            req={item}
            selectable
            selected={!!selected[item.bookingId]}
            onToggleSelect={() =>
              setSelected((p) => {
                const n = { ...p };
                if (n[item.bookingId]) delete n[item.bookingId];
                else n[item.bookingId] = true;
                return n;
              })
            }
            onPress={() => navigation.navigate('ShipRequestDetail', { bookingId: item.bookingId })}
            onPay={() => setPayTarget([item])}
            onRefund={() => setRefundTarget(item)}
            onInvoice={() => navigation.navigate('ShipmentInvoice', { bookingId: item.bookingId })}
          />
        )}
      />

      {selectedReqs.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-3 pt-2.5 pb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-2xs text-gray-500">
              {selectedReqs.length} shipment{selectedReqs.length === 1 ? '' : 's'} selected
            </Text>
            <Text className="text-md font-extrabold text-brand">
              ৳{combinedDue.toLocaleString()}
            </Text>
          </View>
          <Button title="Pay together" onPress={() => setPayTarget(selectedReqs)} />
        </View>
      )}

      <ShipmentPaymentModal
        visible={!!payTarget}
        bookings={payTarget || []}
        currentUser={currentUser}
        onClose={() => setPayTarget(null)}
        onSuccess={() => {
          setPayTarget(null);
          setSelected({});
          load();
        }}
      />

      <RefundApplyModal
        visible={!!refundTarget}
        target={refundTarget}
        kind="productRequest"
        mode={refundTarget ? refundMode(refundTarget) : 'quick'}
        onClose={() => setRefundTarget(null)}
        onSuccess={load}
      />
    </DashboardLayout>
  );
}
