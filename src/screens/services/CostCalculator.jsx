import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Keyboard, Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import Animated, { FadeIn, useAnimatedRef } from 'react-native-reanimated';
import {
  Calculator, ChevronRight, Plane, Ship, Package, Scale, Tag, ArrowRight, RotateCcw, Info,
} from 'lucide-react-native';
import Header from '@/components/Header';
import { C, ORANGE, Press, ScalePress } from '@/components/product/ui';
import { TS, tpx, RED } from '@/components/cart/CartBits';
import { CARD, ORANGE_SHADOW, PickerSheet } from '@/components/profile/ProfileBits';
import {
  PAGE_BG, GREEN200, BLUE700, ORIGIN_LABELS, originOptions, calcRate, nativeNumberError,
  Label, FieldError, SectionHeader, CalcInput, ReadOnlyBox, SelectField, MethodOption, InfoCell, CountUp,
} from '@/components/calculator/CalcBits';
import { getAllD2DRatesRedux } from '@/store/actions';
import useHideOnScroll from '@/lib/useHideOnScroll';
import { TABS } from '@/navigation/routes';
import { goHome as goHomeNav } from '@/navigation/goHome';

/* ═══════════════════════════════════════════════════════════════════════
   COST CALCULATOR — port of paicart-nextjs15 src/app/pages/cost-calculator/
   page.jsx at its mobile breakpoint (< 640px). The route renders under the
   global Header (hide-on-scroll) with no BottomNav or pinned bar; its
   Footer is not ported (as on Cart).

   Sections: dark breadcrumb (Home › Dashboard › Cost Calculator), title
   card, the "1 Shipment Details" form (method radios, origin select,
   read-only destination, weight, product type, submit), and — after a
   successful calculation — the "Estimated Result" card with the Ship For
   Me CTA.

   Rates: redux s.bookingRequests.d2dRates, re-fetched from
   `d2d-rates-${method}-${shipFrom}` whenever method or origin changes
   (which also clears the product type and result), as on the web. The
   maths is the web's calcRate verbatim (components/calculator/CalcBits).

   Native additions: bottom-sheet pickers (Product Type searchable when the
   list is long), the total counts up, the result card fades in, press
   feedback, and the weight field is kept clear of the keyboard.
   ═══════════════════════════════════════════════════════════════════════ */

const PAGE_PX = 16; // px-4

