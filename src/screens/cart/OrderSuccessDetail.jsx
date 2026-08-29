import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import OrderSummaryCard from '@/components/OrderSummaryCard';
import EmptyState from '@/components/ui/EmptyState';
import { getSingleOrderApi } from '@/lib/firebaseUtils';
import { getGoodsTotal, getTotalPaid, getTotalDue } from '@/lib/orderMath';
import colors from '@/theme/colors';

export default function OrderSuccessDetail() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getSingleOrderApi(id)
      .then((o) => alive && setOrder(o || null))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
          <ArrowLeft size={22} color={colors.foreground} />
        </Pressable>
        <Text className="flex-1 text-md font-bold text-foreground">Order details</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !order ? (
        <EmptyState title="Order not found" subtitle="We couldn't find that order." />
      ) : (
        <ScrollView contentContainerClassName="p-3 pb-10">
          <OrderSummaryCard order={order} />
          <View className="bg-white rounded-xl border border-gray-100 p-3 mt-3">
            {[
              { label: 'Goods total', value: getGoodsTotal(order) },
              { label: 'Paid', value: getTotalPaid(order), tone: 'green' },
              { label: 'Due', value: Math.max(0, getTotalDue(order)), tone: 'due' },
            ].map((r) => (
              <View key={r.label} className="flex-row justify-between py-1">
                <Text className="text-smd text-gray-600">{r.label}</Text>
                <Text
                  className={`text-smd font-semibold ${r.tone === 'green' ? 'text-invoice-ok' : r.tone === 'due' ? 'text-invoice-bad' : 'text-foreground'}`}
                >
                  ৳{Math.round(r.value).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
