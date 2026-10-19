import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, TextInput, FlatList, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Search, Package } from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import RequestCard from '@/components/orders/RequestCard';
import RefundApplyModal from '@/components/RefundApplyModal';
import BookingPaymentModal from '@/components/payments/BookingPaymentModal';
import Tabs from '@/components/ui/Tabs';
import EmptyState from '@/components/ui/EmptyState';
import { getAllBookingsOfSingleUserRedux } from '@/store/actions';
import { refundMode } from '@/lib/refund';
import { isFullyRefunded } from '@/lib/buckets';
import colors from '@/theme/colors';

const TABS = ['All', 'Pending', 'Approved', 'In Shipment', 'Delivered', 'Rejected'];

const matches = (r, tab) => {
  if (tab === 'All') return true;
  const s = String(r.status || 'Pending');
  /* Rejected or fully refunded requests have nothing left in transit */
  if (tab === 'In Shipment')
    return !!r.trackingNo && s !== 'Delivered' && s !== 'Reject' && !isFullyRefunded(r);
  return s === tab;
};

export default function BuyShipMyRequests() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  const currentUser = useSelector((s) => s.user?.currentUser);
  const requests = useSelector((s) => s.bookingRequests?.bookingsArrayOfSingleUser || []);

  const [activeTab, setActiveTab] = useState(route.params?.tab || 'All');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [payTarget, setPayTarget] = useState(null);
  const [refundTarget, setRefundTarget] = useState(null);

  const load = useCallback(() => {
    if (currentUser?.id) dispatch(getAllBookingsOfSingleUserRedux(currentUser.id));
  }, [currentUser?.id, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map((t) => [t, t === 'All' ? requests.length : requests.filter((r) => matches(r, t)).length]),
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

  return (
    <DashboardLayout title="My Product Requests" scroll={false}>
      <View className="px-3 py-2 bg-white">
        <View className="flex-row items-center bg-gray-100 rounded-full px-3">
          <Search size={14} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search requests"
            placeholderTextColor="#9ca3af"
            className="flex-1 text-smd text-foreground py-2.5 px-2"
          />
        </View>
      </View>

      <Tabs
        items={TABS.map((t) => ({ key: t, label: t, count: counts[t] }))}
        value={activeTab}
        onChange={setActiveTab}
        className="bg-white"
      />

      <FlatList
        data={filtered}
        keyExtractor={(r) => String(r.bookingId)}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
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
            icon={<Package size={36} color={colors.muted} />}
            title="No product requests"
            subtitle="Ask us to source anything from China."
            actionLabel="Request a product"
            onAction={() => navigation.navigate('MoreTab', { screen: 'BuyForMe' })}
          />
        }
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            onPress={() => navigation.navigate('BuyShipRequestDetail', { orderId: item.bookingId })}
            onPay={() => setPayTarget([item])}
            onRefund={() => setRefundTarget(item)}
          />
        )}
      />

      <BookingPaymentModal
        visible={!!payTarget}
        bookings={payTarget || []}
        currentUser={currentUser}
        onClose={() => setPayTarget(null)}
        onSuccess={() => {
          setPayTarget(null);
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
