import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { RotateCcw, Receipt } from 'lucide-react-native';
import CopyIdButton from '@/components/CopyIdButton';
import Collapsible from '@/components/ui/Collapsible';
import { StatusBadge, PaymentBadge } from '@/components/ui/StatusBadge';
import { getTotal, canPayShipment } from '@/lib/shipForMe';
import { isSeaShipment } from '@/lib/shipment';
import { canApplyRefund, refundMode } from '@/lib/refund';
import colors from '@/theme/colors';

export default function ShipmentCard({
  req, onPress, onPay, onRefund, onInvoice,
  selectable = false, selected = false, onToggleSelect,
}) {
  const freight = parseInt(req.shippingChargeCustomer, 10) || 0;
  const other = parseInt(req.otherCost, 10) || 0;
  const discount = parseInt(req.discount, 10) || 0;
  const paid = getTotal(req);
  const due = Math.max(0, freight + other - discount - paid);
  const payable = canPayShipment(req);
  const refundable = canApplyRefund(req);

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
          <Text className="text-smd font-bold text-foreground">#{req.bookingId}</Text>
          <CopyIdButton value={req.bookingId} />
          <View className="flex-1" />
          <PaymentBadge status={req.paymentStatus} />
        </View>

        <View className="flex-row items-center gap-2 mt-1.5">
          <StatusBadge status={req.status} req={req} />
          <Text className="text-2xs text-gray-400">
            {isSeaShipment(req) ? 'By Sea' : 'By Air'}
          </Text>
          {!!req.date && <Text className="text-2xs text-gray-400">{req.date}</Text>}
        </View>

        <View className="flex-row items-center gap-3 mt-2.5">
          <View>
            <Text className="text-xxs text-gray-400">Product</Text>
            <Text className="text-2xs font-semibold text-foreground" numberOfLines={1}>
              {req.productName || req.productType || '—'}
            </Text>
          </View>
          <View>
            <Text className="text-xxs text-gray-400">CTN</Text>
            <Text className="text-2xs font-semibold text-foreground">{req.ctn || '—'}</Text>
          </View>
          <View>
            <Text className="text-xxs text-gray-400">Weight</Text>
            <Text className="text-2xs font-semibold text-foreground">
              {req.receivedWeight ? `${req.receivedWeight} kg` : '—'}
            </Text>
          </View>
        </View>
      </Pressable>

      <View className="px-3">
        {freight > 0 && (
          <Collapsible title="Shipping bill">
            {[
              { label: 'Freight', value: freight },
              ...(other > 0 ? [{ label: 'Other cost', value: other }] : []),
              ...(discount > 0 ? [{ label: 'Discount', value: -discount, tone: 'green' }] : []),
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
        )}

        {!!req.trackingNo && (
          <Collapsible title="Tracking numbers">
            <View className="flex-row flex-wrap gap-1.5">
              {String(req.trackingNo)
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
        {refundable && onRefund && (
          <Pressable
            onPress={() => onRefund(refundMode(req))}
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
      </View>
    </View>
  );
}
