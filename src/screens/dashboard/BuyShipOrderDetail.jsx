import React, { useState, useEffect, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import DashboardLayout from '@/components/DashboardLayout';
import OrderCard from '@/components/orders/OrderCard';
import OrderPaymentModal from '@/components/OrderPaymentModal';
import RefundApplyModal from '@/components/RefundApplyModal';
import EmptyState from '@/components/ui/EmptyState';
import { getAllOrdersApiRedux } from '@/store/actions';
import { getAllPartials } from '@/lib/firebaseUtils';
import { refundMode } from '@/lib/refund';
import colors from '@/theme/colors';

export default function BuyShipOrderDetail() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { orderId } = route.params || {};

  const currentUser = useSelector((s) => s.user?.currentUser);
  const orders = useSelector((s) => s.orders?.ordersApi || []);
  const order = useMemo(
    () => orders.find((o) => String(o.orderId) === String(orderId)),
    [orders, orderId],
  );

  const [partials, setPartials] = useState([]);
  const [payOpen, setPayOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  useEffect(() => {
    if (!order && currentUser?.id) dispatch(getAllOrdersApiRedux(currentUser.id));
    getAllPartials().then((p) => setPartials(p || [])).catch(() => {});
  }, [order, currentUser?.id, dispatch]);

  if (!order) {
    return (
      <DashboardLayout title="Order">
        <View className="py-16 items-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Order #${order.orderId}`} contentClassName="p-3">
      <OrderCard
        order={order}
        defaultOpen
        onPay={() => setPayOpen(true)}
        onRefund={() => setRefundOpen(true)}
        onInvoice={() =>
          navigation.navigate('OrderInvoice', { bookingId: order.orderId, kind: 'order' })
        }
      />

      <OrderPaymentModal
        visible={payOpen}
        orders={[order]}
        currentUser={currentUser}
        activePartial={partials[0] || null}
        onClose={() => setPayOpen(false)}
        onSuccess={() => {
          setPayOpen(false);
          dispatch(getAllOrdersApiRedux(currentUser.id));
        }}
      />

      <RefundApplyModal
        visible={refundOpen}
        target={order}
        kind="order"
        mode={refundMode(order)}
        onClose={() => setRefundOpen(false)}
        onSuccess={() => dispatch(getAllOrdersApiRedux(currentUser.id))}
      />
    </DashboardLayout>
  );
}