export default function CostCalculator() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const d2dRates = useSelector((s) => s.bookingRequests?.d2dRates || []);

  const [method, setMethod] = useState('air');
  const [shipFrom, setShipFrom] = useState('china');
  const [productType, setProductType] = useState('');
  const [errors, setErrors] = useState({});
  const [nativeMsg, setNativeMsg] = useState(null);
  const [result, setResult] = useState(null);
  const [picker, setPicker] = useState(null); // 'origin' | 'type' | null

  /* weight stays uncontrolled; its text lives in a ref */
  const weightRef = useRef('');
  const weightInput = useRef(null);
  const weightBox = useRef(null);

  useEffect(() => {
    dispatch(getAllD2DRatesRedux(method, shipFrom));
    setProductType('');
    setResult(null);
  }, [method, shipFrom, dispatch]);

  /* India is an air-only origin. On the web, switching to sea with India
     selected drops the option from the <select> (which then shows China)
     while still fetching sea-india; follow what the user sees instead. */
  const chooseMethod = (m) => {
    setMethod(m);
    if (m === 'sea' && shipFrom === 'india') setShipFrom('china');
  };

  const handleCalculate = () => {
    Keyboard.dismiss();
    /* browser constraint validation (min=0 step=0.1) runs before onSubmit */
    const bad = nativeNumberError(weightRef.current);
    if (bad) {
      setNativeMsg(bad);
      weightInput.current?.focus();
      return;
    }
    const raw = String(weightRef.current || '').trim().replace(',', '.');
    const newErrors = {};
    if (!raw) newErrors.weight = true;
    if (!productType) newErrors.productType = true;
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    const weightNum = parseFloat(raw);
    const calc = calcRate(weightNum, productType, d2dRates, method);
    setResult(calc ? { ...calc, method, shipFrom, weight: weightNum, productType } : null);
  };

  const handleReset = () => {
    weightRef.current = '';
    weightInput.current?.clear();
    setNativeMsg(null);
    setProductType('');
    setResult(null);
    setErrors({});
  };

  /* ── chrome: hide-on-scroll Header + white status-bar strip ── */
  const scrollRef = useAnimatedRef();
  const { onScroll, scrollY, isHidden, headerH, setHeaderH, headerStyle } = useHideOnScroll();
  const topPad = insets.top + headerH;

  /* ── keyboard: edge-to-edge Android does not resize the window ── */
  const kbTopRef = useRef(0);
  const [kbPad, setKbPad] = useState(0);
  const ensureVisible = useCallback(() => {
    const box = weightBox.current;
    if (!box || !kbTopRef.current) return;
    box.measureInWindow((_x, y, _w, h) => {
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

  const typeOptions = [
    { value: '', label: d2dRates.length === 0 ? 'Loading...' : 'Select Type' },
    ...d2dRates.map((r) => ({ value: r.id, label: String(r.id) })),
  ];

  const goDashboard = () => navigation.navigate(TABS.ORDERS, { screen: 'DashboardOverview' });
  const goHome = () => goHomeNav();

  return (
    <View style={{ flex: 1, backgroundColor: PAGE_BG }}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: 40 + kbPad }}
      >
        {/* Breadcrumb */}
        <View style={{ backgroundColor: '#1C1C1C', paddingHorizontal: PAGE_PX, paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Press onPress={goHome} hitSlop={8}>
              {({ pressed }) => (
                <Text style={[TS.sm, { fontWeight: '500', color: pressed ? '#ffffff' : C.red200 }]}>Home</Text>
              )}
            </Press>
            <ChevronRight size={12} color="#fca5a5" />
            <Press onPress={goDashboard} hitSlop={8}>
              {({ pressed }) => (
                <Text style={[TS.sm, { fontWeight: '500', color: pressed ? '#ffffff' : C.red200 }]}>Dashboard</Text>
              )}
            </Press>
            <ChevronRight size={12} color="#fca5a5" />
            <Text style={[TS.sm, { fontWeight: '600', color: '#ffffff' }]}>Cost Calculator</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: PAGE_PX, paddingVertical: 24, gap: 16 }}>
          {/* Header card */}
          <View style={[CARD, { padding: 20 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 16,
                  backgroundColor: ORANGE,
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: ORANGE_SHADOW,
                }}
              >
                <Calculator size={20} color="#ffffff" />
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text style={[TS.lg, { fontWeight: '800', color: C.gray900 }]}>Shipping Cost Calculator</Text>
                <Text style={[TS.xs, { color: C.gray400, marginTop: 2 }]}>
                  Get an instant approximate rate — no booking required
                </Text>
              </View>
            </View>
          </View>

          {/* Form */}
          <View style={[CARD, { overflow: 'hidden' }]}>
            <SectionHeader n={1} title="Shipment Details" />
            <View style={{ paddingHorizontal: 20, paddingVertical: 16, gap: 16 }}>
              <View>
                <Label>Shipment Method</Label>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <MethodOption active={method === 'air'} Icon={Plane} label="By Air" onPress={() => chooseMethod('air')} />
                  <MethodOption active={method === 'sea'} Icon={Ship} label="By Sea" onPress={() => chooseMethod('sea')} />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flexGrow: 1, flexBasis: 0 }}>
                  <Label>Origin of Shipment</Label>
                  <SelectField
                    label={ORIGIN_LABELS[shipFrom]}
                    chevron
                    open={picker === 'origin'}
                    onPress={() => setPicker('origin')}
                    accessibilityLabel="Origin of Shipment"
                  />
                </View>
                <View style={{ flexGrow: 1, flexBasis: 0 }}>
                  <Label>Destination</Label>
                  <ReadOnlyBox value="🇧🇩 Bangladesh" />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View ref={weightBox} collapsable={false} style={{ flexGrow: 1, flexBasis: 0 }}>
                  <Label required>Total Weight (kg)</Label>
                  <CalcInput
                    ref={weightInput}
                    icon={Scale}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 2.5"
                    onChangeText={(v) => {
                      weightRef.current = v;
                      if (nativeMsg) setNativeMsg(null);
                    }}
                    onFocus={() => {
                      if (Keyboard.isVisible()) setTimeout(ensureVisible, 80);
                    }}
                    returnKeyType="done"
                    onSubmitEditing={handleCalculate}
                  />
                  {nativeMsg ? (
                    <FieldError>{nativeMsg}</FieldError>
                  ) : (
                    errors.weight && <FieldError>*Enter total weight</FieldError>
                  )}
                </View>
                <View style={{ flexGrow: 1, flexBasis: 0 }}>
                  <Label required>Product Type</Label>
                  <SelectField
                    label={productType || typeOptions[0].label}
                    icon={Tag}
                    open={picker === 'type'}
                    onPress={() => setPicker('type')}
                    accessibilityLabel="Product Type"
                  />
                  {errors.productType && <FieldError>*Select a product type</FieldError>}
                </View>
              </View>

              <ScalePress
                onPress={handleCalculate}
                accessibilityLabel="Calculate Shipping Cost"
                style={{
                  backgroundColor: ORANGE,
                  paddingVertical: 14,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Calculator size={16} color="#ffffff" />
                <Text style={[TS.base, { fontWeight: '800', color: '#ffffff' }]}>Calculate Shipping Cost</Text>
              </ScalePress>
            </View>
          </View>

          {/* Result */}
          {result && (
            <Animated.View entering={FadeIn.duration(260)} style={[CARD, { overflow: 'hidden' }]}>
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: C.gray50,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: C.green50,
                      borderWidth: 1,
                      borderColor: GREEN200,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Package size={13} color={C.green600} />
                  </View>
                  <Text style={[TS.sm, { fontWeight: '800', color: C.gray900 }]}>Estimated Result</Text>
                </View>
                <Press onPress={handleReset} hitSlop={10} accessibilityLabel="Reset">
                  {({ pressed }) => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <RotateCcw size={12} color={pressed ? RED : C.gray400} />
                      <Text style={[TS.xs, { fontWeight: '600', color: pressed ? RED : C.gray400 }]}>Reset</Text>
                    </View>
                  )}
                </Press>
              </View>

              <View style={{ paddingHorizontal: 20, paddingVertical: 16, gap: 12 }}>
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <InfoCell label="Ship By">
                      {result.method === 'air' ? <Plane size={12} color={ORANGE} /> : <Ship size={12} color={ORANGE} />}
                      <Text style={[TS.sm, { fontWeight: '600', color: C.gray800 }]}>
                        {result.method === 'air' ? 'By Air' : 'By Sea'}
                      </Text>
                    </InfoCell>
                    <InfoCell label="Ship From">
                      <Text style={[TS.sm, { fontWeight: '600', color: C.gray800 }]}>
                        {ORIGIN_LABELS[result.shipFrom] || result.shipFrom}
                      </Text>
                    </InfoCell>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <InfoCell label="Product Type">
                      <Text style={[TS.sm, { fontWeight: '600', color: C.gray800, flexShrink: 1 }]}>{result.productType}</Text>
                    </InfoCell>
                    <InfoCell label="Total Weight">
                      <Text style={[TS.sm, { fontWeight: '600', color: C.gray800 }]}>{result.weight} kg</Text>
                    </InfoCell>
                  </View>
                </View>

                <View
                  style={{
                    backgroundColor: C.orange50,
                    borderWidth: 1,
                    borderColor: C.orange100,
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={[TS.xs, { fontWeight: '700', color: C.gray600 }]}>Rate</Text>
                  <Text style={[TS.sm, { fontWeight: '700', color: C.gray800 }]}>৳{String(result.perKg)} / kg</Text>
                </View>

                <View style={{ borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: ORANGE }}>
                  <Text
                    style={[
                      tpx(11),
                      { color: 'rgba(255,255,255,0.8)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.275, textAlign: 'center' },
                    ]}
                  >
                    Total Shipping Charge (approx)
                  </Text>
                  <CountUp
                    value={result.result}
                    style={{ fontSize: 24, lineHeight: 32, color: '#ffffff', fontWeight: '800', marginTop: 4 }}
                  />
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    gap: 8,
                    backgroundColor: C.blue50,
                    borderWidth: 1,
                    borderColor: C.blue100,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <View style={{ marginTop: 2 }}>
                    <Info size={14} color={C.blue500} />
                  </View>
                  <View style={{ flexShrink: 1, gap: 6 }}>
                    {[
                      '(IF 1 CBM = 167kg)',
                      'প্রোডাক্টের ধরণ এবং কোয়ান্টিটি এর উপর ভিত্তি করে শিপিং চার্জ কম কিংবা বেশি হতে পারে। বুকিং প্লেস করার কিছুক্ষনের মাঝেই আমাদের কাস্টমার প্রতিনিধি আপনাকে বুকিং এর চুড়ান্ত শিপিং চার্জ জানিয়ে দিবে।',
                      'আপনার প্রেরিত পণ্যের প্রতিটা বক্সের উপরে আপনার শিপিং মার্ক/নাম, পণ্যের বিবরণ (পণ্যের নাম, কত পিস) অবশ্যই লেখা থাকতে হবে।',
                    ].map((p) => (
                      <Text key={p} style={{ fontSize: 11, lineHeight: 11 * 1.625, color: BLUE700 }}>
                        {p}
                      </Text>
                    ))}
                  </View>
                </View>

                <Press
                  onPress={() => navigation.navigate('ShipForMeForm')}
                  accessibilityRole="link"
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: 'rgba(230,34,34,0.2)',
                    backgroundColor: pressed ? C.red50 : 'transparent',
                  })}
                >
                  <Text style={[TS.sm, { fontWeight: '700', color: RED }]}>Ready to ship? Book a request</Text>
                  <ArrowRight size={14} color={RED} />
                </Press>
              </View>
            </Animated.View>
          )}
        </View>
      </Animated.ScrollView>

      {/* chrome */}
      <Animated.View
        pointerEvents={isHidden ? 'none' : 'box-none'}
        style={[{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 10 }, headerStyle]}
      >
        <Header hidden={isHidden} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)} />
      </Animated.View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: '#ffffff', zIndex: 11 }} />

      <PickerSheet
        visible={picker === 'origin'}
        title="Origin of Shipment"
        options={originOptions(method)}
        value={shipFrom}
        onSelect={(v) => {
          setShipFrom(v);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
      <PickerSheet
        visible={picker === 'type'}
        title="Product Type"
        options={typeOptions}
        value={productType}
        searchable={typeOptions.length > 8}
        onSelect={(v) => {
          setProductType(v);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </View>
  );
}

