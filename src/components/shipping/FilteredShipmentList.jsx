import React, { useEffect, useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSelector, useDispatch } from 'react-redux';
import DashboardLayout from '@/components/DashboardLayout';
import { fs, usDate } from '@/components/orders/OrderBits';
import { C, SHADOW } from '@/components/product/ui';
import { getAllShipForMeOfSingleUserRedux } from '@/store/actions';

/* ═══════════════════════════════════════════════════════════════════════
   Web ship-for-me/my-delivered and my-forwarding-parcel pages (identical
   40-line pages, < 640px): DashboardLayout `webChrome`, `space-y-3`, an
   empty card (`rounded-2xl shadow-sm p-12`, 48px icon, gray-400 line) or one
   `rounded-2xl shadow-sm p-5` row per shipment — a tinted 40px icon tile,
   the item name (or booking ID) and a subtitle line.

   The web pages dispatch getAllShipForMeOfSingleUserRedux but then read
   `state.shipForMeList.shipForMeList` — the admin's product-type list, not
   the user's shipments — so they could never show anything. The same read
   is made here and its result (the user's shipments) is what is filtered.
   ═══════════════════════════════════════════════════════════════════════ */

export default function FilteredShipmentList({ title, predicate, Icon, tint, iconColor, emptyText, subtitle }) {
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.user?.currentUser);
  const requests = useSelector((s) => s.bookingRequests?.shipForMeOfSingleUser || []);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    () => (currentUser?.id ? Promise.resolve(dispatch(getAllShipForMeOfSingleUserRedux(currentUser.id))) : Promise.resolve()),
    [currentUser?.id, dispatch],
  );

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

  const items = requests.filter(predicate);

  return (
    <DashboardLayout
      webChrome
      title={title}
      onRefresh={onRefresh}
      refreshing={refreshing}
      list={{
        data: items,
        keyExtractor: (item, i) => String(item.bookingId || i),
        renderItem: ({ item }) => (
          <Animated.View
            entering={FadeIn.duration(220)}
            style={{ backgroundColor: '#ffffff', borderRadius: 16, boxShadow: SHADOW.base, padding: 20 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, backgroundColor: tint, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={iconColor} />
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text style={[fs('sm'), { fontWeight: '500', color: C.gray800 }]}>{item.itemName || item.bookingId}</Text>
                <Text style={[fs('xs'), { color: C.gray400 }]}>{subtitle(item)}</Text>
              </View>
            </View>
          </Animated.View>
        ),
        ItemSeparatorComponent: Gap,
        ListEmptyComponent: (
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, boxShadow: SHADOW.base, padding: 48, alignItems: 'center' }}>
            <View style={{ marginBottom: 12 }}>
              <Icon size={48} color={C.gray200} />
            </View>
            <Text style={{ fontSize: 16, lineHeight: 24, color: C.gray400, textAlign: 'center' }}>{emptyText}</Text>
          </View>
        ),
      }}
    />
  );
}

/* `new Date(time).toLocaleDateString()` */
export const timeDate = (item) => (item.time ? usDate(item.time) : '');

function Gap() {
  return <View style={{ height: 12 }} />;
}
