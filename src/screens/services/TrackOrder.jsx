import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Clipboard from '@react-native-clipboard/clipboard';
import { Search, X, Package, CreditCard, User, Hash, ClipboardPaste } from 'lucide-react-native';
import Header from '@/components/Header';
import { C, Press } from '@/components/product/ui';
import {
  ORANGE, BODY, TS, tpx, TC, SHADOW_LG, CARD,
  SpinIcon, InfoField, JourneyCard, NotShippedCard,
} from '@/components/track/TrackBits';
import { getOrderOrShipmentRequest } from '@/lib/firebaseUtils';
import { toast } from '@/lib/toast';
import useHideOnScroll from '@/lib/useHideOnScroll';
import { goHome } from '@/navigation/goHome';

/* ═══════════════════════════════════════════════════════════════════════
   TRACK ORDER — port of paicart-nextjs15 src/app/pages/track-order/page.jsx
   at its mobile breakpoint (< 640px): dark breadcrumb bar, search card,
   not-found card, or the result (order details, shipment journey, "Track
   Another Order").

   Data: getOrderOrShipmentRequest(id) — read-only. It tries the id as a doc
   id in ordersApi → shipForMe → bookingRequest, then `trackingNo ==` in the
   same three collections, and returns the first match's data.

   Native additions: paste-from-clipboard while the box is empty, keyboard
   dismissed on search, the timeline rows fading in one after another, and a
   `id` / `orderId` route param (paicart://pages/track-order?id=…) that
   prefills the box and searches straight away.
   ═══════════════════════════════════════════════════════════════════════ */

