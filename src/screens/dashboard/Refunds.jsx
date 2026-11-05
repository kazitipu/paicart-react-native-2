import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { ShoppingBag, Package, Truck, Plane, Ship } from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import { RefundsHeader, RefundTabs, RefundCard, RefundEmpty } from '@/components/refunds/RefundBits';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const refundDate = (t) => {
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
};
/* `key` belongs to FlatList's keyExtractor, not the card's props. */
const cardProps = ({ key, ...rest }) => rest; // eslint-disable-line no-unused-vars
import {
  getAllOrdersApiRedux, getAllBookingsOfSingleUserRedux, getAllShipForMeOfSingleUserRedux,
} from '@/store/actions';
import { cdn } from '@/lib/cdn';
import { getRefundState, hasRefundActivity } from '@/lib/refundsApi';

/* ═══════════════════════════════════════════════════════════════════════
   Web pages/dashboard/refund/page.jsx at < 640px. DashboardLayout
   `webChrome` (title "Refunds", showBack), then `space-y-4 pb-10`: the
   "My Refunds" header card, the three-up tab grid with counts, and the
   active tab's refund cards (`space-y-3`) or its empty state.

   Reads: the same three per-user lists the web page dispatches on mount —
   ordersApi, bookingRequest and shipForMe `where userId ==`. A record is
   listed when it has any refund activity (refundStatus, a refund amount, or
   a shipment's refundClaimRequested).
   ═══════════════════════════════════════════════════════════════════════ */

const TABS = [
  { id: 'order', label: 'Order', Icon: ShoppingBag },
  { id: 'productRequest', label: 'Product Request', Icon: Package },
  { id: 'shipment', label: 'Shipment', Icon: Truck },
];

const EMPTY = {
  order: { Icon: ShoppingBag, text: 'Refund requests for your orders will show up here.' },
  productRequest: { Icon: Package, text: 'Refund requests for your Buy For Me requests will show up here.' },
  shipment: { Icon: Truck, text: 'Refund claims for your Ship For Me requests will show up here.' },
};

/* Each source mapped onto the generic card, field for field as the web. */
const toOrderCard = (order) => {
  const item = order.items?.[0];
  return {
    key: `order-${order.orderId}`,
    image: cdn(item?.skus?.[0]?.image || item?.imgUrl || item?.picture || item?.pictures?.[0] || ''),
    title: item?.name || item?.productName || 'Order',
    refId: order.orderId,
    /* Chrome renders en-BD {day:'2-digit',month:'short',year:'numeric'} as "Oct 09, 2024". */
    date: order.time ? refundDate(order.time) : order.date,
    amount: order.refund,
    state: getRefundState(order),
    reason: order.refundNote,
    route: ['BuyShipOrderDetail', { orderId: order.orderId }],
  };
};
const toRequestCard = (booking) => ({
  key: `req-${booking.bookingId}`,
  image: cdn(booking.imageUrl),
  title: booking.productType || booking.othersProductName || 'Product Request',
  refId: booking.bookingId,
  date: booking.date,
  amount: booking.refund,
  state: getRefundState(booking),
  reason: booking.refundNote,
  route: ['BuyShipRequestDetail', { orderId: booking.bookingId }],
});
const toShipmentCard = (req) => ({
  key: `ship-${req.bookingId}`,
  image: cdn(req.imageUrl),
  title: req.othersProductName || 'Shipment',
  refId: req.bookingId,
  date: req.date,
  amount: req.refund,
  state: getRefundState(req),
  reason: req.refundNote || req.refundClaimNote,
  route: ['ShipRequestDetail', { bookingId: req.bookingId }],
  MethodIcon: req.method === 'sea' ? Ship : Plane,
});

const Gap = () => <View style={{ height: 12 }} />;

export default function Refunds() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.user?.currentUser);
  const orders = useSelector((s) => s.orders?.ordersApi || []);
  const requests = useSelector((s) => s.bookingRequests?.bookingsArrayOfSingleUser || []);
  const shipments = useSelector((s) => s.bookingRequests?.shipForMeOfSingleUser || []);

  const [activeTab, setActiveTab] = useState('order');
  const [loaded, setLoaded] = useState(orders.length + requests.length + shipments.length > 0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    if (!currentUser?.id) return Promise.resolve();
    return Promise.allSettled([
      dispatch(getAllOrdersApiRedux(currentUser.id)),
      dispatch(getAllBookingsOfSingleUserRedux(currentUser.id)),
      dispatch(getAllShipForMeOfSingleUserRedux(currentUser.id)),
    ]);
  }, [currentUser?.id, dispatch]);

  useEffect(() => {
    load().finally(() => setLoaded(true));
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

  const buckets = useMemo(
    () => ({
      order: orders.filter(hasRefundActivity).map(toOrderCard),
      productRequest: requests.filter(hasRefundActivity).map(toRequestCard),
      shipment: shipments.filter(hasRefundActivity).map(toShipmentCard),
    }),
    [orders, requests, shipments],
  );
  const counts = {
    order: buckets.order.length,
    productRequest: buckets.productRequest.length,
    shipment: buckets.shipment.length,
  };

  const open = useCallback((card) => navigation.navigate(...card.route), [navigation]);

  const empty = EMPTY[activeTab];

  return (
    <DashboardLayout
      webChrome
      title="Refunds"
      showBack
      onRefresh={onRefresh}
      refreshing={refreshing}
      list={{
        data: buckets[activeTab],
        keyExtractor: (c) => c.key,
        renderItem: ({ item }) => (
          <Animated.View entering={FadeIn.duration(220)}>
            <RefundCard {...cardProps(item)} onOpen={() => open(item)} />
          </Animated.View>
        ),
        ItemSeparatorComponent: Gap,
        ListEmptyComponent: (
          <Animated.View key={activeTab} entering={FadeIn.duration(220)}>
            <RefundEmpty Icon={empty.Icon} text={empty.text} loading={!loaded} />
          </Animated.View>
        ),
        /* pb-10 */
        ListFooterComponent: <View style={{ height: 40 }} />,
        initialNumToRender: 4,
        maxToRenderPerBatch: 4,
        windowSize: 7,
      }}
    >
      <View style={{ gap: 16, marginBottom: 16 }}>
        <RefundsHeader />
        <RefundTabs tabs={TABS} value={activeTab} counts={counts} onChange={setActiveTab} />
      </View>
    </DashboardLayout>
  );
}
