import React, { createContext, forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Keyboard, Platform, Dimensions } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, StackActions } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  ArrowLeft, Ship, Plane, Copy, Check, MapPin, Phone, Plus, X,
  ImagePlus, FileText, AlertTriangle, Package, ChevronDown,
} from 'lucide-react-native';
import Header from '@/components/Header';
import ProductImage from '@/components/ui/ProductImage';
import { C, SHADOW, ORANGE, Press, ScalePress, Spinner, Radio } from '@/components/product/ui';
import { TS, tpx, BODY } from '@/components/cart/CartBits';
import { PickerSheet } from '@/components/profile/ProfileBits';
import useHideOnScroll from '@/lib/useHideOnScroll';
import { setShipForMeRedux } from '@/store/actions';
import { uploadImage, uploadShipForMeFile, getAllWarehouses } from '@/lib/firebaseUtils';
import {
  pick as pickDocument,
  keepLocalCopy,
  types as docTypes,
  errorCodes as docErrorCodes,
  isErrorWithCode,
} from '@react-native-documents/picker';
import { getShippingMark } from '@/lib/shippingMark';
import { pickImage } from '@/lib/picker';
import { toast } from '@/lib/toast';
import { TABS } from '@/navigation/routes';

/* ═══════════════════════════════════════════════════════════════════════
   Ship For Me — port of web src/app/pages/ship-for-me/page.jsx at < 640px.

   The page has no scoped mobile font shrink, so sizes are plain Tailwind v4
   (TS / tpx). The web renders the global Header above it (no BottomNav on
   this route) and its Footer below; the Footer is not ported (as on Cart).

   Deliberate RN differences, each marked "RN:" below:
   - Inputs are uncontrolled (values live in a ref) so typing never drops
     characters; the selects open bottom-sheet pickers.
   - Picture uploads go through the camera/library chooser (lib/picker); the
     packing list uses the system document picker (images, PDF, Word), the
     same types as the web's file input.
   - Switching to Sea while India is selected resets the origin to China (the
     web keeps 'india' in state while its <select> shows China).
   - The submit is wrapped in try/catch so the spinner always clears.
   - After submitting, the form is popped off the More stack (or reset) so
     coming back to the tab does not show the old booking.
   ═══════════════════════════════════════════════════════════════════════ */

const PAGE_BG = '#f7f8fa';
const PLACEHOLDER = C.gray300; // placeholder:text-gray-300
const EMERALD500 = '#10b981';
/* focus:border-[#FF6A00] focus:ring-1 focus:ring-[#FF6A00]/20 */
const FOCUS_RING = '0 0 0 1px rgba(255,106,0,0.2)';

const ORIGIN_LABELS = {
  china: '🇨🇳 China', uk: '🇬🇧 UK', usa: '🇺🇸 USA', hongkong: '🇭🇰 Hong Kong', thailand: '🇹🇭 Thailand', india: '🇮🇳 India',
};
const CONTAINS_OPTIONS = [
  { value: 'none', label: 'None (সাধারণ প্রোডাক্ট)' },
  { value: 'battery', label: 'Battery (ব্যাটারি)' },
  { value: 'magnet', label: 'Magnet (চুম্বক)' },
  { value: 'liquid', label: 'Liquid (তরল পদার্থ)' },
  { value: 'powder', label: 'Powder (পাউডার)' },
];
const originOptions = (method) =>
  ['china', 'uk', 'usa', 'hongkong', 'thailand', ...(method === 'air' ? ['india'] : [])].map((v) => ({
    value: v,
    label: ORIGIN_LABELS[v],
  }));

/* sessionStorage 'paicart_sfm_draft' on the web: the form saved before a
   login redirect, restored (once) when the page mounts again. RN: kept in
   memory — the same lifetime as a browser session, and the in-app Login
   returns by going back, so this screen usually stays mounted anyway. */
let pendingDraft = null;

