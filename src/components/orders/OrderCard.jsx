import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Clock, RotateCcw, Receipt } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import CopyIdButton from '@/components/CopyIdButton';
import Collapsible from '@/components/ui/Collapsible';
import { StatusBadge, PaymentBadge } from '@/components/ui/StatusBadge';
import { getGoodsTotal, getTotalPaid, getTotalDue, getOfferDiscount, canPayOrder } from '@/lib/orderMath';
import { isFullyUnpaid, isCancelled, remainingMs, formatCountdown } from '@/lib/orderTabs';
import { canApplyRefund, refundMode } from '@/lib/refund';
import colors from '@/theme/colors';

/* Live countdown on an order still inside its 72-hour unpaid window. */
function UnpaidCountdown({ order }) {
  const [ms, setMs] = useState(() => remainingMs(order));

  useEffect(() => {
    if (!isFullyUnpaid(order) || isCancelled(order)) return undefined;
    const t = setInterval(() => setMs(remainingMs(order)), 1000);
    return () => clearInterval(t);
  }, [order]);

  if (!isFullyUnpaid(order) || isCancelled(order) || ms <= 0) return null;

  return (
    <View className="flex-row items-center gap-1.5 rounded-lg bg-amber-soft border border-amber-line px-2.5 py-1.5 mt-2">
      <Clock size={12} color="#8a5a06" />
      <Text className="text-2xs text-amber-900 flex-1">
        পেমেন্ট বাকি — {formatCountdown(ms)} বাকি আছে
      </Text>
    </View>
  );
}

/* One order in a list. The web repeated this markup across My Orders, the
   detail screen, Delivered and Forwarding Parcel with three independent
   collapsibles each; this is the one copy. */
export default function OrderCard({
  order,
  selectable = false,
  selected = false,
  onToggleSelect,
  onPress,
  onPay,
  onRefund,
  onBuyAgain,
  onInvoice,
  defaultOpen = false,
}) {
  const goods = getGoodsTotal(order);
  const paid = getTotalPaid(order);
  const due = Math.max(0, getTotalDue(order));
  const offer = getOfferDiscount(order);
  const payable = canPayOrder(order);
  const refundable = canApplyRefund(order);

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
          <Text className="text-smd font-bold text-foreground">#{order.orderId}</Text>
          <CopyIdButton value={order.orderId} />
          <View className="flex-1" />
          <PaymentBadge status={order.paymentStatus} />
        </View>

        <View className="flex-row items-center gap-2 mt-1.5">
          <StatusBadge status={order.orderStatus} req={order} />
          {!!order.orderedDate && (
            <Text className="text-2xs text-gray-400">{order.orderedDate}</Text>
          )}
          {!!order.refundStatus && (
            <View className="rounded-full bg-red-50 px-2 py-0.5">
              <Text className="text-2xs font-bold text-brand">Refund {order.refundStatus}</Text>
            </View>
          )}
        </View>

        <UnpaidCountdown order={order} />

        {/* Item strip */}
        <View className="flex-row gap-2 mt-3">
          {(order.items || []).slice(0, 4).map((item, i) => (
            <ProductImage key={`${item.id}-${i}`} uri={item.picture} thumb className="w-12 h-12 rounded-lg" />
          ))}
          {(order.items || []).length > 4 && (
            <View className="w-12 h-12 rounded-lg bg-gray-100 items-center justify-center">
              <Text className="text-2xs text-gray-500">+{order.items.length - 4}</Text>
            </View>
          )}
        </View>
      </Pressable>

      <View className="px-3">
        <Collapsible title="Items" defaultOpen={defaultOpen}>
          {(order.items || []).map((item, i) => (
            <View key={`${item.id}-${i}`} className="flex-row gap-2.5 py-1.5">
              <ProductImage uri={item.picture} thumb className="w-10 h-10 rounded" />
              <View className="flex-1">
                <Text className="text-2xs text-foreground" numberOfLines={2}>
                  {item.name}
                </Text>
                {(item.skus || []).map((sku, n) => (
                  <Text key={n} className="text-xxs text-gray-400">
                    {[sku.color, sku.size].filter(Boolean).join(' / ') || 'Default'} ×{' '}
                    {sku.totalQuantity}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </Collapsible>

        <Collapsible title="Bill" defaultOpen={defaultOpen}>
          {[
            { label: 'Goods', value: goods },
            ...(order.shippingChargeCustomer > 0
              ? [{ label: 'International freight', value: parseInt(order.shippingChargeCustomer, 10) }]
              : []),
            ...(order.localShipping > 0
              ? [{ label: 'China local courier', value: parseInt(order.localShipping, 10) }]
              : []),
            ...(order.otherCost > 0 ? [{ label: 'Other', value: parseInt(order.otherCost, 10) }] : []),
            ...(order.discount > 0
              ? [{ label: 'Discount', value: -parseInt(order.discount, 10), tone: 'green' }]
              : []),
            ...(offer > 0 ? [{ label: 'Pay-now offer', value: -offer, tone: 'green' }] : []),
            { label: 'Paid', value: -paid, tone: 'green' },
          ].map((r) => (
            <View key={r.label} className="flex-row justify-between py-0.5">
              <Text className="text-2xs text-gray-500">{r.label}</Text>
              <Text
                className={`text-2xs font-semibold ${r.tone === 'green' ? 'text-invoice-ok' : 'text-foreground'}`}
              >
                {r.value < 0 ? '−' : ''}৳{Math.abs(Math.round(r.value)).toLocaleString()}
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

        {(!!order.receivedWeight || !!order.trackingNo) && (
          <Collapsible title="Shipment">
            {[
              { label: 'Tracking number', value: order.trackingNo },
              { label: 'Method', value: order.shipmentMethod || 'Air' },
              {
                label: 'Received weight',
                value: order.receivedWeight ? `${order.receivedWeight} kg` : null,
              },
            ]
              .filter((r) => r.value)
              .map((r) => (
                <View key={r.label} className="flex-row justify-between py-0.5">
                  <Text className="text-2xs text-gray-500">{r.label}</Text>
                  <Text className="text-2xs font-semibold text-foreground">{r.value}</Text>
                </View>
              ))}
          </Collapsible>
        )}
      </View>

      {/* Actions */}
      <View className="flex-row flex-wrap gap-2 px-3 py-2.5 border-t border-gray-100">
        {payable && onPay && (
          <Pressable onPress={onPay} className="bg-primary rounded-lg px-3.5 py-2 active:opacity-80">
            <Text className="text-white text-2xs font-bold">Pay ৳{due.toLocaleString()}</Text>
          </Pressable>
        )}
        {refundable && onRefund && (
          <Pressable
            onPress={() => onRefund(refundMode(order))}
            className="flex-row items-center gap-1 border border-gray-200 rounded-lg px-3 py-2"
          >
            <RotateCcw size={11} color={colors.muted} />
            <Text className="text-2xs font-semibold text-gray-600">Refund</Text>
          </Pressable>
        )}
        {onInvoice && (
          <Pressable
            onPress={onInvoice}
            className="flex-row items-center gap-1 border border-gray-200 rounded-lg px-3 py-2"
          >
            <Receipt size={11} color={colors.muted} />
            <Text className="text-2xs font-semibold text-gray-600">Invoice</Text>
          </Pressable>
        )}
        {onBuyAgain && (
          <Pressable
            onPress={onBuyAgain}
            className="border border-gray-200 rounded-lg px-3 py-2"
          >
            <Text className="text-2xs font-semibold text-gray-600">Buy again</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
