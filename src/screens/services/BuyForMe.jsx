import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { ArrowLeft, Plane, Ship, Package } from 'lucide-react-native';
import Field from '@/components/ui/Field';
import Select from '@/components/ui/Select';
import FileField from '@/components/ui/FileField';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { getAllD2DRatesRedux, setProductRequestRedux } from '@/store/actions';
import { uploadImage } from '@/lib/firebaseUtils';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

const STORES = ['1688', 'Taobao', 'Alibaba', 'Pinduoduo', 'Other'];
const COUNTRIES = [
  { value: 'China', label: 'China' },
  { value: 'India', label: 'India' },
  { value: 'Thailand', label: 'Thailand' },
];

export default function BuyForMe() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.user?.currentUser);
  const d2dRates = useSelector((s) => s.bookingRequests?.d2dRates || []);

  const [store, setStore] = useState('1688');
  const [country, setCountry] = useState('China');
  const [method, setMethod] = useState('air');
  const [productType, setProductType] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [variant, setVariant] = useState('');
  const [note, setNote] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isLoggedIn =
    currentUser && (currentUser.email || currentUser.displayName) && currentUser.email !== '';

  /* Rates are refetched on either change, as on the web — the product-type
     list is per method+country. */
  useEffect(() => {
    dispatch(getAllD2DRatesRedux(method, country));
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

  const submit = async () => {
    if (!productUrl.trim() && !productName.trim()) {
      toast.error('Give us a product link or a name.');
      return;
    }
    if (!quantity.trim()) {
      toast.error('Quantity is required.');
      return;
    }

    setSubmitting(true);
    const date = new Date();
    try {
      await dispatch(
        setProductRequestRedux({
          userId: currentUser.id,
          displayName: `${currentUser.userId || ''} - ${currentUser.displayName || ''}`,
          store,
          country,
          shipFrom: country,
          method,
          shipBy: method,
          shipmentMethod: method === 'sea' ? 'Sea' : 'Air',
          productType,
          productUrl,
          productName,
          quantity,
          variant,
          note,
          imageUrl,
          date: date.toLocaleDateString('en-GB'),
          time: date.getTime(),
          status: 'Pending',
          shipmentStatusScore: 1,
        }),
      );
      toast.success('Request submitted! Our team will price it shortly.');
      navigation.navigate('OrdersTab', { screen: 'BuyShipMyRequests' });
    } catch {
      toast.error('Could not submit the request. Please try again.');
    }
    setSubmitting(false);
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <EmptyState
          icon={<Package size={40} color={colors.muted} />}
          title="Sign in to request a product"
          subtitle="Tell us what you want and we'll source it from China."
          actionLabel="Sign In"
          onAction={() => navigation.navigate('Login', { returnTo: 'BuyForMe' })}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <Text className="flex-1 text-md font-bold text-foreground">Request a Product</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="p-3 pb-10 gap-4" keyboardShouldPersistTaps="handled">
          <Select label="Store" value={store} options={STORES} onChange={setStore} />
          <Select label="Ship from" value={country} options={COUNTRIES} onChange={setCountry} />

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
                    <Text
                      className={`text-smd font-bold ${active ? 'text-primary' : 'text-gray-500'}`}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Select
            label="Product type"
            value={productType}
            options={typeOptions}
            onChange={setProductType}
            placeholder={typeOptions.length ? 'Select…' : 'Loading rates…'}
          />

          <Field
            label="Product link"
            value={productUrl}
            onChangeText={setProductUrl}
            autoCapitalize="none"
            placeholder="Paste the 1688 / Taobao URL"
          />
          <Field
            label="Product name"
            value={productName}
            onChangeText={setProductName}
            placeholder="If you don't have a link"
          />
          <View className="flex-row gap-3">
            <Field
              label="Quantity"
              className="flex-1"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              placeholder="0"
            />
            <Field
              label="Variant"
              className="flex-1"
              value={variant}
              onChangeText={setVariant}
              placeholder="Colour / size"
            />
          </View>
          <Field
            label="Note"
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Anything else we should know?"
          />

          <FileField
            label="Product picture"
            value={imageUrl}
            onChange={setImageUrl}
            upload={(a) => uploadImage(a)}
          />

          <Button title="Submit Request" loading={submitting} onPress={submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