const fmtDate = (d) => `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
let trackSeq = 0;
const trackRow = (value = '') => ({ id: `t${(trackSeq += 1)}`, value });

const CARD = {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: C.gray100,
  boxShadow: SHADOW.base, // v4 shadow-sm
};

/* ── keyboard: Android edge-to-edge does not shrink the window, so the
   scroll content gets bottom padding = keyboard height while it is open and
   the focused field is scrolled clear of the keyboard's top edge. ── */
const KbCtx = createContext(null);

/* ── atoms ── */

function Label({ children, required, style }) {
  return (
    <Text style={[TS.xs, { fontWeight: '700', color: C.gray700, marginBottom: 6 }, style]}>
      {children}
      {required && <Text style={{ color: C.red500 }}> *</Text>}
    </Text>
  );
}

function SectionHeader({ n, title }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: C.gray50,
      }}
    >
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: C.orange50,
          borderWidth: 1,
          borderColor: C.orange200,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={[TS.xs, { fontWeight: '800', color: ORANGE }]}>{n}</Text>
      </View>
      <Text style={[TS.sm, { fontWeight: '800', color: C.gray900 }]}>{title}</Text>
    </View>
  );
}

function Section({ n, title, children, delay = 0 }) {
  return (
    <Animated.View entering={FadeIn.duration(260).delay(delay)} style={CARD}>
      <SectionHeader n={n} title={title} />
      <View style={{ paddingHorizontal: 20, paddingVertical: 16, gap: 16 }}>{children}</View>
    </Animated.View>
  );
}

/* INPUT_CLS: `w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm
   bg-gray-50` — 42px tall; `rows={3}` textarea is 82px. Uncontrolled. */
const FormInput = forwardRef(function FormInput({ multiline, onFocus, onBlur, style, ...rest }, ref) {
  const inner = useRef(null);
  const kb = useContext(KbCtx);
  const [focused, setFocused] = useState(false);
  useImperativeHandle(ref, () => inner.current);
  return (
    <View
      style={[
        {
          height: multiline ? 82 : 42,
          borderWidth: 1,
          borderRadius: 12,
          borderColor: focused ? ORANGE : C.gray200,
          backgroundColor: C.gray50,
          justifyContent: multiline ? 'flex-start' : 'center',
        },
        focused && { boxShadow: FOCUS_RING },
        style,
      ]}
    >
      <TextInput
        ref={inner}
        multiline={multiline}
        placeholderTextColor={PLACEHOLDER}
        onFocus={(e) => {
          setFocused(true);
          kb?.focus(inner);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          kb?.blur(inner);
          onBlur?.(e);
        }}
        style={[
          {
            paddingHorizontal: 14,
            fontSize: 14,
            color: BODY,
            includeFontPadding: false,
          },
          multiline
            ? { height: 80, paddingTop: 10, paddingBottom: 10, lineHeight: 20, textAlignVertical: 'top' }
            : { height: 40, paddingVertical: 0 },
        ]}
        {...rest}
      />
    </View>
  );
});

/* readOnly inputs — `bg-gray-100 text-gray-500` or the orange "valid to". */
function ReadOnlyBox({ value, tone = 'gray' }) {
  const orange = tone === 'orange';
  return (
    <View
      style={{
        height: 42,
        borderWidth: 1,
        borderRadius: 12,
        borderColor: orange ? C.orange200 : C.gray200,
        backgroundColor: orange ? C.orange50 : C.gray100,
        paddingHorizontal: 14,
        justifyContent: 'center',
      }}
    >
      <Text style={[TS.sm, { color: orange ? ORANGE : C.gray500, fontWeight: orange ? '600' : '400' }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/* A native <select> with INPUT_CLS; Chrome draws its own arrow at the right.
   RN: opens a PickerSheet. */
function SelectInput({ label, open, onPress }) {
  return (
    <Press
      onPress={onPress}
      style={({ pressed }) => [
        {
          height: 42,
          borderWidth: 1,
          borderRadius: 12,
          borderColor: open ? ORANGE : C.gray200,
          backgroundColor: pressed ? C.gray100 : C.gray50,
          paddingLeft: 14,
          paddingRight: 32,
          justifyContent: 'center',
        },
        open && { boxShadow: FOCUS_RING },
      ]}
    >
      <Text style={[TS.sm, { color: BODY }]} numberOfLines={1}>
        {label}
      </Text>
      <View pointerEvents="none" style={{ position: 'absolute', right: 12 }}>
        <ChevronDown size={14} color={C.gray500} />
      </View>
    </Press>
  );
}

function MethodCard({ active, Icon, label, onPress }) {
  return (
    <ScalePress
      onPress={onPress}
      scaleTo={0.97}
      containerStyle={{ flex: 1 }}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: active ? ORANGE : C.gray200,
        backgroundColor: active ? C.orange50 : '#ffffff',
      }}
    >
      <Radio selected={active} size={14} dot={6} />
      <Icon size={14} color={active ? ORANGE : C.gray400} />
      <Text style={[TS.sm, { fontWeight: '600', color: active ? C.gray800 : C.gray600 }]}>{label}</Text>
    </ScalePress>
  );
}

/* UploadBox: `aspect-square rounded-xl border-2 border-dashed border-gray-200
   bg-gray-50`, spinner / preview / placeholder. */
function UploadBox({ label, required, value, loading, onPress, Icon }) {
  const isPdf = value && /\.pdf($|\?)/i.test(value);
  return (
    <View style={{ flex: 1 }}>
      <Label required={required}>{label}</Label>
      <Press
        onPress={() => !loading && onPress()}
        accessibilityLabel={label}
        style={({ pressed }) => ({
          width: '100%',
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
          <Spinner size={22} color={ORANGE} />
        ) : value ? (
          isPdf ? (
            <View style={{ alignItems: 'center', gap: 4, paddingHorizontal: 8 }}>
              <FileText size={22} color={C.gray500} />
              <Text style={[tpx(10), { color: C.gray500 }]} numberOfLines={1}>
                PDF uploaded
              </Text>
            </View>
          ) : (
            <Animated.View entering={FadeIn.duration(220)} style={{ width: '100%', height: '100%' }}>
              <ProductImage uri={value} style={{ width: '100%', height: '100%' }} />
            </Animated.View>
          )
        ) : (
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Icon size={20} color={C.gray300} />
            <Text style={[tpx(10), { color: C.gray400 }]}>{label.replace(/\s*\(.*\)/, '')}</Text>
          </View>
        )}
      </Press>
    </View>
  );
}

function InfoLabel({ Icon, children }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icon size={10} color={C.gray400} />
      <Text style={[tpx(10), { fontWeight: '700', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.25 }]}>
        {children}
      </Text>
    </View>
  );
}

function InfoValue({ value }) {
  return value ? (
    <Text style={[TS.sm, { fontWeight: '600', color: C.gray800, marginTop: 4 }]}>{value}</Text>
  ) : (
    <Text style={[TS.sm, { color: C.gray400, fontStyle: 'italic', marginTop: 4 }]}>Not available yet — please contact support.</Text>
  );
}

/* `list-disc pl-4` item — the disc hangs in the 16px padding. */
function Bullet({ children }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      <Text style={[TS.xs, { width: 16, lineHeight: 19.5, color: C.red700, textAlign: 'center' }]}>•</Text>
      <Text style={[TS.xs, { flex: 1, lineHeight: 19.5, color: C.red700 }]}>{children}</Text>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ */

const initialState = (draft) => ({
  method: draft?.method || 'air',
  shipFrom: draft?.shipFrom || 'china',
  productContains: draft?.productContains || 'none',
  trackingFields: (draft?.trackingFields?.length ? draft.trackingFields : [{ value: '' }]).map((f) => trackRow(f.value || '')),
  imageUrl: draft?.imageUrl || '',
  waybillImage: draft?.waybillImage || '',
  packingListUrl: draft?.packingListUrl || '',
});

export default function ShipForMeForm() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const currentUser = useSelector((s) => s.user?.currentUser);

  /* restore draft saved before login redirect (read once, then cleared) */
  const [restored] = useState(() => {
    const d = pendingDraft;
    pendingDraft = null;
    return d;
  });
  const init = useMemo(() => initialState(restored), [restored]);

  /* ── Route & Method ── */
  const [method, setMethod] = useState(init.method);
  const [shipFrom, setShipFrom] = useState(init.shipFrom);

  /* ── Product Details (text fields are uncontrolled — values live here) ── */
  const vals = useRef({
    othersProductName: restored?.othersProductName || '',
    productQuantity: restored?.productQuantity || '',
    ctnQuantity: restored?.ctnQuantity || '',
    totalCbm: restored?.totalCbm || '',
    productVariant: restored?.productVariant || '',
  });
  const [productContains, setProductContains] = useState(init.productContains);

  /* ── Logistics & Dates (auto): Ship Book Date (today) → Valid To (+7 days) ── */
  const [dates] = useState(() => {
    const today = new Date();
    const next = new Date(today);
    next.setDate(next.getDate() + 7);
    return { shipTo2: fmtDate(today), validTo: fmtDate(next) };
  });
  const [trackingFields, setTrackingFields] = useState(init.trackingFields);
  const trackVals = useRef(Object.fromEntries(init.trackingFields.map((f) => [f.id, f.value])));

  /* ── Upload Documents ── */
  const [imageUrl, setImageUrl] = useState(init.imageUrl);
  const [imageLoading, setImageLoading] = useState(false);
  const [waybillImage, setWaybillImage] = useState(init.waybillImage);
  const [waybillLoading, setWaybillLoading] = useState(false);
  const [packingListUrl, setPackingListUrl] = useState(init.packingListUrl);
  const [packingListLoading, setPackingListLoading] = useState(false);

  const [warehouses, setWarehouses] = useState([]);
  const [copied, setCopied] = useState(false);
  const [submitLoader, setSubmitLoader] = useState(false);
  const [sheet, setSheet] = useState(null); // 'origin' | 'contains'
  const [formKey, setFormKey] = useState(0); // remounts the uncontrolled inputs on reset
  const copyTimer = useRef(null);

  useEffect(() => {
    if (restored) toast.info('Your draft has been restored.');
  }, [restored]);

  /* fetch real warehouse data */
  useEffect(() => {
    getAllWarehouses().then((list) => setWarehouses(list || [])).catch(() => {});
  }, []);

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  /* Signed in while this screen stayed mounted under Login — the form is
     still on screen, so a saved draft would only resurface later as stale. */
  useEffect(() => {
    if (currentUser?.id) pendingDraft = null;
  }, [currentUser?.id]);

  const collectDraft = () => ({
    method,
    shipFrom,
    ...vals.current,
    productContains,
    trackingFields: trackingFields.map((f) => ({ value: trackVals.current[f.id] || '' })),
    imageUrl,
    waybillImage,
    packingListUrl,
  });

  const saveDraftAndLogin = () => {
    pendingDraft = collectDraft();
    navigation.navigate('Login', { returnTo: 'ShipForMeForm' });
  };

  /* Only match a warehouse for the currently-selected origin country —
     never fall back to China or any other country's address. A country
     can have multiple warehouse entries; prefer the one admin marked
     as the default for that country. */
  const warehousesForCountry = warehouses.filter((w) => w.country?.trim().toLowerCase() === shipFrom.toLowerCase());
  const selectedWarehouse = warehousesForCountry.find((w) => w.isDefault) || warehousesForCountry[0] || null;

  const shippingMark = getShippingMark(currentUser);

  const handleCopyAllInfo = () => {
    const lines = [
      `Shipping Mark: ${shippingMark}`,
      selectedWarehouse?.companyName ? `Warehouse: ${selectedWarehouse.companyName}` : null,
      selectedWarehouse?.address ? `Address: ${selectedWarehouse.address}` : null,
      selectedWarehouse?.phone ? `Phone: ${selectedWarehouse.phone}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    Clipboard.setString(lines);
    setCopied(true);
    toast.success('Copied!');
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  const chooseMethod = (m) => {
    setMethod(m);
    /* RN: India is an air-only origin; the web's select would show China
       while still submitting 'india'. */
    if (m === 'sea' && shipFrom === 'india') setShipFrom('china');
  };

  /* ── tracking numbers ── */
  const addTrackingField = () => setTrackingFields((f) => [...f, trackRow()]);
  const removeTrackingField = (id) =>
    setTrackingFields((f) => {
      if (f.length <= 1) return f;
      delete trackVals.current[id];
      return f.filter((x) => x.id !== id);
    });

  /* ── uploads ── */
  const upload = async (title, setLoading, setUrl, fn, errMsg) => {
    let asset;
    try {
      asset = await pickImage({ title });
    } catch (e) {
      toast.error(e?.message || errMsg);
      return;
    }
    if (!asset) return;
    setLoading(true);
    try {
      setUrl(await fn(asset));
    } catch {
      toast.error(errMsg);
    }
    setLoading(false);
  };
  const handleProductImage = () => upload('Product Picture', setImageLoading, setImageUrl, (a) => uploadImage(a), 'Image upload failed');
  const handleWaybillImage = () =>
    upload('Waybill Picture', setWaybillLoading, setWaybillImage, (a) => uploadShipForMeFile(a, 'shipForMe/waybill'), 'Waybill upload failed');
  /* Same file types as the web's <input accept>: images, PDF and Word. The
     picked content:// uri is copied into the app cache first so Storage's
     putFile gets a plain file path. */
  const handlePackingList = async () => {
    let picked;
    try {
      [picked] = await pickDocument({ type: [docTypes.images, docTypes.pdf, docTypes.doc, docTypes.docx] });
    } catch (e) {
      if (!(isErrorWithCode(e) && e.code === docErrorCodes.OPERATION_CANCELED)) toast.error('Packing list upload failed');
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
      setPackingListUrl(
        await uploadShipForMeFile({ uri: copy.localUri, name: picked.name, type: picked.type }, 'shipForMe/packingList'),
      );
    } catch {
      toast.error('Packing list upload failed');
    }
    setPackingListLoading(false);
  };

  const resetForm = () => {
    const fresh = initialState(null);
    vals.current = { othersProductName: '', productQuantity: '', ctnQuantity: '', totalCbm: '', productVariant: '' };
    trackVals.current = Object.fromEntries(fresh.trackingFields.map((f) => [f.id, '']));
    setMethod(fresh.method);
    setShipFrom(fresh.shipFrom);
    setProductContains(fresh.productContains);
    setTrackingFields(fresh.trackingFields);
    setImageUrl('');
    setWaybillImage('');
    setPackingListUrl('');
    setFormKey((k) => k + 1);
  };

  /* ── submit ── */
  const handleSubmit = async () => {
    if (submitLoader) return;
    Keyboard.dismiss();
    const v = vals.current;
    const trackingValues = trackingFields.map((f) => trackVals.current[f.id] || '');
    if (!currentUser?.id) {
      toast.error('Please login first');
      saveDraftAndLogin();
      return;
    }
    if (!v.othersProductName.trim()) { toast.error('Product name is required'); return; }
    if (!v.productQuantity) { toast.error('Quantity is required'); return; }
    if (!v.ctnQuantity) { toast.error('Total box is required'); return; }
    if (!v.totalCbm) { toast.error('Total CBM is required'); return; }
    if (!trackingValues.some((x) => x.trim())) { toast.error('At least one tracking number is required'); return; }
    if (!imageUrl) { toast.error('Product picture is required'); return; }
    if (!waybillImage) { toast.error('Waybill picture is required'); return; }
    if (imageLoading || waybillLoading || packingListLoading) { toast.error('Wait for uploads to finish'); return; }

    setSubmitLoader(true);
    const bookingId = `${Math.round(Math.random() * 1000000 - 1)}`;
    const trackingNumbers = trackingValues.map((x) => x.trim()).filter(Boolean);
    const date = new Date();

    try {
      await dispatch(
        setShipForMeRedux({
          bookingId,
          userId: currentUser.id,
          displayName: `${currentUser.userId || ''} - ${currentUser.displayName || ''}`,
          shippingMark,
          method,
          shipBy: method,
          shipFrom,
          othersProductName: v.othersProductName,
          productContains,
          productQuantity: v.productQuantity,
          ctnQuantity: v.ctnQuantity,
          totalCbm: v.totalCbm,
          productVariant: v.productVariant,
          shipTo: dates.shipTo2,
          validTo: dates.validTo,
          trackingNumbers,
          trackingNo: trackingNumbers.join(','),
          imageUrl,
          waybillImage,
          packingListUrl,
          /* preserved old fields — not collected via this form anymore */
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
    } catch {
      /* RN: the web leaves its spinner running on a thrown write. */
      setSubmitLoader(false);
      toast.error('Could not submit the booking. Please try again.');
      return;
    }

    toast.success('Booking submitted! Our team will review it shortly.');
    setSubmitLoader(false);
    /* router.push('/pages/dashboard/ship-for-me/my-request'). RN: the More
       stack keeps this screen alive, so pop it (or reset it when it is the
       stack's only screen) so the tab does not reopen on the sent booking. */
    const depth = navigation.getState()?.routes?.length || 1;
    navigation.navigate(TABS.ORDERS, { screen: 'ShipMyRequests' });
    if (depth > 1) navigation.dispatch(StackActions.pop());
    else resetForm();
  };

  /* ── chrome ── */
  const scrollRef = useRef(null);
  const { onScroll, scrollY, isHidden, headerH, setHeaderH, headerStyle } = useHideOnScroll();
  const topPad = insets.top + headerH;

  /* ── keyboard ── */
  const focusedRef = useRef(null);
  const kbTopRef = useRef(0);
  const [kbPad, setKbPad] = useState(0);

  const ensureVisible = useCallback(() => {
    const input = focusedRef.current?.current;
    if (!input || !kbTopRef.current || !input.measureInWindow) return;
    input.measureInWindow((_x, y, _w, h) => {
      const overlap = y + h + 16 - kbTopRef.current;
      if (overlap > 0) scrollRef.current?.scrollTo({ y: scrollY.value + overlap, animated: true });
    });
  }, [scrollY]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      const kbH = e.endCoordinates?.height || 0;
      kbTopRef.current = e.endCoordinates?.screenY || Dimensions.get('window').height - kbH;
      setKbPad(kbH);
      setTimeout(ensureVisible, 80);
    });
    const hide = Keyboard.addListener(hideEvt, () => {
      kbTopRef.current = 0;
      setKbPad(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [ensureVisible]);

  /* Moving between fields while the keyboard stays up fires no new
     keyboardDidShow, so a focus re-checks on its own. */
  const kb = useMemo(
    () => ({
      focus: (ref) => {
        focusedRef.current = ref;
        if (kbTopRef.current) setTimeout(ensureVisible, 60);
      },
      blur: (ref) => {
        if (focusedRef.current === ref) focusedRef.current = null;
      },
    }),
    [ensureVisible],
  );

  const setVal = (k) => (t) => {
    vals.current[k] = t;
  };

  /* ─── RENDER ─── */
  return (
    <KbCtx.Provider value={kb}>
      <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
        <Animated.ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, paddingTop: topPad, paddingBottom: kbPad }}
        >
          {/* min-h-screen bg-[#f7f8fa] pb-10 › max-w-2xl px-4 py-6 space-y-4 */}
          <View key={formKey} style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24 + 40, gap: 16 }}>
            {/* Header */}
            <Animated.View entering={FadeIn.duration(260)} style={[CARD, { padding: 20 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Press
                  onPress={() => navigation.canGoBack() && navigation.goBack()}
                  hitSlop={12}
                  accessibilityLabel="Go back"
                  style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                >
                  <ArrowLeft size={20} color={C.gray400} />
                </Press>
                <View style={{ flexShrink: 1 }}>
                  <Text style={[TS.lg, { fontWeight: '800', color: C.gray900 }]}>Ship For Me</Text>
                  <Text style={[TS.xs, { color: C.gray400, marginTop: 2 }]}>Create a new shipment booking</Text>
                </View>
              </View>
            </Animated.View>

            {/* Shipping mark + warehouse info */}
            <Animated.View
              entering={FadeIn.duration(260).delay(40)}
              style={{ backgroundColor: '#fff1e6', borderWidth: 1, borderColor: C.amber100, borderRadius: 16, padding: 16 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                <View style={{ flexShrink: 1, minWidth: 0 }}>
                  <Text style={[tpx(10), { fontWeight: '800', color: ORANGE, textTransform: 'uppercase', letterSpacing: 1 }]}>
                    Shipping Mark
                  </Text>
                  {shippingMark ? (
                    <Text style={[TS.lg, { fontWeight: '800', color: C.gray900, marginTop: 2 }]}>{shippingMark}</Text>
                  ) : (
                    <View style={{ marginTop: 2 }} />
                  )}
                </View>
                <Press
                  onPress={handleCopyAllInfo}
                  accessibilityLabel="Copy all info"
                  style={({ pressed }) => ({
                    flexShrink: 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: pressed ? C.orange50 : '#ffffff',
                    borderWidth: 1,
                    borderColor: C.orange200,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  })}
                >
                  <Animated.View key={copied ? 'y' : 'n'} entering={FadeIn.duration(160)}>
                    {copied ? <Check size={13} color={ORANGE} /> : <Copy size={13} color={ORANGE} />}
                  </Animated.View>
                  <Text style={[TS.xs, { fontWeight: '700', color: ORANGE }]}>{copied ? 'Copied' : 'Copy All Info'}</Text>
                </Press>
              </View>

              <View style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: 14, gap: 10 }}>
                <View>
                  <InfoLabel Icon={MapPin}>{`${ORIGIN_LABELS[shipFrom] || shipFrom} Warehouse Address`}</InfoLabel>
                  {/* web renders the address as normal HTML text, so its line breaks collapse to spaces */}
                  <InfoValue value={selectedWarehouse?.address?.replace(/\s*\n\s*/g, ' ')} />
                </View>
                <View>
                  <InfoLabel Icon={Phone}>Phone Number</InfoLabel>
                  <InfoValue value={selectedWarehouse?.phone} />
                </View>
              </View>
            </Animated.View>

            {/* Section 1: Route & Method */}
            <Section n={1} title="Route & Method" delay={80}>
              <View>
                <Label>Shipment Method</Label>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <MethodCard active={method === 'air'} Icon={Plane} label="By Air" onPress={() => chooseMethod('air')} />
                  <MethodCard active={method === 'sea'} Icon={Ship} label="By Sea" onPress={() => chooseMethod('sea')} />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Label>Origin of Shipment</Label>
                  <SelectInput label={ORIGIN_LABELS[shipFrom]} open={sheet === 'origin'} onPress={() => setSheet('origin')} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Label>Destination</Label>
                  <ReadOnlyBox value="🇧🇩 Bangladesh" />
                </View>
              </View>
            </Section>

            {/* Section 2: Product Details */}
            <Section n={2} title="Product Details" delay={120}>
              <View>
                <Label required>Product Name</Label>
                <FormInput
                  defaultValue={vals.current.othersProductName}
                  onChangeText={setVal('othersProductName')}
                  placeholder="e.g. Smart Watch"
                  returnKeyType="next"
                />
              </View>
              <View>
                <Label required>Product Contains</Label>
                <SelectInput
                  label={CONTAINS_OPTIONS.find((o) => o.value === productContains)?.label}
                  open={sheet === 'contains'}
                  onPress={() => setSheet('contains')}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[
                  ['productQuantity', 'Quantity', 'Pcs'],
                  ['ctnQuantity', 'Total Box', 'Box'],
                  ['totalCbm', 'Total CBM', 'CBM'],
                ].map(([k, label, ph]) => (
                  <View key={k} style={{ flex: 1, minWidth: 0 }}>
                    <Label required>{label}</Label>
                    {/* type="text" on the web — any text, so the default keyboard */}
                    <FormInput defaultValue={vals.current[k]} onChangeText={setVal(k)} placeholder={ph} />
                  </View>
                ))}
              </View>
              <View>
                <Label>Product Details (Any Text)</Label>
                <FormInput
                  multiline
                  defaultValue={vals.current.productVariant}
                  onChangeText={setVal('productVariant')}
                  placeholder="Type specific notes, sizes, colors or details here…"
                />
              </View>
            </Section>

            {/* Section 3: Logistics & Dates */}
            <Section n={3} title="Logistics & Dates" delay={160}>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Label>Ship Book Date</Label>
                  <ReadOnlyBox value={dates.shipTo2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Label>Ship Valid To</Label>
                  <ReadOnlyBox value={dates.validTo} tone="orange" />
                </View>
              </View>

              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Label required>Tracking Numbers</Label>
                  <Press
                    onPress={addTrackingField}
                    hitSlop={8}
                    accessibilityLabel="Add tracking number"
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -6, opacity: pressed ? 0.6 : 1 })}
                  >
                    {({ pressed }) => (
                      <>
                        <Plus size={13} color={pressed ? '#E05900' : ORANGE} />
                        <Text style={[TS.xs, { fontWeight: '700', color: pressed ? '#E05900' : ORANGE }]}>Add More</Text>
                      </>
                    )}
                  </Press>
                </View>
                <View style={{ gap: 8 }}>
                  {trackingFields.map((field) => (
                    <Animated.View
                      key={field.id}
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(150)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                    >
                      <FormInput
                        style={{ flex: 1 }}
                        defaultValue={trackVals.current[field.id] || ''}
                        onChangeText={(t) => {
                          trackVals.current[field.id] = t;
                        }}
                        placeholder="Enter Tracking Number"
                        autoCapitalize="characters"
                        autoCorrect={false}
                      />
                      {trackingFields.length > 1 && (
                        <Press
                          onPress={() => removeTrackingField(field.id)}
                          accessibilityLabel="Remove tracking number"
                          style={({ pressed }) => ({
                            flexShrink: 0,
                            width: 36,
                            height: 36,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: pressed ? '#fca5a5' : C.gray200,
                            alignItems: 'center',
                            justifyContent: 'center',
                          })}
                        >
                          {({ pressed }) => <X size={14} color={pressed ? C.red500 : C.gray400} />}
                        </Press>
                      )}
                    </Animated.View>
                  ))}
                </View>
              </View>
            </Section>

            {/* Section 4: Upload Documents */}
            <Section n={4} title="Upload Documents" delay={200}>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <UploadBox
                  label="Product Picture"
                  required
                  value={imageUrl}
                  loading={imageLoading}
                  onPress={handleProductImage}
                  Icon={ImagePlus}
                />
                <UploadBox
                  label="Waybill Picture"
                  required
                  value={waybillImage}
                  loading={waybillLoading}
                  onPress={handleWaybillImage}
                  Icon={FileText}
                />
              </View>
              <View>
                <Label>
                  {'Packing List '}
                  <Text style={{ color: C.gray400, fontWeight: '400' }}>(Optional)</Text>
                </Label>
                <Press
                  onPress={() => !packingListLoading && handlePackingList()}
                  accessibilityLabel="Upload packing list"
                  style={({ pressed }) => ({
                    width: '100%',
                    borderRadius: 12,
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: pressed ? 'rgba(255,106,0,0.5)' : C.gray200,
                    backgroundColor: pressed ? 'rgba(255,247,237,0.3)' : C.gray50,
                    paddingVertical: 16,
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
                      <Animated.View entering={FadeIn.duration(200)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Check size={16} color={EMERALD500} />
                        <Text style={[TS.xs, { fontWeight: '600', color: C.gray600 }]}>Packing list uploaded — click to replace</Text>
                      </Animated.View>
                    ) : (
                      <>
                        <Package size={16} color={pressed ? ORANGE : C.gray400} />
                        <Text style={[TS.xs, { fontWeight: '600', color: pressed ? ORANGE : C.gray400 }]}>
                          Upload Packing List (PDF/Image/Word)
                        </Text>
                      </>
                    )
                  }
                </Press>
              </View>
            </Section>

            {/* Warning notice */}
            <Animated.View
              entering={FadeIn.duration(260).delay(240)}
              style={{
                backgroundColor: C.red50,
                borderWidth: 1,
                borderColor: C.red200,
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                gap: 10,
              }}
            >
              <View style={{ marginTop: 2, flexShrink: 0 }}>
                <AlertTriangle size={16} color={C.red500} />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[TS.xs, { lineHeight: 19.5, fontWeight: '700', color: C.red700 }]}>
                  শিপমেন্ট করার আগে অবশ্যই পালনীয় নিয়মাবলী:
                </Text>
                <View style={{ gap: 6 }}>
                  <Bullet>
                    যেকোনো ভারী মেশিনারি বা ইকুইপমেন্ট (Machine or heavy equipment) কার্টন বর্জন করে অবশ্যই{' '}
                    <Text style={{ fontWeight: '700', textDecorationLine: 'underline' }}>উডেন বক্স (Wooden Box)</Text> এ বুকিং করতে
                    হবে।
                  </Bullet>
                  <Bullet>
                    যেকোনো সাধারণ বা ছোট কার্টন অবশ্যই বাইরের সুরক্ষার জন্য{' '}
                    <Text style={{ fontWeight: '700', textDecorationLine: 'underline' }}>সবুজ ব্যাগ (Green Bag)</Text> দিয়ে ভালোভাবে
                    মোড়ানো থাকতে হবে।
                  </Bullet>
                </View>
              </View>
            </Animated.View>

            {/* Submit — `w-full py-4 rounded-2xl font-extrabold` at the body's 16px */}
            <ScalePress
              onPress={handleSubmit}
              disabled={submitLoader}
              containerStyle={{ width: '100%' }}
              accessibilityLabel="Submit Booking"
              style={{
                width: '100%',
                backgroundColor: ORANGE,
                paddingVertical: 16,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: submitLoader ? 0.6 : 1,
              }}
            >
              {submitLoader && <Spinner size={16} color="#ffffff" />}
              <Text style={[TS.base, { fontWeight: '800', color: '#ffffff' }]}>{submitLoader ? 'Submitting…' : 'Submit Booking'}</Text>
            </ScalePress>
          </View>
        </Animated.ScrollView>

        {/* Global header (hide-on-scroll) + white status-bar strip */}
        <Animated.View
          pointerEvents={isHidden ? 'none' : 'box-none'}
          style={[{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 10 }, headerStyle]}
        >
          <Header hidden={isHidden} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)} />
        </Animated.View>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: '#ffffff', zIndex: 11 }} />

        <PickerSheet
          visible={sheet === 'origin'}
          title="Origin of Shipment"
          options={originOptions(method)}
          value={shipFrom}
          onSelect={(v) => {
            setShipFrom(v);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
        <PickerSheet
          visible={sheet === 'contains'}
          title="Product Contains"
          options={CONTAINS_OPTIONS}
          value={productContains}
          onSelect={(v) => {
            setProductContains(v);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      </View>
    </KbCtx.Provider>
  );
}
