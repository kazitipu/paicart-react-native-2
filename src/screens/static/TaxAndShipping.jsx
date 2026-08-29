import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import colors from '@/theme/colors';

/* Content verbatim from the web /pages/tax-and-Shipping (note the capital S
   in the live URL). The web drew the rates as an HTML <table>; on a phone that
   would need horizontal scrolling, so each weight band is a card with its
   figures stacked. */
const RATES = [
  { range: '0–0.5 kg', air: '৳700', sea: '৳250', time: 'Air: 7–14 days / Sea: 30–45 days' },
  { range: '0.5–1 kg', air: '৳600', sea: '৳220', time: 'Air: 7–14 days / Sea: 30–45 days' },
  { range: '1–5 kg', air: '৳550', sea: '৳200', time: 'Air: 7–14 days / Sea: 30–45 days' },
  { range: '5 kg+', air: 'Contact us', sea: 'Contact us', time: 'Varies' },
];

const CUSTOMS = [
  'Clothing & textiles: 25–37%',
  'Electronics: 15–25%',
  'Cosmetics & beauty: 20–30%',
  'Toys & gifts: 10–15%',
  'Food items: Subject to inspection and special regulations',
];

function Card({ title, children }) {
  return (
    <View className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
      <Text className="text-md font-bold text-brand mb-3">{title}</Text>
      {children}
    </View>
  );
}

export default function TaxAndShipping() {
  const navigation = useNavigation();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <View className="flex-1">
          <Text className="text-md font-bold text-foreground">Tax & Shipping Info</Text>
          <Text className="text-2xs text-gray-400">Understand what you're paying for</Text>
        </View>
      </View>

      <ScrollView contentContainerClassName="p-3 pb-10">
        <Card title="Shipping Rates">
          {RATES.map((r) => (
            <View key={r.range} className="py-2.5 border-b border-gray-50">
              <Text className="text-smd font-bold text-foreground">{r.range}</Text>
              <View className="flex-row gap-5 mt-1.5">
                <View>
                  <Text className="text-xxs text-gray-400">Air (per kg)</Text>
                  <Text className="text-smd text-foreground">{r.air}</Text>
                </View>
                <View>
                  <Text className="text-xxs text-gray-400">Sea (per kg)</Text>
                  <Text className="text-smd text-foreground">{r.sea}</Text>
                </View>
              </View>
              <Text className="text-xxs text-gray-500 mt-1.5">{r.time}</Text>
            </View>
          ))}
        </Card>

        <Card title="Customs & Import Taxes">
          <Text className="text-smd text-gray-600 leading-relaxed mb-2">
            Bangladesh customs may charge import duties on certain categories of goods. Common
            rates:
          </Text>
          {CUSTOMS.map((c) => (
            <View key={c} className="flex-row gap-2 py-1">
              <Text className="text-brand">•</Text>
              <Text className="flex-1 text-smd text-gray-600">{c}</Text>
            </View>
          ))}
          <Text className="text-2xs text-gray-400 mt-3">
            Note: Customs rates are approximate and may change. Paicart is not responsible for
            customs charges imposed by Bangladesh authorities.
          </Text>
        </Card>

        <Card title="Service Fees">
          <Text className="text-smd text-gray-600 leading-relaxed">
            Our service fee for Buy & Ship For Me orders is typically{' '}
            <Text className="font-bold text-foreground">7–10%</Text> of the product price, with a
            minimum of ৳50. This covers product procurement, quality check, and packaging at our
            China warehouse.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
