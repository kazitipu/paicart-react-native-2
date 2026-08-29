import React, { useEffect, useCallback, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Ship } from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import ShipmentCard from '@/components/shipping/ShipmentCard';
import EmptyState from '@/components/ui/EmptyState';
import { getAllShipForMeOfSingleUserRedux } from '@/store/actions';
import colors from '@/theme/colors';

export default function FilteredShipmentList({ title, predicate, emptyTitle, emptySubtitle }) {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.user?.currentUser);
  const requests = useSelector((s) => s.bookingRequests?.shipForMeOfSingleUser || []);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    if (currentUser?.id) dispatch(getAllShipForMeOfSingleUserRedux(currentUser.id));
  }, [currentUser?.id, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <DashboardLayout title={title} scroll={false}>
      <FlatList
        data={requests.filter(predicate)}
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
          <EmptyState icon={<Ship size={36} color={colors.muted} />} title={emptyTitle} subtitle={emptySubtitle} />
        }
        renderItem={({ item }) => (
          <ShipmentCard
            req={item}
            onPress={() => navigation.navigate('ShipRequestDetail', { bookingId: item.bookingId })}
            onInvoice={() => navigation.navigate('ShipmentInvoice', { bookingId: item.bookingId })}
          />
        )}
      />
    </DashboardLayout>
  );
}
