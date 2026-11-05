import React, { memo, useRef } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { X, AlertCircle, ShoppingCart, ShoppingBag } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import VariantSelector from './VariantSelector';
import PriceTierRow from './PriceTierRow';
import { Press as Pressable, Overlay, Price, Spinner, ScalePress, t, C, ORANGE, ORANGE2, SHADOW, fmt } from './ui';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/* ════════════ MOBILE BOTTOM DRAWER ════════════
   Variant/quantity picking, a price breakdown and the two real actions. The
   intent comes from the button pressed (web handleDrawerConfirm). */
function ProductDrawer({
  visible,
  onClose,
  pics,
  priceRange,
  taka,
  discountPct,
  activePriceTier,
  priceFor,
  selectedColor,
  allSizes,
  hasVariants,
  discountedBasePrice,
  basePrice,
  variantProps,
  warning,
  totalQty,
  discountedTotalPrice,
  totalPrice,
  shipLoading,
  shipping,
  chinaLocalNum,
  belowMoq,
  moq,
  moqShortfall,
  cartLoading,
  shipChargePending,
  onConfirm,
}) {
  const insets = useSafeAreaInsets();
  const cartBtnRef = useRef(null);

  const headerPrice = () => {
    if (priceRange.length > 0) {
      return <PriceTierRow priceRange={priceRange} taka={taka} discountPct={discountPct} activePriceTier={activePriceTier} bare />;
    }
    /* Follow the selected colour's price; with a size dimension too it's still
       the cheapest size of that colour, so "from". */
    const sel = selectedColor ? priceFor(selectedColor.properties) : null;
    const exact = sel && allSizes.length === 0;
    return (
      <View>
        <Price
          amount={sel ? sel.amount : discountedBasePrice}
          original={sel ? sel.original : basePrice}
          style={[t('lg', 'none'), { color: ORANGE, fontWeight: '800' }]}
        />
        <Text style={[t('9'), { color: C.gray400, marginTop: 4 }]}>{hasVariants && !exact ? 'from · per pc' : 'per pc'}</Text>
      </View>
    );
  };

  const courier = shipLoading ? (
    <Spinner size={13} color={C.gray400} />
  ) : (
    <Text style={[t('sm'), { fontWeight: '700', color: shipping === 'free' && totalQty > 0 ? C.emerald600 : C.gray900 }]}>
      {totalQty === 0
        ? '৳0'
        : shipping === 'free'
          ? 'Free'
          : shipping === 'later' || shipping === null
            ? '—'
            : `৳${chinaLocalNum.toLocaleString()}`}
    </Text>
  );

  return (
    <Overlay visible={visible} onClose={onClose} zIndex={50}>
      <View
        style={{
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: SCREEN_H * 0.88,
          boxShadow: SHADOW['2xl'],
        }}
      >
        {/* Drag handle */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.gray300 }} />
        </View>

        {/* Header: thumbnail + the numbers being decided on */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.gray100 }}>
          {!!pics[0] && (
            <ProductImage uri={pics[0]} thumb style={{ width: 56, height: 56, borderRadius: 16, borderWidth: 1, borderColor: C.gray200 }} />
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, minWidth: 0 }} contentContainerStyle={{ alignItems: 'center' }}>
            {headerPrice()}
          </ScrollView>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Close"
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? C.gray200 : C.gray100,
            })}
          >
            <X size={16} color={C.gray600} />
          </Pressable>
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={{ flexGrow: 0, flexShrink: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 20 }}
          keyboardShouldPersistTaps="handled"
          overScrollMode="never"
        >
          <VariantSelector {...variantProps} width={SCREEN_W - 40} />

          {!!warning && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: C.amber50,
                borderWidth: 2,
                borderColor: C.amber200,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <AlertCircle size={15} color={C.amber500} />
              <Text style={[t('sm'), { flex: 1, color: C.amber700, fontWeight: '500' }]}>{warning}</Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* Footer CTA */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(32, insets.bottom + 12), borderTopWidth: 1, borderTopColor: C.gray100 }}>
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={[t('sm'), { color: C.gray500 }]}>Product Price ({totalQty} pcs)</Text>
              <Price amount={discountedTotalPrice} original={totalPrice} style={[t('sm'), { fontWeight: '700', color: C.gray900 }]} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={[t('sm'), { color: C.gray500 }]}>China Courier</Text>
              {courier}
            </View>
            <View style={{ borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.gray300, marginVertical: 8 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[t('base'), { fontWeight: '800', color: C.gray900 }]}>Pay Now</Text>
              <Text style={[t('lg'), { fontWeight: '800', color: ORANGE2 }]}>৳{fmt(discountedTotalPrice + chinaLocalNum)}</Text>
            </View>
          </View>

          {belowMoq && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <AlertCircle size={13} color={C.amber600} />
              <Text style={[t('xs'), { fontWeight: '600', color: C.amber600 }]}>
                Minimum order {moq} pcs — add {moqShortfall} more.
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View ref={cartBtnRef} collapsable={false} style={{ flex: 1 }}>
              <ScalePress
                onPress={() => onConfirm('cart', cartBtnRef)}
                disabled={cartLoading}
                style={{
                  borderWidth: 2,
                  borderColor: ORANGE2,
                  borderRadius: 16,
                  paddingVertical: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: cartLoading ? 0.6 : 1,
                }}
              >
                {cartLoading ? <Spinner size={16} color={ORANGE2} /> : <ShoppingCart size={16} color={ORANGE2} />}
                <Text style={[t('sm'), { fontWeight: '700', color: ORANGE2 }]}>Add to Cart</Text>
              </ScalePress>
            </View>
            <View style={{ flex: 1 }}>
              <ScalePress
                onPress={() => onConfirm('order')}
                disabled={shipChargePending}
                scaleTo={shipChargePending ? 1 : 0.95}
                style={{
                  backgroundColor: ORANGE,
                  borderRadius: 16,
                  paddingVertical: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: shipChargePending ? 0.6 : 1,
                  boxShadow: shipChargePending ? undefined : SHADOW.cta,
                }}
              >
                {shipChargePending ? (
                  <>
                    <Spinner size={16} />
                    <Text style={[t('sm'), { fontWeight: '800', color: '#ffffff' }]}>Calculating…</Text>
                  </>
                ) : (
                  <>
                    <ShoppingBag size={16} color="#ffffff" />
                    <Text style={[t('sm'), { fontWeight: '800', color: '#ffffff' }]}>Place Order</Text>
                  </>
                )}
              </ScalePress>
            </View>
          </View>
        </View>
      </View>
    </Overlay>
  );
}

/* Rendered on every Product render; nothing to update while it stays closed
   (Overlay renders null then). */
export default memo(ProductDrawer, (prev, next) => !prev.visible && !next.visible);
