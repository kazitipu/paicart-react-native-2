import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Keyboard, Platform, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import Animated, { FadeIn, useAnimatedRef } from 'react-native-reanimated';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  ChevronRight, Package, Link as LinkIcon, ShoppingBag, Upload, Store, Globe, Tag, AlignLeft,
  Plane, Ship, ClipboardPaste,
} from 'lucide-react-native';
import Header from '@/components/Header';
import useHideOnScroll from '@/lib/useHideOnScroll';
import Sweep from '@/components/ui/Sweep';
import ProductImage from '@/components/ui/ProductImage';
import { C, SHADOW, ORANGE, Press, ScalePress, Spinner } from '@/components/product/ui';
import { TS, tpx, RED } from '@/components/cart/CartBits';
import { PickerSheet } from '@/components/profile/ProfileBits';
import {
  GRAY50, PAGE_BG, ORANGE800, RED_SHADOW, MSG_SELECT, MSG_FILL,
  Field, Input, SelectBox, MethodButton, PastePill,
} from '@/components/buyforme/BuyForMeBits';
import { getAllD2DRates, setProductRequest, uploadImage, getSingleProductRequest } from '@/lib/firebaseUtils';
import { pickImage } from '@/lib/picker';
import { toast } from '@/lib/toast';
import { goHome } from '@/navigation/goHome';

/* ═══════════════════════════════════════════════════════════════════════
   Port of web src/app/pages/buy-for-me/page.jsx (< 640px). The web's
   /pages/request-for-product only redirects here.

   Under the global Header: the dark breadcrumb, the white page hero, the
   "Product Information" form card (store, origin country, Air/Sea, product
   type from the d2d rate table, link, quantity, description, one image, Book
   Now) and the "How It Works" card. No bottom bar on the web for this route.

   Write (same as the web, field for field): setProductRequest() →
   bookingRequest/{random bookingId} = { bookingId, store, country,
   productType, shippingRate, shipmentMethod: 'Air'|'Sea', productUrl,
   productQuantity, productVariant, imageUrl, date (en-GB), time,
   userId, displayName, shipmentStatusScore: 1, status: 'Pending',
   orderStatus: 'Pending' }.

   Deliberate RN fixes (commented where they happen):
   - The thunk is unrolled (setProductRequest + SET_PRODUCT_REQUEST dispatch)
     so a failed write shows an error instead of the web's unconditional
     success toast, and a thrown error doesn't leave the button spinning.
   - Rates are fetched through getAllD2DRates directly with a sequence guard
     (a slow earlier country can't overwrite a later one) and `|| []` (the
     slice spreads the payload, which throws on the lib's `undefined`).
   - The product-type value is split at its LAST '-' (a rate id containing a
     '-' broke the web's split).
   - Reset also clears the "Book again" banner/type.
   - Text fields are uncontrolled (refs + remount key) — see pitfalls.
   ═══════════════════════════════════════════════════════════════════════ */

const STORES = [
  'AliExpress', 'Gearbest', 'Taobao', 'Flipkart',
  'Amazon (India)', 'Amazon (USA)', 'Amazon (UAE)', 'Best Buy',
  'Alibaba', 'Pingduoduo', 'Taobao (Direct)', 'Walmart',
  'eBay', 'JLCPCB', 'Noon', 'Myntra', 'Others',
];

const COUNTRIES = [
  { value: 'china', label: '🇨🇳 China' },
  { value: 'uk', label: '🇬🇧 UK' },
  { value: 'usa', label: '🇺🇸 USA' },
  { value: 'hongkong', label: '🇭🇰 Hongkong' },
  { value: 'thailand', label: '🇹🇭 Thailand' },
  { value: 'india', label: '🇮🇳 India' },
];

/* Stores that clearly belong to one origin country — picking one of these
   auto-selects the matching country instead of making the customer pick it
   twice. Ambiguous ones (Amazon UAE, Noon, Others, …) are left out. */
const STORE_COUNTRY_MAP = {
  AliExpress: 'china',
  Gearbest: 'china',
  Taobao: 'china',
  'Taobao (Direct)': 'china',
  Alibaba: 'china',
  Pingduoduo: 'china',
  JLCPCB: 'china',
  Flipkart: 'india',
  'Amazon (India)': 'india',
  Myntra: 'india',
  'Amazon (USA)': 'usa',
  'Best Buy': 'usa',
  Walmart: 'usa',
  eBay: 'usa',
};

