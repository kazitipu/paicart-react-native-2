import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { ArrowLeft, Plane, Ship, Calculator } from 'lucide-react-native';
import Field from '@/components/ui/Field';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { getAllD2DRatesRedux } from '@/store/actions';
import { calcRate } from '@/lib/shipForMe';
import colors from '@/theme/colors';

const COUNTRIES = [
  { value: 'China', label: 'China' },
  { value: 'India', label: 'India' },
  { value: 'Thailand', label: 'Thailand' },
];

export default function CostCalculator() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const d2dRates = useSelector((s) => s.bookingRequests?.d2dRates || []);

  const [method, setMethod] = useState('air');
  const [country, setCountry] = useState('China');
  const [weight, setWeight] = useState('');
  const [productType, setProductType] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dispatch(getAllD2DRatesRedux(method, country));
    setResult(null);
  }, [method, country, dispatch]);

  const typeOptions = useMemo(
    () => d2dRates.map((r) => ({ value: r.id, label: r.name || r.id })),
    [d2dRates],
  );

  useEffect(() => {
    if (typeOptions.length && !typeOptions.some((t) => t.value === productType)) {
      setProductType(typeOptions[0].value);
    }
  }, [typeOptions, productType]);

  const calculate = () => {
    setError('');
    const w = parseFloat(weight);
    if (!Number.isFinite(w) || w <= 0) {
      setError('Enter a weight greater than 0.');
      setResult(null);
      return;
    }
    if (!productType) {
      setError('Select a product type.');
      setResult(null);
      return;
    }
    const r = calcRate(w, productType, d2dRates, method);
    if (!r) {
      setError('No rate is configured for that product type yet.');
      setResult(null);
      return;
    }
    setResult({ ...r, weight: w });
  };

  const reset = () => {
    setWeight('');
    setResult(null);
    setError('');
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <Text className="flex-1 text-md font-bold text-foreground">Cost Calculator</Text>
      </View>

      <ScrollView contentContainerClassName="p-3 pb-10 gap-4" keyboardShouldPersistTaps="handled">
        <View>
          <Text className="text-2xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
            Shipping method
          </Text>
          <View className="flex-row gap-2">
            {[
              { key: 'air', label: 'By Air', Icon: Plane },
              { key: 'sea', label: 'By Sea', Icon: Ship },
            ].map((m) => {
              const active = method === m.key;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => setMethod(m.key)}
                  className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-3 border-2 ${active ? 'border-primary bg-primary-tint' : 'border-gray-200 bg-white'}`}
                >
                  <m.Icon size={15} color={active ? colors.primary : colors.muted} />
                  <Text className={`text-smd font-bold ${active ? 'text-primary' : 'text-gray-500'}`}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Select label="Ship from" value={country} options={COUNTRIES} onChange={setCountry} />
        <Select
          label="Product type"
          value={productType}
          options={typeOptions}
          onChange={setProductType}
          placeholder={typeOptions.length ? 'Select…' : 'Loading rates…'}
        />
        <Field
          label="Weight (kg)"
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="0.00"
          error={error}
        />

        <View className="flex-row gap-2">
          <Button
            title="Calculate"
            onPress={calculate}
            icon={<Calculator size={15} color="#ffffff" />}
            className="flex-1"
          />
          <Button title="Reset" variant="outline" onPress={reset} />
        </View>

        {result && (
          <View
            className="rounded-2xl px-4 py-4 border"
            style={{ backgroundColor: colors.amberSoft, borderColor: colors.amberLine }}
          >
            <Text className="text-3xs text-amber-900">Estimated shipping</Text>
            <Text className="text-2xl font-extrabold text-amber-900 mt-1">
              ৳{Math.round(result.result).toLocaleString()}
            </Text>
            <Text className="text-2xs text-amber-900/70 mt-1">
              {result.weight} kg
              {result.weight <= 0.3 && method === 'air'
                ? ' · flat parcel rate'
                : ` · ৳${result.perKg}/kg`}
            </Text>
            <Text className="text-xxs text-amber-900/60 mt-3">
              An estimate only. The final charge is based on the actual weight measured at our
              warehouse.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
