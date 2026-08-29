import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import EmptyState from '@/components/ui/EmptyState';
import CopyIdButton from '@/components/CopyIdButton';
import { getSingleOrderApi } from '@/lib/firebaseUtils';
import { readyStepLabel } from '@/lib/shipment';
import colors from '@/theme/colors';

export default function LegacyOrderLogistics() {
  const navigation = useNavigation();
  const route = useRoute();
  const { orderId } = route.params || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getSingleOrderApi(orderId)
      .then((o) => alive && setOrder(o || null))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [orderId]);

  const rows = order
    ? [
        { label: 'Tracking number', value: order.trackingNo },
        { label: 'Carrier', value: order.carrier || order.courier },
        { label: 'Shipment method', value: order.shipmentMethod || 'Air' },
        { label: 'Status', value: readyStepLabel(order, order.shipmentStatus || '—') },
        { label: 'Received weight', value: order.receivedWeight ? `${order.receivedWeight} kg` : null },
        { label: 'ETA', value: order.estimatedDelivery },
      ].filter((r) => r.value)
    : [];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
          <ArrowLeft size={22} color={colors.foreground} />
        </Pressable>
        <Text className="flex-1 text-md font-bold text-foreground">Logistics</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !order ? (
        <EmptyState title="Order not found" />
      ) : (
        <ScrollView contentContainerClassName="p-3 pb-10">
          <View className="bg-white rounded-xl border border-gray-100 p-3">
            {rows.map((r) => (
              <View key={r.label} className="flex-row items-center justify-between py-1.5">
                <Text className="text-smd text-gray-500">{r.label}</Text>
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-smd font-semibold text-foreground">{r.value}</Text>
                  {r.label === 'Tracking number' && <CopyIdButton value={r.value} />}
                </View>
              </View>
            ))}
            {rows.length === 0 && (
              <Text className="text-smd text-gray-400 py-4 text-center">
                No logistics information yet.
              </Text>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
