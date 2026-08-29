import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Search, PackageSearch } from 'lucide-react-native';
import ShipmentProgress from '@/components/shipping/ShipmentProgress';
import CopyIdButton from '@/components/CopyIdButton';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { StatusBadge, PaymentBadge } from '@/components/ui/StatusBadge';
import { getOrderOrShipmentRequest } from '@/lib/firebaseUtils';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

export default function TrackOrder() {
  const navigation = useNavigation();
  const [q, setQ] = useState('');
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    setSearched(true);
    try {
      /* ⚠️ This helper does up to six Firestore round trips per lookup: three
         getDoc by id across ordersApi / shipForMe / bookingRequest, then three
         more queries on trackingNo if all miss. Worth optimising — issue #7. */
      const found = await getOrderOrShipmentRequest(term);
      setRecord(found || null);
    } catch {
      toast.error('Could not look that up. Please try again.');
      setRecord(null);
    }
    setLoading(false);
  };

  /* The admin writes each milestone's date under `${status}Date`. */
  const dates = record
    ? Object.keys(record).reduce((acc, k) => {
        if (k.endsWith('Date') && record[k]) acc[k.replace(/Date$/, '')] = record[k];
        return acc;
      }, {})
    : {};

  const id = record?.orderId || record?.bookingId;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <Text className="flex-1 text-md font-bold text-foreground">Track Order</Text>
      </View>

      <ScrollView contentContainerClassName="p-3 pb-10" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3">
          <Search size={15} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={search}
            returnKeyType="search"
            autoCapitalize="none"
            placeholder="Order ID, booking ID or tracking number"
            placeholderTextColor="#9ca3af"
            className="flex-1 text-smd text-foreground py-3 px-2"
          />
        </View>
        <Button title="Track" loading={loading} onPress={search} className="mt-2.5" />

        {loading ? (
          <View className="py-16 items-center">
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : record ? (
          <>
            <View className="bg-white rounded-xl border border-gray-100 p-3 mt-4">
              <View className="flex-row items-center gap-2">
                <Text className="text-smd font-bold text-foreground">#{id}</Text>
                <CopyIdButton value={id} />
                <View className="flex-1" />
                <PaymentBadge status={record.paymentStatus} />
              </View>
              <View className="flex-row items-center gap-2 mt-1.5">
                <StatusBadge status={record.orderStatus || record.status} req={record} />
                {!!(record.orderedDate || record.date) && (
                  <Text className="text-2xs text-gray-400">
                    {record.orderedDate || record.date}
                  </Text>
                )}
              </View>
              {!!record.trackingNo && (
                <View className="flex-row flex-wrap gap-1.5 mt-2.5">
                  {String(record.trackingNo)
                    .split(',')
                    .filter(Boolean)
                    .map((t) => (
                      <View key={t} className="bg-gray-100 rounded-full px-2.5 py-1">
                        <Text className="text-xxs text-gray-600">{t.trim()}</Text>
                      </View>
                    ))}
                </View>
              )}
            </View>

            <View className="bg-white rounded-xl border border-gray-100 p-3 mt-3">
              <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest mb-3">
                Progress
              </Text>
              <ShipmentProgress
                score={record.shipmentStatusScore}
                req={record}
                dates={dates}
              />
            </View>
          </>
        ) : searched ? (
          <EmptyState
            icon={<PackageSearch size={36} color={colors.muted} />}
            title="Nothing found"
            subtitle="Check the ID and try again — it can take a little while for a new order to appear."
          />
        ) : (
          <EmptyState
            icon={<PackageSearch size={36} color={colors.muted} />}
            title="Track any parcel"
            subtitle="Enter an order ID, booking ID or tracking number to see where it is."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
