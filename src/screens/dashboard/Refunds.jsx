import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RotateCcw } from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import Tabs from '@/components/ui/Tabs';
import SoftPill from '@/components/ui/SoftPill';
import CopyIdButton from '@/components/CopyIdButton';
import EmptyState from '@/components/ui/EmptyState';
import {
  getAllOrdersApiRedux, getAllBookingsOfSingleUserRedux, getAllShipForMeOfSingleUserRedux,
} from '@/store/actions';
import colors from '@/theme/colors';
import { refundedAmount } from '@/lib/refund';

const TABS = [
  { key: 'order', label: 'Orders' },
  { key: 'productRequest', label: 'Product Requests' },
  { key: 'shipment', label: 'Shipments' },
];

const STATUS_COLOR = {
  requested: 'orange',
  pending: 'orange',
  approved: 'emerald',
  completed: 'emerald',
  rejected: 'red',
  reject: 'red',
};

export default function Refunds() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.user?.currentUser);

  const orders = useSelector((s) => s.orders?.ordersApi || []);
  const requests = useSelector((s) => s.bookingRequests?.bookingsArrayOfSingleUser || []);
  const shipments = useSelector((s) => s.bookingRequests?.shipForMeOfSingleUser || []);

  const [tab, setTab] = useState('order');
  const [refreshing, setRefreshing] = useState(false);

  /* All three lists load on mount, as on the web — the counts on the tabs
     would otherwise be wrong until each tab was visited. */
  const load = useCallback(() => {
    if (!currentUser?.id) return;
    dispatch(getAllOrdersApiRedux(currentUser.id));
    dispatch(getAllBookingsOfSingleUserRedux(currentUser.id));
    dispatch(getAllShipForMeOfSingleUserRedux(currentUser.id));
  }, [currentUser?.id, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const buckets = useMemo(
    () => ({
      order: orders.filter((o) => o.refundStatus),
      productRequest: requests.filter((r) => r.refundStatus),
      shipment: shipments.filter((r) => r.refundStatus),
    }),
    [orders, requests, shipments],
  );

  const open = (item) => {
    if (tab === 'order') navigation.navigate('BuyShipOrderDetail', { orderId: item.orderId });
    else if (tab === 'productRequest')
      navigation.navigate('BuyShipRequestDetail', { orderId: item.bookingId });
    else navigation.navigate('ShipRequestDetail', { bookingId: item.bookingId });
  };

  return (
    <DashboardLayout title="Refunds" scroll={false}>
      <Tabs
        items={TABS.map((t) => ({ ...t, count: buckets[t.key].length }))}
        value={tab}
        onChange={setTab}
        className="bg-white"
      />

      <FlatList
        data={buckets[tab]}
        keyExtractor={(i) => String(i.orderId || i.bookingId)}
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
            icon={<RotateCcw size={36} color={colors.muted} />}
            title="No refund requests"
            subtitle="Refunds you apply for will be tracked here."
          />
        }
        renderItem={({ item }) => {
          const id = item.orderId || item.bookingId;
          const status = String(item.refundStatus || '').toLowerCase();
          return (
            <Pressable
              onPress={() => open(item)}
              className="bg-white rounded-xl border border-gray-100 p-3 mb-2.5"
            >
              <View className="flex-row items-center gap-2">
                <Text className="text-smd font-bold text-foreground">#{id}</Text>
                <CopyIdButton value={id} />
                <View className="flex-1" />
                <SoftPill color={STATUS_COLOR[status] || 'gray'}>
                  {item.refundStatus}
                </SoftPill>
              </View>
              {/* The amount lives in `refund` on the record (set when the admin
                  approves) — `refundAmount` only exists on refund requests */}
              {refundedAmount(item) > 0 && (
                <Text className="text-2xs text-gray-500 mt-1.5">
                  Refunded ৳{refundedAmount(item).toLocaleString()}
                </Text>
              )}
              {!!(item.orderedDate || item.date) && (
                <Text className="text-xxs text-gray-400 mt-0.5">
                  {item.orderedDate || item.date}
                </Text>
              )}
            </Pressable>
          );
        }}
      />
    </DashboardLayout>
  );
}
