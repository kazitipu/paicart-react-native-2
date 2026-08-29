import React, { useEffect, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { CheckCircle2, XCircle, Clock } from 'lucide-react-native';
import Button from '@/components/ui/Button';
import { getAllOrdersApiRedux, getAllBookingsOfSingleUserRedux } from '@/store/actions';
import colors from '@/theme/colors';

/* Where the bKash gateway sends the customer back to.
 *
 * ⚠️ REQUIRES A BACKEND CHANGE. The web passed `window.location.href` as its
 * return URL; there is no such page on mobile, so paicart.com's bkash
 * create-payment and callback must honour `paicart://payment-return`. Until
 * that ships, the payment completes on bKash's side but the app is never
 * returned to — the customer would have to come back manually and the order
 * would show its payment as pending. Tracked as issue #2 in MIGRATION.md.
 *
 * The gateway is the authority on the result; nothing is written here. The
 * screen only reports what came back and refreshes the lists so the customer
 * sees the updated status. */
export default function PaymentReturn() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.user?.currentUser);

  const params = route.params || {};
  const status = useMemo(() => {
    const raw = String(params.status || params.paymentStatus || '').toLowerCase();
    if (raw.includes('success') || raw === 'completed') return 'success';
    if (raw.includes('cancel')) return 'cancelled';
    if (raw.includes('fail') || raw.includes('error')) return 'failed';
    /* No status at all most likely means the gateway redirected without one —
       treat it as pending rather than claiming a success we cannot verify. */
    return 'pending';
  }, [params]);

  useEffect(() => {
    if (!currentUser?.id) return;
    dispatch(getAllOrdersApiRedux(currentUser.id));
    dispatch(getAllBookingsOfSingleUserRedux(currentUser.id));
  }, [currentUser?.id, dispatch]);

  const view = {
    success: {
      Icon: CheckCircle2,
      color: colors.success,
      title: 'Payment received',
      body: 'Thanks — your payment went through. We will confirm your order shortly.',
    },
    cancelled: {
      Icon: XCircle,
      color: colors.muted,
      title: 'Payment cancelled',
      body: 'No money was taken. You can pay from My Orders whenever you are ready.',
    },
    failed: {
      Icon: XCircle,
      color: colors.brand,
      title: "Payment didn't go through",
      body: 'Nothing was charged. Please try again, or pay by direct deposit instead.',
    },
    pending: {
      Icon: Clock,
      color: colors.warning,
      title: 'Payment is being confirmed',
      body: "We're waiting on bKash to confirm this. Your order will update automatically.",
    },
  }[status];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background items-center justify-center px-8">
      <view.Icon size={56} color={view.color} />
      <Text className="text-lg font-extrabold text-foreground mt-4 text-center">{view.title}</Text>
      <Text className="text-smd text-gray-500 text-center mt-2">{view.body}</Text>

      <Button
        title="View my orders"
        className="mt-6 self-stretch"
        onPress={() =>
          navigation.reset({
            index: 0,
            routes: [
              { name: 'Tabs', params: { screen: 'OrdersTab', params: { screen: 'BuyShipMyOrders' } } },
            ],
          })
        }
      />
      <Pressable
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] })}
        className="py-3"
      >
        <Text className="text-smd text-gray-500 font-semibold">Back to shopping</Text>
      </Pressable>
    </SafeAreaView>
  );
}
