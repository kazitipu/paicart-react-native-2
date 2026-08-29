import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Pressable, RefreshControl } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Search, Package } from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import OrderCard from '@/components/orders/OrderCard';
import OrderPaymentModal from '@/components/OrderPaymentModal';
import RefundApplyModal from '@/components/RefundApplyModal';
import Tabs from '@/components/ui/Tabs';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { getAllOrdersApiRedux, cancelUnpaidOrderRedux } from '@/store/actions';
import { getAllPartials } from '@/lib/firebaseUtils';
import { STATUS_TABS, matchesTab, tabCounts, expiredUnpaidOrders } from '@/lib/orderTabs';
import { canPayOrder, getTotalDue } from '@/lib/orderMath';
import colors from '@/theme/colors';

export default function BuyShipMyOrders() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  const currentUser = useSelector((s) => s.user?.currentUser);
  const orders = useSelector((s) => s.orders?.ordersApi || []);

  const [activeTab, setActiveTab] = useState(route.params?.tab || 'All');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [partials, setPartials] = useState([]);
  const [selected, setSelected] = useState({});
  const [payTarget, setPayTarget] = useState(null);
  const [refundTarget, setRefundTarget] = useState(null);

  const load = useCallback(() => {
    if (currentUser?.id) dispatch(getAllOrdersApiRedux(currentUser.id));
  }, [currentUser?.id, dispatch]);

  useEffect(() => {
    load();
    getAllPartials().then((p) => setPartials(p || [])).catch(() => {});
  }, [load]);

  /* Auto-cancel sweep for orders past their 72h unpaid window.
     ⚠️ Client-side, exactly as on the web — there is no server cron, so an
     order is only swept once someone opens this screen with it present. */
  useEffect(() => {
    expiredUnpaidOrders(orders).forEach((o) =>
      dispatch(cancelUnpaidOrderRedux(o.orderId, 'unpaid-window-expired')),
    );
  }, [orders, dispatch]);

  const counts = useMemo(() => tabCounts(orders), [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (!matchesTab(o, activeTab)) return false;
      if (!q) return true;
      return (
        String(o.orderId).toLowerCase().includes(q) ||
        String(o.trackingNo || '').toLowerCase().includes(q) ||
        (o.items || []).some((i) => String(i.name || '').toLowerCase().includes(q))
      );
    });
  }, [orders, activeTab, query]);

  const selectedOrders = useMemo(
    () => orders.filter((o) => selected[o.orderId] && canPayOrder(o)),
    [orders, selected],
  );
  const combinedDue = selectedOrders.reduce((a, o) => a + Math.max(0, getTotalDue(o)), 0);

  const onRefresh = () => {
    setRefreshing(true);
    load();
    setTimeout(() => setRefreshing(false), 700);
  };

  return (
    <DashboardLayout title="My Orders" scroll={false}>
      <View className="px-3 py-2 bg-white">
        <View className="flex-row items-center bg-gray-100 rounded-full px-3">
          <Search size={14} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by order ID, tracking or product"
            placeholderTextColor="#9ca3af"
            className="flex-1 text-smd text-foreground py-2.5 px-2"
          />
        </View>
      </View>

      <Tabs
        items={STATUS_TABS.map((t) => ({ key: t, label: t, count: counts[t] }))}
        value={activeTab}
        onChange={(t) => {
          setActiveTab(t);
          setSelected({});
        }}
        className="bg-white"
      />

      <FlatList
        data={filtered}
        keyExtractor={(o) => String(o.orderId)}
        contentContainerStyle={{ padding: 12, paddingBottom: selectedOrders.length ? 110 : 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon={<Package size={36} color={colors.muted} />}
            title={query ? 'No matching orders' : 'No orders here yet'}
            subtitle={
              query ? 'Try a different search.' : 'Orders you place will show up in this tab.'
            }
          />
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            selectable
            selected={!!selected[item.orderId]}
            onToggleSelect={() =>
              setSelected((p) => {
                const n = { ...p };
                if (n[item.orderId]) delete n[item.orderId];
                else n[item.orderId] = true;
                return n;
              })
            }
            onPress={() => navigation.navigate('BuyShipOrderDetail', { orderId: item.orderId })}
            onPay={() => setPayTarget([item])}
            onRefund={() => setRefundTarget(item)}
            onInvoice={() =>
              navigation.navigate('OrderInvoice', { bookingId: item.orderId, kind: 'order' })
            }
          />
        )}
      />

      {/* Combined payment bar */}
      {selectedOrders.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-3 pt-2.5 pb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-2xs text-gray-500">
              {selectedOrders.length} order{selectedOrders.length === 1 ? '' : 's'} selected
            </Text>
            <Text className="text-md font-extrabold text-brand">
              ৳{Math.round(combinedDue).toLocaleString()}
            </Text>
          </View>
          <Button title="Pay together" onPress={() => setPayTarget(selectedOrders)} />
        </View>
      )}

      <OrderPaymentModal
        visible={!!payTarget}
        orders={payTarget || []}
        currentUser={currentUser}
        activePartial={partials[0] || null}
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
        kind="order"
        mode={refundTarget ? (refundTarget.trackingNo ? 'afterSale' : 'quick') : 'quick'}
        onClose={() => setRefundTarget(null)}
        onSuccess={load}
      />
    </DashboardLayout>
  );
}
