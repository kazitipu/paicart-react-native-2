import React, { useEffect, useCallback, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Package } from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import OrderCard from '@/components/orders/OrderCard';
import EmptyState from '@/components/ui/EmptyState';
import { getAllOrdersApiRedux } from '@/store/actions';
import colors from '@/theme/colors';

/* Delivered and Forwarding Parcel were two 41-line web pages that differed
   only in their filter predicate. */
export default function FilteredOrderList({ title, predicate, emptyTitle, emptySubtitle }) {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.user?.currentUser);
  const orders = useSelector((s) => s.orders?.ordersApi || []);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    if (currentUser?.id) dispatch(getAllOrdersApiRedux(currentUser.id));
  }, [currentUser?.id, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = orders.filter(predicate);

  return (
    <DashboardLayout title={title} scroll={false}>
      <FlatList
        data={filtered}
        keyExtractor={(o) => String(o.orderId)}
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
            title={emptyTitle}
            subtitle={emptySubtitle}
          />
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => navigation.navigate('BuyShipOrderDetail', { orderId: item.orderId })}
            onInvoice={() =>
              navigation.navigate('OrderInvoice', { bookingId: item.orderId, kind: 'order' })
            }
          />
        )}
      />
    </DashboardLayout>
  );
}
