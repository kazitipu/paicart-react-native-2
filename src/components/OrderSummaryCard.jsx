import React from 'react';
import { View, Text } from 'react-native';
import ProductImage from '@/components/ui/ProductImage';
import CopyIdButton from '@/components/CopyIdButton';
import { StatusBadge, PaymentBadge } from '@/components/ui/StatusBadge';

/* Shared read-only rendering of one order document — the shops/items/skus tree
   plus its badges. Used by the order-success and legacy order screens, which
   on the web each re-implemented it. */
export default function OrderSummaryCard({ order, showStatus = true }) {
  if (!order) return null;
  return (
    <View className="bg-white rounded-xl border border-gray-100 p-3">
      <View className="flex-row items-center gap-2">
        <Text className="text-smd font-bold text-foreground">#{order.orderId}</Text>
        <CopyIdButton value={order.orderId} />
        <View className="flex-1" />
        {showStatus && (
          <View className="flex-row gap-1.5">
            <StatusBadge status={order.orderStatus} req={order} />
            <PaymentBadge status={order.paymentStatus} />
          </View>
        )}
      </View>

      {!!order.orderedDate && (
        <Text className="text-2xs text-gray-400 mt-1">
          {order.orderedDate} {order.orderedTime || ''}
        </Text>
      )}

      {(order.items || []).map((item, i) => (
        <View key={`${item.id}-${i}`} className="flex-row gap-2.5 mt-3">
          <ProductImage uri={item.picture} thumb className="w-12 h-12 rounded-lg" />
          <View className="flex-1">
            <Text className="text-2xs text-foreground" numberOfLines={2}>
              {item.name}
            </Text>
            {(item.skus || []).map((sku, n) => (
              <Text key={n} className="text-xxs text-gray-400 mt-0.5">
                {[sku.color, sku.size].filter(Boolean).join(' / ') || 'Default'} ×{' '}
                {sku.totalQuantity} · ৳
                {(parseInt(sku.price, 10) * parseInt(sku.totalQuantity, 10)).toLocaleString()}
              </Text>
            ))}
          </View>
        </View>
      ))}

      {!!order.deliveryAddress && (
        <View className="mt-3 pt-3 border-t border-gray-100">
          <Text className="text-xxs uppercase tracking-widest text-gray-400 font-bold mb-1">
            Deliver to
          </Text>
          <Text className="text-2xs text-foreground">
            {order.deliveryAddress.name} · {order.deliveryAddress.phone}
          </Text>
          <Text className="text-2xs text-gray-500">
            {[
              order.deliveryAddress.address,
              order.deliveryAddress.area?.name,
              order.deliveryAddress.district,
            ]
              .filter(Boolean)
              .join(', ')}
          </Text>
        </View>
      )}
    </View>
  );
}
