import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import Clipboard from '@react-native-clipboard/clipboard';
import { ArrowLeft, Plus, X, Copy, Plane, Ship } from 'lucide-react-native';
import Field from '@/components/ui/Field';
import Select from '@/components/ui/Select';
import FileField from '@/components/ui/FileField';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { setShipForMeRedux } from '@/store/actions';
import { uploadImage, uploadShipForMeFile, getAllWarehouses } from '@/lib/firebaseUtils';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

const SHIP_FROM = [
  { value: 'china', label: 'China' },
  { value: 'india', label: 'India' },
  { value: 'thailand', label: 'Thailand' },
];

const CONTAINS = [
  { value: 'none', label: 'None (regular goods)' },
  { value: 'battery', label: 'Battery' },
  { value: 'liquid', label: 'Liquid' },
  { value: 'powder', label: 'Powder' },
  { value: 'cosmetics', label: 'Cosmetics' },
  { value: 'food', label: 'Food' },
];

export default function ShipForMeForm() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.user?.currentUser);

  const [method, setMethod] = useState('air');
  const [shipFrom, setShipFrom] = useState('china');
  const [othersProductName, setOthersProductName] = useState('');
  const [productContains, setProductContains] = useState('none');
  const [productQuantity, setProductQuantity] = useState('');
  const [ctnQuantity, setCtnQuantity] = useState('');
  const [totalCbm, setTotalCbm] = useState('');
  const [productVariant, setProductVariant] = useState('');
  const [shipTo2, setShipTo2] = useState('');
  const [validTo, setValidTo] = useState('');
  const [trackingFields, setTrackingFields] = useState(['']);
  const [imageUrl, setImageUrl] = useState('');
  const [waybillImage, setWaybillImage] = useState('');
  const [packingListUrl, setPackingListUrl] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const isLoggedIn =
    currentUser && (currentUser.email || currentUser.displayName) && currentUser.email !== '';

  useEffect(() => {
    getAllWarehouses().then((w) => setWarehouses(w || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (warehouses.length && !shipTo2) setShipTo2(warehouses[0]?.name || '');
  }, [warehouses, shipTo2]);

  const submit = async () => {
    if (!othersProductName.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!imageUrl) {
      toast.error('Product picture is required');
      return;
    }
    if (!waybillImage) {
      toast.error('Waybill picture is required');
      return;
    }

    setSubmitting(true);
    const bookingId = `${Math.round(Math.random() * 1000000 - 1)}`;
    const trackingNumbers = trackingFields.map((t) => t.trim()).filter(Boolean);
    const date = new Date();

    try {
      await dispatch(
        setShipForMeRedux({
          bookingId,
          userId: currentUser.id,
          displayName: `${currentUser.userId || ''} - ${currentUser.displayName || ''}`,
          shippingMark: bookingId,
          method,
          shipBy: method,
          shipFrom,
          othersProductName,
          productName: othersProductName,
          productContains,
          productQuantity,
          ctnQuantity,
          ctn: ctnQuantity,
          totalCbm,
          productVariant,
          shipTo: shipTo2,
          validTo,
          trackingNumbers,
          trackingNo: trackingNumbers.join(','),
          imageUrl,
          waybillImage,
          waybillUrl: waybillImage,
          packingListUrl,
          /* Preserved for the admin panel's older readers — not collected by
             this form any more, but their absence breaks its column mapping. */
          weight: '',
          productType: '',
          productsTotalCost: '',
          productBrand: '',
          productUrl: '',
          result: null,
          date: date.toLocaleDateString('en-GB'),
          time: date.getTime(),
          status: 'Pending',
          shipmentStatusScore: 1,
        }),
      );
      toast.success('Booking submitted! Our team will review it shortly.');
      navigation.navigate('OrdersTab', { screen: 'ShipMyRequests' });
    } catch {
      toast.error('Could not submit the booking. Please try again.');
    }
    setSubmitting(false);
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <EmptyState
          icon={<Ship size={40} color={colors.muted} />}
          title="Sign in to book a shipment"
          subtitle="We'll ship parcels you bought yourself from China."
          actionLabel="Sign In"
          onAction={() => navigation.navigate('Login', { returnTo: 'ShipForMeForm' })}
        />
      </SafeAreaView>
    );
  }

  const warehouse = warehouses[0];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
          <ArrowLeft size={22} color={colors.foreground} />
        </Pressable>
        <Text className="flex-1 text-md font-bold text-foreground">Ship For Me</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="p-3 pb-10 gap-4" keyboardShouldPersistTaps="handled">
          {/* Freight mode */}
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

          <Select label="Ship from" value={shipFrom} options={SHIP_FROM} onChange={setShipFrom} />

          <Field
            label="Product name"
            value={othersProductName}
            onChangeText={setOthersProductName}
            placeholder="What are you shipping?"
          />

          <Select
            label="Product contains"
            value={productContains}
            options={CONTAINS}
            onChange={setProductContains}
          />

          <View className="flex-row gap-3">
            <Field
              label="Quantity"
              className="flex-1"
              value={productQuantity}
              onChangeText={setProductQuantity}
              keyboardType="number-pad"
              placeholder="0"
            />
            <Field
              label="CTN"
              className="flex-1"
              value={ctnQuantity}
              onChangeText={setCtnQuantity}
              keyboardType="number-pad"
              placeholder="0"
            />
            <Field
              label="Total CBM"
              className="flex-1"
              value={totalCbm}
              onChangeText={setTotalCbm}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>

          <Field
            label="Variant / colour"
            value={productVariant}
            onChangeText={setProductVariant}
            placeholder="Optional"
          />

          {warehouses.length > 0 && (
            <Select
              label="Ship to warehouse"
              value={shipTo2}
              options={warehouses.map((w) => w.name).filter(Boolean)}
              onChange={setShipTo2}
            />
          )}

          <Field
            label="Valid until"
            value={validTo}
            onChangeText={setValidTo}
            placeholder="DD/MM/YYYY"
          />

          {/* Dynamic tracking numbers */}
          <View>
            <Text className="text-2xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
              Tracking numbers
            </Text>
            {trackingFields.map((t, i) => (
              <View key={i} className="flex-row items-center gap-2 mb-2">
                <TextInput
                  value={t}
                  onChangeText={(v) =>
                    setTrackingFields((prev) => prev.map((x, n) => (n === i ? v : x)))
                  }
                  placeholder={`Tracking number ${i + 1}`}
                  placeholderTextColor="#9ca3af"
                  className="flex-1 h-12 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 text-smd text-foreground"
                />
                {trackingFields.length > 1 && (
                  <Pressable
                    onPress={() => setTrackingFields((prev) => prev.filter((_, n) => n !== i))}
                    hitSlop={8}
                    className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
                  >
                    <X size={14} color={colors.muted} />
                  </Pressable>
                )}
              </View>
            ))}
            <Pressable
              onPress={() => setTrackingFields((prev) => [...prev, ''])}
              className="flex-row items-center gap-1.5 self-start"
            >
              <Plus size={13} color={colors.primary} />
              <Text className="text-tiny font-semibold text-primary">Add another</Text>
            </Pressable>
          </View>

          <FileField
            label="Product picture"
            required
            value={imageUrl}
            onChange={setImageUrl}
            upload={(a) => uploadImage(a)}
          />
          <FileField
            label="Waybill"
            required
            value={waybillImage}
            onChange={setWaybillImage}
            upload={(a) => uploadShipForMeFile(a, 'shipForMe/waybill')}
          />
          <FileField
            label="Packing list"
            value={packingListUrl}
            onChange={setPackingListUrl}
            upload={(a) => uploadShipForMeFile(a, 'shipForMe/packingList')}
          />

          {warehouse && (
            <View className="bg-white rounded-xl border border-gray-100 p-3">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-2xs font-extrabold text-gray-500 uppercase tracking-widest">
                  Send your parcel to
                </Text>
                <Pressable
                  onPress={() => {
                    Clipboard.setString(
                      [warehouse.name, warehouse.address, warehouse.phone].filter(Boolean).join('\n'),
                    );
                    toast.success('Address copied');
                  }}
                  hitSlop={8}
                  className="flex-row items-center gap-1"
                >
                  <Copy size={12} color={colors.primary} />
                  <Text className="text-2xs font-bold text-primary">Copy all</Text>
                </Pressable>
              </View>
              {[warehouse.name, warehouse.address, warehouse.phone].filter(Boolean).map((line) => (
                <Text key={line} className="text-smd text-foreground py-0.5">
                  {line}
                </Text>
              ))}
            </View>
          )}

          <Button title="Submit Booking" loading={submitting} onPress={submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
