import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Keyboard, Platform, Dimensions, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import {
  pick as pickDocument,
  keepLocalCopy,
  types as docTypes,
  errorCodes as docErrorCodes,
  isErrorWithCode,
} from '@react-native-documents/picker';
import { Pencil, X, Check, Plane, Ship, Plus, ImagePlus, FileText, Package, ChevronDown } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import { PickerSheet } from '@/components/profile/ProfileBits';
import { C, SHADOW, ORANGE, Press, ScalePress, Spinner, Overlay } from '@/components/product/ui';
import { uploadImage, uploadShipForMeFile } from '@/lib/firebaseUtils';
import { pickImage } from '@/lib/picker';
import { toast } from '@/lib/toast';
import { sf, SC } from '@/components/shipping/ShipBits';

/* ═══════════════════════════════════════════════════════════════════════
   EditModal (+ UploadBox) of web ship-for-me/my-request/_shared.jsx, < 640px.
   A centred dialog (`fixed inset-0 flex items-center justify-center p-4`,
   panel `rounded-2xl max-w-lg max-h-[90vh]`), rendered inside the page's
   shrink root, so its type is shrunk too (`sf`).

   - Text fields are uncontrolled (values live in refs) so a re-render can
     never drop a keystroke; selects open bottom-sheet pickers; the date
     input opens the system date picker.
   - Uploads exactly as the web: both pictures through uploadImage, the
     packing list through uploadShipForMeFile(…, 'shipForMe/packingList').
   - Keyboard: Android edge-to-edge does not resize the window, so the
     dialog lifts itself above the keyboard and scrolls the focused field
     clear of it.
   ═══════════════════════════════════════════════════════════════════════ */

const BODY = '#1e293b';
const PLACEHOLDER = 'rgba(30,41,59,0.5)';

const ORIGINS = [
  { value: 'china', label: '🇨🇳 China' },
  { value: 'uk', label: '🇬🇧 UK' },
  { value: 'usa', label: '🇺🇸 USA' },
  { value: 'hongkong', label: '🇭🇰 Hong Kong' },
  { value: 'thailand', label: '🇹🇭 Thailand' },
  { value: 'india', label: '🇮🇳 India', airOnly: true },
];
const CONTAINS = [
  { value: 'none', label: 'None (সাধারণ প্রোডাক্ট)' },
  { value: 'battery', label: 'Battery (ব্যাটারি)' },
  { value: 'magnet', label: 'Magnet (চুম্বক)' },
  { value: 'liquid', label: 'Liquid (তরল পদার্থ)' },
  { value: 'powder', label: 'Powder (পাউডার)' },
];

/* INPUT_CLS: `w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm
   bg-gray-50`, focus → orange border + 1px orange/20 ring. */
const INPUT_H = sf('sm').lineHeight + 22;
const inputBox = (focused, extra) => [
  {
    width: '100%',
    borderWidth: 1,
    borderColor: focused ? ORANGE : C.gray200,
    borderRadius: 12,
    backgroundColor: C.gray50,
    boxShadow: focused ? '0 0 0 1px rgba(255,106,0,0.2)' : undefined,
  },
  extra,
];
const inputText = [sf('sm'), { color: BODY, includeFontPadding: false, paddingHorizontal: 14 }];

/* LABEL_CLS: `block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5` */
function Label({ children, mb = 6 }) {
  return (
    <Text style={[sf('xs'), { fontWeight: '700', color: C.gray500, textTransform: 'uppercase', letterSpacing: 0.275, marginBottom: mb }]}>
      {children}
    </Text>
  );
}

/* "YYYY-MM-DD" as a phone's date input prints it (mm/dd/yyyy). */
const isoToDisplay = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return m ? `${m[2]}/${m[3]}/${m[1]}` : '';
};
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dateOfIso = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
};

let fieldSeq = 0;
const nextId = () => `t${(fieldSeq += 1)}`;

export default function ShipmentEditModal({ booking, onClose, onSave, saving }) {
  return (
    <Overlay visible={!!booking} onClose={onClose} full zIndex={50}>
      {booking ? <EditPanel key={String(booking.bookingId)} booking={booking} onClose={onClose} onSave={onSave} saving={saving} /> : null}
    </Overlay>
  );
}

