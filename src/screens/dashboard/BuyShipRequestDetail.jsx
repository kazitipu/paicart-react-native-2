import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import DashboardLayout from '@/components/DashboardLayout';
import RequestCard from '@/components/orders/RequestCard';
import RefundApplyModal from '@/components/RefundApplyModal';
import BookingPaymentModal from '@/components/payments/BookingPaymentModal';
import EmptyState from '@/components/ui/EmptyState';
import { getSingleProductRequest } from '@/lib/firebaseUtils';
import { refundMode } from '@/lib/refund';
import colors from '@/theme/colors';

export default function BuyShipRequestDetail() {
  const route = useRoute();
  const { orderId } = route.params || {};
  const currentUser = useSelector((s) => s.user?.currentUser);

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const load = () => {
    getSingleProductRequest(orderId)
      .then((r) => setRequest(r || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [orderId]);

  if (loading) {
    return (
      <DashboardLayout title="Product Request">
        <View className="py-16 items-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      </DashboardLayout>
    );
  }

  if (!request) {
    return (
      <DashboardLayout title="Product Request">
        <EmptyState title="Request not found" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Request #${request.bookingId}`} contentClassName="p-3">
      <RequestCard
        request={request}
        onPay={() => setPayOpen(true)}
        onRefund={() => setRefundOpen(true)}
      />
      <BookingPaymentModal
        visible={payOpen}
        bookings={[request]}
        currentUser={currentUser}
        onClose={() => setPayOpen(false)}
        onSuccess={() => {
          setPayOpen(false);
          load();
        }}
      />
      <RefundApplyModal
        visible={refundOpen}
        target={request}
        kind="productRequest"
        mode={refundMode(request)}
        onClose={() => setRefundOpen(false)}
        onSuccess={load}
      />
    </DashboardLayout>
  );
}