export default function TrackOrder() {
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { onScroll, isHidden, headerH, setHeaderH, headerStyle } = useHideOnScroll();
  const topPad = insets.top + headerH;

  const paramId = String(route.params?.id ?? route.params?.orderId ?? '').trim();

  /* Uncontrolled input: the text lives in a ref, `hasText` only flips when
     the box goes empty / non-empty (a controlled input that re-renders on
     every keystroke drops characters). Re-keying remounts it with a new
     defaultValue for reset / paste / route prefill. */
  const queryRef = useRef(paramId);
  const [inputKey, setInputKey] = useState(0);
  const [hasText, setHasText] = useState(!!paramId);
  const [focused, setFocused] = useState(false);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchNo, setSearchNo] = useState(0);
  const seqRef = useRef(0);

  const setQuery = (text) => {
    queryRef.current = text;
    setHasText(!!text.trim());
    setInputKey((k) => k + 1);
  };

  const runSearch = useCallback(async (raw) => {
    const q = String(raw || '').trim();
    if (!q) return;
    Keyboard.dismiss();
    const seq = ++seqRef.current;
    setLoading(true);
    setSearched(true);
    setResult(null);
    try {
      const data = await getOrderOrShipmentRequest(q);
      if (seq !== seqRef.current) return;
      setResult(data || null);
    } catch {
      if (seq !== seqRef.current) return;
      toast.error('Error fetching tracking info. Please try again.');
      setResult(null);
    } finally {
      if (seq === seqRef.current) {
        setLoading(false);
        setSearchNo((n) => n + 1);
      }
    }
  }, []);

  /* Route param: prefill and search, again whenever a new id arrives. */
  useEffect(() => {
    if (!paramId) return;
    queryRef.current = paramId;
    setHasText(true);
    setInputKey((k) => k + 1);
    runSearch(paramId);
  }, [paramId, runSearch]);

  const handleSearch = () => {
    if (loading) return;
    runSearch(queryRef.current);
  };

  const handleReset = () => {
    seqRef.current += 1;
    setResult(null);
    setSearched(false);
    setLoading(false);
    setQuery('');
  };

  const handlePaste = async () => {
    try {
      const text = (await Clipboard.getString())?.trim();
      if (text) setQuery(text);
      else toast.info('Clipboard is empty');
    } catch {
      /* clipboard unavailable — nothing to paste */
    }
  };

  const score = Number(result?.shipmentStatusScore ?? 0) || 0;
  const canSubmit = !loading && hasText;

  /* ── order-info fields, two per row (grid grid-cols-2 gap-4) ── */
  const fields = [];
  if (result) {
    if (result.orderId || result.bookingId) {
      fields.push({ Icon: Hash, label: 'Order ID', value: result.orderId || result.bookingId, color: '#e62222' });
    }
    if (result.trackingNo) fields.push({ Icon: Package, label: 'Tracking No', value: result.trackingNo, color: '#3b82f6' });
    if (result.displayName) fields.push({ Icon: User, label: 'Customer', value: result.displayName, color: '#8b5cf6' });
    if (result.orderTotal) fields.push({ Icon: CreditCard, label: 'Total', value: `৳${result.orderTotal}`, color: '#10b981' });
  }
  const fieldRows = [];
  for (let i = 0; i < fields.length; i += 2) fieldRows.push(fields.slice(i, i + 2));
  const paid = result?.paymentStatus === 'paid';

  return (
    <View style={{ flex: 1, backgroundColor: C.gray50 }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingTop: topPad, flexGrow: 1 }}
      >
        {/* Breadcrumb bar */}
        <View
          style={{
            backgroundColor: '#1C1C1C',
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Press onPress={goHome} hitSlop={8}>
              {({ pressed }) => (
                <Text style={[tpx(13), { fontWeight: '500', color: pressed ? '#ffffff' : C.gray400 }]}>Home</Text>
              )}
            </Press>
            <Text style={[tpx(13), { color: C.gray600 }]}>/</Text>
            <Text style={[tpx(13), { fontWeight: '600', color: '#ffffff' }]}>Track Order</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Package size={12} color={C.gray400} />
            <Text style={[TS.xs, { fontWeight: '500', color: C.gray400 }]}>Paicart Tracking</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 32, paddingBottom: 48 }}>
          {/* Search card */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: C.red50,
              boxShadow: SHADOW_LG,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <Text
              style={[
                tpx(11),
                { fontWeight: '600', color: C.gray400, textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 12 },
              ]}
            >
              Enter your tracking ID
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <TextInput
                  key={inputKey}
                  defaultValue={queryRef.current}
                  onChangeText={(v) => {
                    queryRef.current = v;
                    setHasText(!!v.trim());
                  }}
                  onSubmitEditing={handleSearch}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                  /* Shorter than the web's "Order ID or Tracking Number", which a
                     phone-width field (next to the Track button) cut off. */
                  placeholder="Order / Tracking ID"
                  placeholderTextColor="rgba(30,41,59,0.5)"
                  style={{
                    height: 46,
                    borderWidth: 1,
                    borderRadius: 12,
                    borderColor: focused ? 'transparent' : C.gray200,
                    backgroundColor: focused ? '#ffffff' : C.gray50,
                    boxShadow: focused ? `0 0 0 2px ${TC.red400}` : undefined,
                    paddingLeft: 40,
                    /* room for the paste button (32 wide at right: 4) while it shows */
                    paddingRight: !hasText && !loading ? 44 : 16,
                    paddingVertical: 0,
                    fontSize: 14,
                    color: BODY,
                    includeFontPadding: false,
                    textAlignVertical: 'center',
                  }}
                />
                <View
                  pointerEvents="none"
                  style={{ position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center' }}
                >
                  {loading ? <SpinIcon size={16} color={TC.red400} /> : <Search size={16} color={C.gray400} />}
                </View>
                {!hasText && !loading && (
                  <Animated.View entering={FadeIn.duration(150)} style={{ position: 'absolute', right: 4, top: 7 }}>
                    <Press
                      onPress={handlePaste}
                      accessibilityLabel="Paste tracking ID"
                      hitSlop={4}
                      style={({ pressed }) => ({
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: pressed ? C.gray100 : 'transparent',
                      })}
                    >
                      <ClipboardPaste size={15} color={C.gray400} />
                    </Press>
                  </Animated.View>
                )}
              </View>
              <Press
                onPress={handleSearch}
                disabled={!canSubmit}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 24,
                  borderRadius: 12,
                  backgroundColor: pressed && canSubmit ? '#E05900' : ORANGE,
                  opacity: canSubmit ? 1 : 0.5,
                })}
              >
                {loading ? <SpinIcon size={14} color="#ffffff" /> : <Search size={14} color="#ffffff" />}
                <Text style={[TS.sm, { fontWeight: '700', color: '#ffffff' }]}>{loading ? 'Tracking…' : 'Track'}</Text>
              </Press>
            </View>
            <Text style={[tpx(11), { color: C.gray400, marginTop: 10 }]}>
              Try your Order ID (e.g. ORD-12345) or shipment tracking number
            </Text>
          </View>

          {/* Not found */}
          {searched && !loading && !result && (
            <Animated.View key={`nf-${searchNo}`} entering={FadeIn.duration(450)} style={[CARD, { padding: 40, alignItems: 'center' }]}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  marginBottom: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#fdeaea',
                }}
              >
                <Package size={28} color={TC.red300} />
              </View>
              <Text style={[TS.lg, { fontWeight: '700', color: C.gray800, marginBottom: 4, textAlign: 'center' }]}>
                Order Not Found
              </Text>
              <Text style={{ fontSize: 14, lineHeight: 22.75, color: C.gray400, textAlign: 'center' }}>
                {'No order found with this ID.\nPlease double-check and try again.'}
              </Text>
              <Press
                onPress={handleReset}
                style={({ pressed }) => ({
                  marginTop: 20,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: ORANGE,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={[TS.sm, { fontWeight: '600', color: '#ffffff' }]}>Try Another ID</Text>
              </Press>
            </Animated.View>
          )}

          {/* Result */}
          {result && !loading && (
            <Animated.View key={`r-${searchNo}`} entering={FadeIn.duration(450)} style={{ gap: 20 }}>
              {/* Order info card */}
              <View style={[CARD, { overflow: 'hidden' }]}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    backgroundColor: ORANGE,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Package size={16} color="rgba(255,255,255,0.8)" />
                    <Text style={[tpx(15), { fontWeight: '700', color: '#ffffff' }]}>Order Details</Text>
                  </View>
                  <Press
                    onPress={handleReset}
                    accessibilityLabel="Close"
                    hitSlop={8}
                    style={({ pressed }) => ({
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: pressed ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
                    })}
                  >
                    <X size={14} color="#ffffff" />
                  </Press>
                </View>

                <View style={{ padding: 20, gap: 16 }}>
                  {fieldRows.map((row, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 16 }}>
                      {row.map((f) => (
                        <InfoField key={f.label} Icon={f.Icon} label={f.label} value={String(f.value)} color={f.color} />
                      ))}
                      {row.length === 1 && <View style={{ flex: 1 }} />}
                    </View>
                  ))}
                </View>

                {!!result.paymentStatus && (
                  <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: paid ? TC.emerald100 : TC.amber100,
                      }}
                    >
                      <CreditCard size={11} color={paid ? TC.emerald700 : TC.amber700} />
                      <Text style={[TS.xs, { fontWeight: '700', color: paid ? TC.emerald700 : TC.amber700 }]}>
                        Payment: {String(result.paymentStatus)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Timeline card */}
              {score > 0 ? <JourneyCard record={result} score={score} /> : <NotShippedCard />}

              {/* Search again */}
              <Press
                onPress={handleReset}
                style={({ pressed }) => ({
                  width: '100%',
                  paddingVertical: 14,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: C.red200,
                  backgroundColor: pressed ? C.red50 : 'transparent',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                })}
              >
                <Search size={14} color={C.red500} />
                <Text style={[TS.sm, { fontWeight: '600', color: C.red500 }]}>Track Another Order</Text>
              </Press>
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
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: '#ffffff', zIndex: 11 }}
      />
    </View>
  );
}