function EditPanel({ booking, onClose, onSave, saving }) {
  /* select / radio / upload state */
  const [method, setMethod] = useState(booking.method || booking.shipBy || 'air');
  const [shipFrom, setShipFrom] = useState(booking.shipFrom || 'china');
  const [productContains, setProductContains] = useState(booking.productContains || 'none');
  const [shipTo, setShipTo] = useState(booking.shipTo || '');
  const [validTo, setValidTo] = useState(booking.validTo || '');
  const [imageUrl, setImageUrl] = useState(booking.imageUrl || '');
  const [waybillImage, setWaybillImage] = useState(booking.waybillImage || '');
  const [packingListUrl, setPackingListUrl] = useState(booking.packingListUrl || '');

  /* uncontrolled text fields */
  const vals = useRef({
    othersProductName: booking.othersProductName || '',
    productQuantity: booking.productQuantity || '',
    ctnQuantity: booking.ctnQuantity || '',
    totalCbm: booking.totalCbm || '',
    productVariant: booking.productVariant || '',
  });
  const initialTracking = () => {
    const list = booking.trackingNumbers?.length
      ? booking.trackingNumbers
      : String(booking.trackingNo || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .concat(booking.trackingNo ? [] : ['']);
    return list.map((v) => ({ id: nextId(), value: String(v) }));
  };
  const [trackingFields, setTrackingFields] = useState(initialTracking);
  const trackVals = useRef(Object.fromEntries(trackingFields.map((f) => [f.id, f.value])));

  const [imageLoading, setImageLoading] = useState(false);
  const [waybillLoading, setWaybillLoading] = useState(false);
  const [packingListLoading, setPackingListLoading] = useState(false);
  const [picker, setPicker] = useState(null); // 'origin' | 'contains'
  const [iosDate, setIosDate] = useState(null);
  const [focused, setFocused] = useState(null);

  /* ── keyboard ── */
  const [kbH, setKbH] = useState(0);
  const kbTop = useRef(0);
  const scrollRef = useRef(null);
  const scrollY = useRef(0);
  const focusedRef = useRef(null);
  const inputRefs = useRef({});

  const ensureVisible = useCallback(() => {
    const input = focusedRef.current;
    if (!input?.measureInWindow || !kbTop.current) return;
    input.measureInWindow((_x, y, _w, h) => {
      const overlap = y + h + 16 - kbTop.current;
      if (overlap > 0) scrollRef.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
    });
  }, []);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      const h = e.endCoordinates?.height || 0;
      kbTop.current = e.endCoordinates?.screenY || Dimensions.get('window').height - h;
      setKbH(h);
      setTimeout(ensureVisible, 140);
    });
    const hide = Keyboard.addListener(hideEvt, () => {
      kbTop.current = 0;
      setKbH(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [ensureVisible]);

  const onFocus = (key) => {
    setFocused(key);
    focusedRef.current = inputRefs.current[key];
    if (kbTop.current) setTimeout(ensureVisible, 60);
  };
  const onBlur = (key) => setFocused((f) => (f === key ? null : f));

  /* ── behaviour, as the web ── */
  const handleShipToChange = (iso) => {
    setShipTo(iso);
    if (!iso) return;
    const d = dateOfIso(iso);
    d.setDate(d.getDate() + 7);
    setValidTo(`${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`);
  };

  const openDate = () => {
    Keyboard.dismiss();
    const value = /^\d{4}-\d{2}-\d{2}$/.test(shipTo) ? dateOfIso(shipTo) : new Date();
    const minimumDate = new Date();
    minimumDate.setHours(0, 0, 0, 0);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        minimumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) handleShipToChange(isoOf(date));
        },
      });
    } else {
      setIosDate({ value, minimumDate });
    }
  };

  const addTrackingField = () => {
    const id = nextId();
    trackVals.current[id] = '';
    setTrackingFields((f) => [...f, { id, value: '' }]);
  };
  const removeTrackingField = (id) =>
    setTrackingFields((f) => {
      if (f.length <= 1) return f;
      delete trackVals.current[id];
      return f.filter((x) => x.id !== id);
    });

  const uploadPicture = async (title, setLoading, setUrl) => {
    let asset;
    try {
      asset = await pickImage({ title });
    } catch (e) {
      toast.error(e?.message || 'Upload failed');
      return;
    }
    if (!asset) return;
    setLoading(true);
    try {
      setUrl(await uploadImage(asset));
    } catch {
      toast.error('Upload failed');
    }
    setLoading(false);
  };

  /* Images, PDF and Word — the web's PACKING_LIST_ACCEPT. The content:// uri
     is copied into the app cache first so Storage's putFile gets a file path. */
  const uploadPackingList = async () => {
    if (packingListLoading) return;
    let picked;
    try {
      [picked] = await pickDocument({ type: [docTypes.images, docTypes.pdf, docTypes.doc, docTypes.docx] });
    } catch (e) {
      if (!(isErrorWithCode(e) && e.code === docErrorCodes.OPERATION_CANCELED)) toast.error('Upload failed');
      return;
    }
    if (!picked) return;
    setPackingListLoading(true);
    try {
      const [copy] = await keepLocalCopy({
        files: [{ uri: picked.uri, fileName: picked.name || 'packing-list' }],
        destination: 'cachesDirectory',
      });
      if (copy?.status !== 'success') throw new Error(copy?.copyError || 'copy failed');
      setPackingListUrl(await uploadShipForMeFile({ uri: copy.localUri, name: picked.name, type: picked.type }, 'shipForMe/packingList'));
    } catch {
      toast.error('Upload failed');
    }
    setPackingListLoading(false);
  };

  const handleSave = () => {
    const v = vals.current;
    if (!String(v.othersProductName).trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!v.productQuantity) {
      toast.error('Quantity is required');
      return;
    }
    if (!v.ctnQuantity) {
      toast.error('Total box is required');
      return;
    }
    if (!v.totalCbm) {
      toast.error('Total CBM is required');
      return;
    }
    if (imageLoading || waybillLoading || packingListLoading) {
      toast.error('Wait for uploads to finish');
      return;
    }
    Keyboard.dismiss();
    const trackingNumbers = trackingFields.map((f) => String(trackVals.current[f.id] ?? '').trim()).filter(Boolean);
    onSave({
      ...booking,
      method,
      shipFrom,
      othersProductName: v.othersProductName,
      productContains,
      productQuantity: v.productQuantity,
      ctnQuantity: v.ctnQuantity,
      totalCbm: v.totalCbm,
      productVariant: v.productVariant,
      shipTo,
      validTo,
      imageUrl,
      waybillImage,
      packingListUrl,
      trackingNumbers,
      trackingNo: trackingNumbers.join(','),
      shipBy: method,
    });
  };

  const textInput = (key, placeholder, { multiline = false } = {}) => (
    <View style={inputBox(focused === key, { height: multiline ? sf('sm').lineHeight * 3 + 22 : INPUT_H, justifyContent: 'center' })}>
      <TextInput
        ref={(r) => {
          inputRefs.current[key] = r;
        }}
        defaultValue={String(vals.current[key] ?? '')}
        onChangeText={(t) => {
          vals.current[key] = t;
        }}
        placeholder={placeholder}
        placeholderTextColor={PLACEHOLDER}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={() => onFocus(key)}
        onBlur={() => onBlur(key)}
        style={[inputText, multiline ? { height: '100%', paddingVertical: 10 } : { height: '100%', paddingVertical: 0 }]}
      />
    </View>
  );

  const selectBox = (label, onPress, open) => (
    <Press onPress={onPress} style={inputBox(open, { height: INPUT_H, justifyContent: 'center', paddingLeft: 14, paddingRight: 32 })}>
      <Text style={[sf('sm'), { color: BODY }]} numberOfLines={1}>
        {label}
      </Text>
      <View pointerEvents="none" style={{ position: 'absolute', right: 12 }}>
        <ChevronDown size={14} color={C.gray500} />
      </View>
    </Press>
  );

  const originOptions = ORIGINS.filter((o) => !o.airOnly || method === 'air');
  const originLabel = (originOptions.find((o) => o.value === shipFrom) || originOptions[0]).label;
  const containsLabel = (CONTAINS.find((o) => o.value === productContains) || CONTAINS[0]).label;
  const winH = Dimensions.get('window').height;

  const methodCard = (value, Icon, label) => {
    const on = method === value;
    return (
      <Press
        onPress={() => setMethod(value)}
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 10,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: on ? ORANGE : C.gray200,
          backgroundColor: on ? SC.orange50 : '#ffffff',
        }}
      >
        <Icon size={14} color={on ? ORANGE : C.gray400} />
        <Text style={[sf('sm'), { fontWeight: '600', color: on ? C.gray800 : C.gray600 }]}>{label}</Text>
      </Press>
    );
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} onPress={onClose} accessibilityLabel="Close" />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, paddingBottom: 16 + kbH }} pointerEvents="box-none">
        <View
          style={{
            width: '100%',
            maxWidth: 512,
            maxHeight: (winH - kbH) * 0.9,
            backgroundColor: '#ffffff',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: SHADOW['2xl'],
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: SC.DARK,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <Pencil size={14} color="#ffffff" />
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text style={[sf('sm'), { fontWeight: '700', color: '#ffffff' }]}>Edit Request</Text>
                <Text style={[sf('xs'), { color: C.gray300 }]}>{booking.bookingId}</Text>
              </View>
            </View>
            <Press
              onPress={onClose}
              accessibilityLabel="Close"
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
              })}
            >
              <X size={16} color="#ffffff" />
            </Press>
          </View>

          <ScrollView
            ref={scrollRef}
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20, gap: 16 }}
            keyboardShouldPersistTaps="handled"
            onScroll={(e) => {
              scrollY.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
          >
            {/* Route & Method */}
            <View>
              <Label>Shipment Method</Label>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {methodCard('air', Plane, 'By Air')}
                {methodCard('sea', Ship, 'By Sea')}
              </View>
            </View>

            <View>
              <Label>Origin of Shipment</Label>
              {selectBox(originLabel, () => setPicker('origin'), picker === 'origin')}
            </View>

            {/* Product Details */}
            <View>
              <Label>Product Name</Label>
              {textInput('othersProductName', 'e.g. Smart Watch')}
            </View>

            <View>
              <Label>Product Contains</Label>
              {selectBox(containsLabel, () => setPicker('contains'), picker === 'contains')}
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Label>Quantity</Label>
                {textInput('productQuantity', 'Pcs')}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Label>Total Box</Label>
                {textInput('ctnQuantity', 'Box')}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Label>Total CBM</Label>
                {textInput('totalCbm', 'CBM')}
              </View>
            </View>

            <View>
              <Label>Product Details (Any Text)</Label>
              {textInput('productVariant', 'Notes, sizes, colors or details…', { multiline: true })}
            </View>

            {/* Logistics & Dates */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Label>Ship To</Label>
                <Press onPress={openDate} style={inputBox(false, { height: INPUT_H, justifyContent: 'center', paddingHorizontal: 14 })}>
                  <Text style={[sf('sm'), { color: isoToDisplay(shipTo) ? BODY : PLACEHOLDER }]} numberOfLines={1}>
                    {isoToDisplay(shipTo) || 'mm/dd/yyyy'}
                  </Text>
                </Press>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Label>Valid To (Auto)</Label>
                <View style={inputBox(false, { height: INPUT_H, justifyContent: 'center', paddingHorizontal: 14, backgroundColor: C.gray100 })}>
                  <Text style={[sf('sm'), { color: C.gray500 }]} numberOfLines={1}>
                    {validTo}
                  </Text>
                </View>
              </View>
            </View>

            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Label mb={0}>Tracking Numbers</Label>
                <Press onPress={addTrackingField} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {({ pressed }) => (
                    <>
                      <Plus size={13} color={pressed ? '#E05900' : ORANGE} />
                      <Text style={[sf('xs'), { fontWeight: '700', color: pressed ? '#E05900' : ORANGE }]}>Add More</Text>
                    </>
                  )}
                </Press>
              </View>
              <View style={{ gap: 8 }}>
                {trackingFields.map((field) => {
                  const key = `track:${field.id}`;
                  return (
                    <Animated.View key={field.id} entering={FadeIn.duration(160)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[inputBox(focused === key, { height: INPUT_H, justifyContent: 'center' }), { flex: 1, width: undefined }]}>
                        <TextInput
                          ref={(r) => {
                            inputRefs.current[key] = r;
                          }}
                          defaultValue={field.value}
                          onChangeText={(t) => {
                            trackVals.current[field.id] = t;
                          }}
                          placeholder="Enter Tracking Number"
                          placeholderTextColor={PLACEHOLDER}
                          autoCapitalize="characters"
                          autoCorrect={false}
                          onFocus={() => onFocus(key)}
                          onBlur={() => onBlur(key)}
                          style={[inputText, { height: '100%', paddingVertical: 0 }]}
                        />
                      </View>
                      {trackingFields.length > 1 && (
                        <Press
                          onPress={() => removeTrackingField(field.id)}
                          accessibilityLabel="Remove tracking number"
                          style={({ pressed }) => ({
                            width: 36,
                            height: 36,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: pressed ? SC.red300 : C.gray200,
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          })}
                        >
                          {({ pressed }) => <X size={14} color={pressed ? SC.red500 : C.gray400} />}
                        </Press>
                      )}
                    </Animated.View>
                  );
                })}
              </View>
            </View>

            {/* Upload Documents */}
            <View>
              <Label>Upload Documents</Label>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <UploadBox
                  label="Product Picture"
                  value={imageUrl}
                  loading={imageLoading}
                  Icon={ImagePlus}
                  onPress={() => uploadPicture('Product Picture', setImageLoading, setImageUrl)}
                />
                <UploadBox
                  label="Waybill Picture"
                  value={waybillImage}
                  loading={waybillLoading}
                  Icon={FileText}
                  onPress={() => uploadPicture('Waybill Picture', setWaybillLoading, setWaybillImage)}
                />
              </View>
              <Press
                onPress={uploadPackingList}
                style={({ pressed }) => ({
                  marginTop: 12,
                  width: '100%',
                  borderRadius: 12,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: pressed ? 'rgba(255,106,0,0.5)' : C.gray200,
                  backgroundColor: pressed ? 'rgba(255,247,237,0.3)' : C.gray50,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                })}
              >
                {({ pressed }) =>
                  packingListLoading ? (
                    <Spinner size={16} color={C.gray400} />
                  ) : packingListUrl ? (
                    <>
                      <Check size={16} color={SC.emerald500} />
                      <Text style={[sf('xs'), { fontWeight: '600', color: C.gray600, flexShrink: 1 }]}>Packing list uploaded — click to replace</Text>
                    </>
                  ) : (
                    <>
                      <Package size={16} color={pressed ? ORANGE : C.gray400} />
                      <Text style={[sf('xs'), { fontWeight: '600', color: pressed ? ORANGE : C.gray400, flexShrink: 1 }]}>
                        Upload Packing List (PDF/Image/Word, optional)
                      </Text>
                    </>
                  )
                }
              </Press>
            </View>
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: C.gray100,
              paddingHorizontal: 20,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: 'rgba(249,250,251,0.5)',
            }}
          >
            <Press
              onPress={onClose}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.gray200,
                alignItems: 'center',
                backgroundColor: pressed ? C.gray100 : 'transparent',
              })}
            >
              <Text style={[sf('sm'), { fontWeight: '600', color: C.gray600 }]}>Cancel</Text>
            </Press>
            <ScalePress
              onPress={handleSave}
              disabled={saving}
              scaleTo={0.97}
              containerStyle={{ flex: 1 }}
              style={{
                paddingVertical: 10,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: ORANGE,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? (
                <>
                  <Spinner size={14} color="#ffffff" />
                  <Text style={[sf('sm'), { fontWeight: '700', color: '#ffffff' }]}>Saving…</Text>
                </>
              ) : (
                <Text style={[sf('sm'), { fontWeight: '700', color: '#ffffff' }]}>Update Request</Text>
              )}
            </ScalePress>
          </View>
        </View>
      </View>

      <PickerSheet
        visible={picker === 'origin'}
        title="Origin of Shipment"
        options={originOptions}
        value={shipFrom}
        onSelect={(v) => {
          setShipFrom(v);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === 'contains'}
        title="Product Contains"
        options={CONTAINS}
        value={productContains}
        onSelect={(v) => {
          setProductContains(v);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />

      {/* iOS has no imperative picker — an inline calendar in a sheet. */}
      <Overlay visible={!!iosDate} onClose={() => setIosDate(null)} zIndex={60}>
        {iosDate ? (
          <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24, paddingTop: 8 }}>
            <DateTimePicker
              value={iosDate.value}
              mode="date"
              display="inline"
              minimumDate={iosDate.minimumDate}
              onChange={(_e, d) => d && setIosDate((s) => ({ ...s, value: d }))}
            />
            <Press
              onPress={() => {
                handleShipToChange(isoOf(iosDate.value));
                setIosDate(null);
              }}
              style={{ marginHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: ORANGE, alignItems: 'center' }}
            >
              <Text style={[sf('sm'), { fontWeight: '700', color: '#ffffff' }]}>Done</Text>
            </Press>
          </View>
        ) : null}
      </Overlay>
    </View>
  );
}

/* UploadBox: `aspect-square rounded-xl border-2 border-dashed border-gray-200
   bg-gray-50`; spinner, the picture, or icon + `text-[10px]` label. */
function UploadBox({ label, value, loading, onPress, Icon }) {
  return (
    <Press
      onPress={() => !loading && onPress()}
      style={({ pressed }) => ({
        flex: 1,
        aspectRatio: 1,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: pressed ? 'rgba(255,106,0,0.5)' : C.gray200,
        backgroundColor: pressed ? 'rgba(255,247,237,0.3)' : C.gray50,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      {loading ? (
        <Spinner size={20} color={ORANGE} />
      ) : value ? (
        <ProductImage uri={value} style={{ width: '100%', height: '100%' }} />
      ) : (
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Icon size={20} color={C.gray300} />
          <Text style={[sf(10), { color: C.gray400 }]}>{label}</Text>
        </View>
      )}
    </Press>
  );
}
