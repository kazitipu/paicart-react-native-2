import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { RotateCcw } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import CopyIdButton from '@/components/CopyIdButton';
import Collapsible from '@/components/ui/Collapsible';
import { StatusBadge, PaymentBadge } from '@/components/ui/StatusBadge';
import { useNavigation } from '@react-navigation/native';
import { canApplyRefund, refundMode } from '@/lib/refund';
import { isRefundGiven } from '@/lib/buckets';
import { ROUTES } from '@/navigation/routes';
import colors from '@/theme/colors';

/* A "Buy For Me" product request. Unlike an order it is a single product with
   a quantity rather than a shops/items/skus tree, which is why the refund
   modal skips its per-SKU picker for these. */
export default function RequestCard({
  request, onPress, onPay, onRefund, selectable = false, selected = false, onToggleSelect,
}) {
  const total = parseInt(request.totalAmount ?? request.amount ?? 0, 10) || 0;
  const paid = (request.payments || []).reduce((a, p) => a + (parseInt(p.amount, 10) || 0), 0);
  const due = Math.max(0, total - paid);
  const navigation = useNavigation();
  /* Nothing is owed on a rejected request, or once a refund is given */
  const refundGiven = isRefundGiven(request);
  const payable = due > 0 && request.paymentStatus !== 'pending'
    && request.status !== 'Reject' && !refundGiven;
  const refundable = canApplyRefund(request);

  return (
    <View className="bg-white rounded-xl border border-gray-100 mb-2.5 overflow-hidden">
      <Pressable onPress={onPress} className="px-3 pt-3">
        <View className="flex-row items-center gap-2">
          {selectable && payable && (
            <Pressable
              onPress={onToggleSelect}
              hitSlop={8}
              className="w-5 h-5 rounded border-2 items-center justify-center"
              style={{
                borderColor: selected ? colors.primary : '#d1d5db',
                backgroundColor: selected ? colors.primary : 'transparent',
              }}
            >
              {selected && <Text className="text-white text-2xs font-bold">✓</Text>}
            </Pressable>
          )}
          <Text className="text-smd font-bold text-foreground">#{request.bookingId}</Text>
          <CopyIdButton value={request.bookingId} />
          <View className="flex-1" />
          <PaymentBadge status={request.paymentStatus} />
        </View>

        <View className="flex-row items-center gap-2 mt-1.5">
          <StatusBadge status={request.status} req={request} />
          {!!request.date && <Text className="text-2xs text-gray-400">{request.date}</Text>}
        </View>

        <View className="flex-row gap-2.5 mt-3">
          <ProductImage uri={request.imageUrl || request.image} thumb className="w-14 h-14 rounded-lg" />
          <View className="flex-1">
            <Text className="text-2xs text-foreground" numberOfLines={2}>
              {request.productName || request.productType || 'Product request'}
            </Text>
            <Text className="text-xxs text-gray-400 mt-0.5">
              Qty {request.quantity || 1}
              {request.variant ? ` · ${request.variant}` : ''}
            </Text>
          </View>
        </View>
      </Pressable>

      <View className="px-3">
        <Collapsible title="Bill">
          {[
            { label: 'Total', value: total },
            { label: 'Paid', value: -paid, tone: 'green' },
          ].map((r) => (
            <View key={r.label} className="flex-row justify-between py-0.5">
              <Text className="text-2xs text-gray-500">{r.label}</Text>
              <Text
                className={`text-2xs font-semibold ${r.tone === 'green' ? 'text-invoice-ok' : 'text-foreground'}`}
              >
                {r.value < 0 ? '−' : ''}৳{Math.abs(r.value).toLocaleString()}
              </Text>
            </View>
          ))}
          <View className="flex-row justify-between pt-1.5 mt-1 border-t border-gray-100">
            <Text className="text-smd font-bold text-foreground">Due</Text>
            <Text className="text-smd font-extrabold text-invoice-bad">
              ৳{due.toLocaleString()}
            </Text>
          </View>
        </Collapsible>

        {!!request.trackingNo && (
          <Collapsible title="Tracking">
            <View className="flex-row flex-wrap gap-1.5">
              {String(request.trackingNo)
                .split(',')
                .filter(Boolean)
                .map((t) => (
                  <View key={t} className="bg-gray-100 rounded-full px-2.5 py-1">
                    <Text className="text-xxs text-gray-600">{t.trim()}</Text>
                  </View>
                ))}
            </View>
          </Collapsible>
        )}
      </View>

      <View className="flex-row flex-wrap gap-2 px-3 py-2.5 border-t border-gray-100">
        {payable && onPay && (
          <Pressable onPress={onPay} className="bg-primary rounded-lg px-3.5 py-2 active:opacity-80">
            <Text className="text-white text-2xs font-bold">Pay ৳{due.toLocaleString()}</Text>
          </Pressable>
        )}
        {/* Book Again replaces Pay once the refund is given: Buy For Me,
            pre-filled from this request */}
        {refundGiven && (
          <Pressable
            onPress={() =>
              navigation.navigate(ROUTES.BuyForMe.tab, { screen: 'BuyForMe', params: { rebook: request } })
            }
            className="bg-primary rounded-lg px-3.5 py-2 active:opacity-80"
          >
            <Text className="text-white text-2xs font-bold">Book Again</Text>
          </Pressable>
        )}
        {refundable && onRefund && (
          <Pressable
            onPress={() => onRefund(refundMode(request))}
            className="flex-row items-center gap-1 border border-gray-200 rounded-lg px-3 py-2"
          >
            <RotateCcw size={11} color={colors.muted} />
            <Text className="text-2xs font-semibold text-gray-600">Refund</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