const STORE_OPTIONS = [{ value: '', label: 'Select Store' }, ...STORES.map((s) => ({ value: s, label: s }))];
const COUNTRY_OPTIONS = [{ value: '', label: 'Select Country' }, ...COUNTRIES];

const STEPS = [
  ['1', 'Select the store and origin country, then pick a product type to see the shipping rate.'],
  ['2', 'Paste the product link and describe what you need (color, size, quantity).'],
  ['3', 'After your approval, we purchase and ship to Bangladesh.'],
];

/* Requests made by the old RN screen stored 'China' / 'India'; the web's
   values (and the d2d-rates collection names) are lowercase. */
const normCountry = (c) => {
  const v = String(c || '').toLowerCase();
  return COUNTRIES.some((x) => x.value === v) ? v : c || '';
};

/* `${rate.id}-${rate.eleven}` → [id, eleven], split at the last '-'. */
const splitType = (v) => {
  const i = v.lastIndexOf('-');
  return i < 0 ? [v, ''] : [v.slice(0, i), v.slice(i + 1)];
};

const card = {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  borderWidth: 1,
  borderColor: C.gray100,
  boxShadow: SHADOW.base, // v4 shadow-sm
  overflow: 'hidden',
};

export default function BuyForMe() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const currentUser = useSelector((s) => s.user?.currentUser);
  const d2dRates = useSelector((s) => s.bookingRequests?.d2dRates || []);
  const bookings = useSelector((s) => s.bookingRequests?.bookingsArrayOfSingleUser || []);

  const [store, setStore] = useState('');
  const [country, setCountry] = useState('');
  /* Air vs Sea decides which rate table the product types come from. */
  const [shipmentMethod, setShipmentMethod] = useState('air');
  const [productType, setProductType] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageLoader, setImageLoader] = useState(false);
  const [submitLoader, setSubmitLoader] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [sheet, setSheet] = useState(null); // 'store' | 'country' | 'type'
  const [invalid, setInvalid] = useState(null); // { field, message }

  /* Text fields: uncontrolled. Their text lives here; bumping formKey
     remounts them with new defaultValues (reset / Book Again / Paste). */
  const vals = useRef({ productUrl: '', productQuantity: '', productVariant: '' });
  const [formKey, setFormKey] = useState(0);
  const [linkEmpty, setLinkEmpty] = useState(true);
  const urlRef = useRef(null);
  const qtyRef = useRef(null);
  const variantRef = useRef(null);
  const fieldRefs = {
    store: useRef(null),
    country: useRef(null),
    productType: useRef(null),
    productQuantity: useRef(null),
    productVariant: useRef(null),
  };

  /* ── chrome + keyboard ── */
  const { onScroll, scrollY, isHidden, headerH, setHeaderH, headerStyle } = useHideOnScroll();
  const scrollRef = useAnimatedRef();
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
  }, [scrollRef, scrollY]);

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

  /* Scroll a block to the middle of the visible area when it is off-screen
     (what Chrome does for the first invalid control). */
  const reveal = useCallback(
    (viewRef) => {
      const v = viewRef?.current;
      if (!v?.measureInWindow) return;
      v.measureInWindow((_x, y, _w, h) => {
        const winH = Dimensions.get('window').height;
        const top = insets.top + 8;
        const bottom = (kbTopRef.current || winH) - 72;
        if (y >= top && y + h <= bottom) return;
        const target = scrollY.value + y - (top + bottom) / 2 + h / 2;
        scrollRef.current?.scrollTo({ y: Math.max(0, target), animated: true });
      });
    },
    [insets.top, scrollRef, scrollY],
  );

  /* The bubble goes away after a few seconds, like Chrome's. */
  useEffect(() => {
    if (!invalid) return undefined;
    const id = setTimeout(() => setInvalid(null), 5000);
    return () => clearTimeout(id);
  }, [invalid]);
  const clearInvalid = (field) => setInvalid((cur) => (cur && cur.field === field ? null : cur));

  /* ── rates ── */
  const ratesSeq = useRef(0);
  const loadRates = useCallback(
    async (method, c) => {
      const seq = ++ratesSeq.current;
      setRatesLoading(true);
      const arr = await getAllD2DRates(method, c);
      if (seq !== ratesSeq.current) return;
      dispatch({ type: 'GET_ALL_D2D_RATES', payload: arr || [] });
      setRatesLoading(false);
    },
    [dispatch],
  );

  /* ── "Book Again" ──
     The web lands here as ?rebook=<bookingId>; the RN request cards pass the
     request itself as `rebook`. Either is accepted. The product type can only
     be chosen once its rate table has loaded, so it is remembered and
     resolved against d2dRates at render time. */
  const [rebookFrom, setRebookFrom] = useState(null);
  const [rebookType, setRebookType] = useState('');
  const rebookParam = route.params?.rebook;
  const rebookApplied = useRef(null);

  useEffect(() => {
    if (!rebookParam || !currentUser?.id) return;
    const id = String(typeof rebookParam === 'object' ? rebookParam.bookingId : rebookParam);
    if (rebookApplied.current === id) return;
    rebookApplied.current = id;
    (async () => {
      const b =
        typeof rebookParam === 'object'
          ? rebookParam
          : bookings.find((x) => String(x.bookingId) === id) || (await getSingleProductRequest(id));
      if (!b || (b.userId && b.userId !== currentUser.id)) return;
      const method = String(b.shipmentMethod || b.method || '').toLowerCase() === 'sea' ? 'sea' : 'air';
      const c = normCountry(b.country);
      setStore(b.store || '');
      setShipmentMethod(method);
      setProductType('');
      if (c) {
        setCountry(c);
        loadRates(method, c);
      }
      vals.current = {
        productUrl: b.productUrl || '',
        productQuantity: String(b.productQuantity || b.quantity || ''),
        productVariant: b.productVariant || b.variant || '',
      };
      setLinkEmpty(!vals.current.productUrl);
      setFormKey((k) => k + 1);
      setImageUrl(b.imageUrl || '');
      setRebookType(b.productType || '');
      setRebookFrom(b.bookingId);
      setInvalid(null);
    })();
  }, [rebookParam, currentUser?.id, bookings, loadRates]);

  /* The old request's product type, once its rate row has loaded */
  const rebookRate = rebookType && !productType ? d2dRates.find((r) => r.id === rebookType) : null;
  const selectedProductType = productType || (rebookRate ? `${rebookRate.id}-${rebookRate.eleven}` : '');

  const typeOptions = useMemo(
    () => [
      {
        value: '',
        label:
          d2dRates.length === 0
            ? 'Select country first'
            : `Select Product Type (${shipmentMethod === 'sea' ? 'Sea' : 'Air'})`,
      },
      ...d2dRates.map((rate) => ({ value: `${rate.id}-${rate.eleven}`, label: String(rate.id) })),
    ],
    [d2dRates, shipmentMethod],
  );

  /* ── handlers ── */
  const handleCountryChange = (val, method = shipmentMethod) => {
    setCountry(val);
    setProductType('');
    setRebookType('');
    clearInvalid('country');
    if (val) loadRates(method, val);
  };

  const handleShipmentMethodChange = (method) => {
    if (method === shipmentMethod) return;
    setShipmentMethod(method);
    setProductType('');
    setRebookType('');
    if (country) loadRates(method, country);
  };

  const handleStoreChange = (val) => {
    setStore(val);
    clearInvalid('store');
    const matched = STORE_COUNTRY_MAP[val];
    if (matched) handleCountryChange(matched);
  };

  /* <input type="file" accept="image/*"> → camera / library chooser */
  const handleImgPress = async () => {
    if (imageLoader) return;
    let asset;
    try {
      asset = await pickImage({ title: 'Upload Image' });
    } catch (e) {
      toast.error(e?.message || 'Could not open the picker');
      return;
    }
    if (!asset) return;
    setImageLoader(true);
    try {
      const url = await uploadImage(asset);
      setImageUrl(url);
    } catch {
      toast.error('Image upload failed');
    }
    setImageLoader(false);
  };

  const pasteLink = async () => {
    let text = '';
    try {
      text = String((await Clipboard.getString()) || '').trim();
    } catch {
      /* clipboard unavailable */
    }
    if (!text) {
      toast.info('Nothing to paste');
      return;
    }
    vals.current.productUrl = text;
    setLinkEmpty(false);
    setFormKey((k) => k + 1);
  };

  const resetForm = () => {
    setStore('');
    setCountry('');
    setProductType('');
    setShipmentMethod('air');
    vals.current = { productUrl: '', productQuantity: '', productVariant: '' };
    setLinkEmpty(true);
    setImageUrl('');
    /* RN fix: the web left the "Booking again" banner (and the old type)
       behind after a successful submit. */
    setRebookFrom(null);
    setRebookType('');
    setFormKey((k) => k + 1);
  };

  const handleSubmit = async () => {
    if (submitLoader) return;
    Keyboard.dismiss();

    /* The browser's `required` check runs before onSubmit, in DOM order:
       store, country, product type, quantity, description. Whitespace counts
       as filled, as it does for a required input. */
    const checks = [
      ['store', store === '', MSG_SELECT],
      ['country', country === '', MSG_SELECT],
      ['productType', selectedProductType === '', MSG_SELECT],
      ['productQuantity', vals.current.productQuantity === '', MSG_FILL],
      ['productVariant', vals.current.productVariant === '', MSG_FILL],
    ];
    const bad = checks.find(([, empty]) => empty);
    if (bad) {
      const [field, , message] = bad;
      setInvalid({ field, message });
      if (field === 'productQuantity') qtyRef.current?.focus();
      else if (field === 'productVariant') variantRef.current?.focus();
      setTimeout(() => reveal(fieldRefs[field]), 50);
      return;
    }
    setInvalid(null);

    if (!currentUser?.id) {
      toast.error('You must login first');
      /* web: /pages/login?returnTo=/pages/request-for-product. Login is
         pushed over this screen, so signing in comes back here with the
         form still filled in. */
      navigation.navigate('Login', { returnTo: 'BuyForMe' });
      return;
    }
    if (imageLoader) {
      toast.error('Wait for the image to be uploaded!');
      return;
    }
    if (!selectedProductType || !country) {
      toast.error('Please select a product type.');
      return;
    }

    setSubmitLoader(true);
    const date = new Date();
    const [type, shippingRate] = splitType(selectedProductType);
    const { productUrl, productQuantity, productVariant } = vals.current;

    let saved = null;
    try {
      saved = await setProductRequest({
        store,
        country,
        productType: type,
        shippingRate,
        /* travels with the request for the rest of its life — admin panel,
           invoices and the customer's own request pages all read it */
        shipmentMethod: shipmentMethod === 'sea' ? 'Sea' : 'Air',
        productUrl,
        productQuantity,
        productVariant,
        imageUrl,
        date: date.toLocaleDateString('en-GB'),
        time: date.getTime(),
        userId: currentUser.id,
        /* Firestore rejects `undefined`; the web's write silently failed for
           an account without a display name. */
        displayName: currentUser.displayName ?? '',
        shipmentStatusScore: 1,
        status: 'Pending',
        orderStatus: 'Pending',
      });
    } catch {
      saved = null;
    }
    setSubmitLoader(false);

    if (!saved) {
      toast.error('Could not submit the request. Please try again.');
      return;
    }
    dispatch({ type: 'SET_PRODUCT_REQUEST', payload: saved });
    toast.success('Your booking is successful! Our agent will contact you soon');
    resetForm();
  };

  /* ── render ── */
  const topPad = insets.top + headerH;
  const storeLabel = store || 'Select Store';
  const countryLabel = COUNTRIES.find((c) => c.value === country)?.label || (country ? country : 'Select Country');
  const typeLabel = typeOptions.find((o) => o.value === selectedProductType)?.label || typeOptions[0].label;
  const errOf = (f) => (invalid?.field === f ? invalid.message : null);

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingTop: topPad, paddingBottom: kbPad }}
      >
        {/* Breadcrumb */}
        <View style={{ backgroundColor: '#1C1C1C', paddingHorizontal: 16, paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Press onPress={goHome} hitSlop={8}>
              {({ pressed }) => (
                <Text style={[TS.sm, { fontWeight: '500', color: pressed ? '#ffffff' : C.gray400 }]}>Home</Text>
              )}
            </Press>
            <ChevronRight size={12} color={C.gray600} />
            <Text style={[TS.sm, { fontWeight: '600', color: '#ffffff' }]}>Product Request</Text>
          </View>
        </View>

        {/* Page hero */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderBottomWidth: 1,
            borderBottomColor: C.gray100,
            paddingHorizontal: 16,
            paddingVertical: 20,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: ORANGE,
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: RED_SHADOW,
              }}
            >
              <ShoppingBag size={22} color="#ffffff" />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={[TS.lg, { fontWeight: '800', color: C.gray900 }]}>Product Request</Text>
              <Text style={[TS.xs, { color: C.gray400, marginTop: 2 }]}>
                Submit product details · We'll source it · Delivered to you
              </Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 80, gap: 16 }}>
          {/* Form card */}
          <View style={card}>
            <View style={{ height: 2, backgroundColor: ORANGE }} />

            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: GRAY50,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: ORANGE,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Package size={14} color="#ffffff" />
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text style={[TS.sm, { fontWeight: '700', color: C.gray800 }]}>Product Information</Text>
                <Text style={[TS.xs, { color: C.gray400 }]}>
                  Fill in the details and we'll get back to you with a quote
                </Text>
              </View>
            </View>

            <View style={{ paddingHorizontal: 20, paddingVertical: 20, gap: 16 }}>
              {!!rebookFrom && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.orange200,
                    backgroundColor: C.orange50,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={[TS.xs, { color: ORANGE800 }]}>
                    Booking again from request <Text style={{ fontWeight: '700' }}>#{rebookFrom}</Text> — check the
                    details below and submit.
                  </Text>
                </Animated.View>
              )}

              <Field label="Product Store" error={errOf('store')} viewRef={fieldRefs.store}>
                <SelectBox icon={Store} label={storeLabel} open={sheet === 'store'} onPress={() => setSheet('store')} />
              </Field>

              <Field label="Origin Country" error={errOf('country')} viewRef={fieldRefs.country}>
                <SelectBox
                  icon={Globe}
                  label={countryLabel}
                  open={sheet === 'country'}
                  onPress={() => setSheet('country')}
                />
              </Field>

              {/* Shipment method — decides which rate table feeds the types below */}
              <Field label="Shipment Method">
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <MethodButton
                    Icon={Plane}
                    label="By Air"
                    active={shipmentMethod === 'air'}
                    onPress={() => handleShipmentMethodChange('air')}
                  />
                  <MethodButton
                    Icon={Ship}
                    label="By Sea"
                    active={shipmentMethod === 'sea'}
                    onPress={() => handleShipmentMethodChange('sea')}
                  />
                </View>
              </Field>

              {/* Product Type — populated from d2dRates after country pick */}
              <Field label="Product Type" error={errOf('productType')} viewRef={fieldRefs.productType}>
                <SelectBox
                  icon={Tag}
                  label={typeLabel}
                  open={sheet === 'type'}
                  loading={ratesLoading}
                  onPress={() => setSheet('type')}
                />
              </Field>

              <Field label="Product Link">
                <Input
                  key={`url-${formKey}`}
                  ref={urlRef}
                  kb={kb}
                  icon={LinkIcon}
                  defaultValue={vals.current.productUrl}
                  onChangeText={(t) => {
                    vals.current.productUrl = t;
                    setLinkEmpty(t === '');
                  }}
                  placeholder="Enter product URL here"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => qtyRef.current?.focus()}
                  padRight={linkEmpty ? 84 : 14}
                  right={linkEmpty ? <PastePill Icon={ClipboardPaste} onPress={pasteLink} /> : null}
                />
              </Field>

              <Field label="Product Quantity" error={errOf('productQuantity')} viewRef={fieldRefs.productQuantity}>
                <Input
                  key={`qty-${formKey}`}
                  ref={qtyRef}
                  kb={kb}
                  icon={ShoppingBag}
                  defaultValue={vals.current.productQuantity}
                  onChangeText={(t) => {
                    vals.current.productQuantity = t;
                    if (t !== '') clearInvalid('productQuantity');
                  }}
                  placeholder="Total pcs"
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => variantRef.current?.focus()}
                />
              </Field>

              <Field
                label="Product Description (Color, Size, Pc)"
                error={errOf('productVariant')}
                viewRef={fieldRefs.productVariant}
              >
                <Input
                  key={`var-${formKey}`}
                  ref={variantRef}
                  kb={kb}
                  icon={AlignLeft}
                  multiline
                  defaultValue={vals.current.productVariant}
                  onChangeText={(t) => {
                    vals.current.productVariant = t;
                    if (t !== '') clearInvalid('productVariant');
                  }}
                  placeholder="Ex: color: red, size: M, pcs: 20"
                />
              </Field>

              <Field label="Upload Image">
                <ScalePress
                  onPress={handleImgPress}
                  disabled={imageLoader}
                  scaleTo={0.96}
                  containerStyle={{ alignSelf: 'flex-start' }}
                  accessibilityLabel="Upload image"
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: C.gray200,
                    backgroundColor: GRAY50,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {imageLoader ? (
                    <Spinner size={22} color={RED} />
                  ) : imageUrl ? (
                    <Animated.View key={imageUrl} entering={FadeIn.duration(200)} style={{ width: '100%', height: '100%' }}>
                      <ProductImage uri={imageUrl} style={{ width: '100%', height: '100%' }} />
                    </Animated.View>
                  ) : (
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <Upload size={22} color={C.gray300} />
                      <Text style={[tpx(11), { fontWeight: '500', color: C.gray300 }]}>Click to upload</Text>
                    </View>
                  )}
                </ScalePress>
              </Field>

              {/* Submit — `py-3 rounded-xl font-bold` with the searchShimmer band */}
              <Press
                onPress={handleSubmit}
                disabled={submitLoader}
                accessibilityLabel="Book Now"
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: ORANGE,
                  overflow: 'hidden',
                  opacity: submitLoader ? 0.6 : pressed ? 0.75 : 1,
                })}
              >
                <Sweep duration={2600} opacity={0.22} />
                {submitLoader ? <Spinner size={16} color="#ffffff" /> : <ShoppingBag size={16} color="#ffffff" />}
                <Text style={[TS.base, { fontWeight: '700', color: '#ffffff' }]}>
                  {submitLoader ? 'Submitting...' : 'Book Now'}
                </Text>
              </Press>
            </View>
          </View>

          {/* How it works */}
          <View style={card}>
            <View style={{ height: 2, backgroundColor: '#1677FF' }} />
            <View style={{ paddingHorizontal: 20, paddingVertical: 16, gap: 12 }}>
              <Text
                style={[
                  TS.xs,
                  { fontWeight: '700', color: C.gray700, textTransform: 'uppercase', letterSpacing: 0.3 },
                ]}
              >
                How It Works
              </Text>
              {STEPS.map(([n, text]) => (
                <View key={n} style={{ flexDirection: 'row', gap: 12 }}>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: ORANGE,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 2,
                    }}
                  >
                    <Text style={[tpx(10), { fontWeight: '800', color: '#ffffff' }]}>{n}</Text>
                  </View>
                  <Text style={{ flexShrink: 1, fontSize: 12, lineHeight: 19.5, color: C.gray500 }}>{text}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Global Header (hide-on-scroll) + white status-bar strip */}
      <Animated.View
        pointerEvents={isHidden ? 'none' : 'box-none'}
        style={[{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 50 }, headerStyle]}
      >
        <Header hidden={isHidden} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)} />
      </Animated.View>
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: '#ffffff', zIndex: 51 }}
      />

      {/* <select> option lists */}
      <PickerSheet
        visible={sheet === 'store'}
        title="Product Store"
        options={STORE_OPTIONS}
        value={store}
        onSelect={(v) => {
          setSheet(null);
          handleStoreChange(v);
        }}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        visible={sheet === 'country'}
        title="Origin Country"
        options={COUNTRY_OPTIONS}
        value={country}
        onSelect={(v) => {
          setSheet(null);
          handleCountryChange(v);
        }}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        visible={sheet === 'type'}
        title="Product Type"
        options={typeOptions}
        value={selectedProductType}
        searchable={d2dRates.length > 12}
        onSelect={(v) => {
          setSheet(null);
          setProductType(v);
          if (v) clearInvalid('productType');
          /* picking the placeholder clears an auto-resolved Book Again type too */
          if (!v) setRebookType('');
        }}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}
