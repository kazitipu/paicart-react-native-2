import React, { memo, useEffect } from 'react';
import { View, Text, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming, Easing, FadeIn } from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import { applyDiscount } from '@/lib/discount';
import { Press as Pressable, Price, Stars, ScalePress, Chip, t, C, ORANGE, ORANGE2, SHADOW } from './ui';

const { width: SCREEN_W } = Dimensions.get('window');
/* px-2 page gutter, p-4 card padding, 1px border each side */
const INNER_W = SCREEN_W - 16 - 32 - 2;

function ScoreBar({ label, score, display, delay }) {
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withDelay(delay, withTiming(score > 0 ? Math.min(100, (score / 5) * 100) : 0, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [score, delay, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={{ width: (INNER_W - 6) / 2, backgroundColor: C.gray50, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={[t('9'), { fontWeight: '500', color: C.gray500 }]}>{label}</Text>
        <Text style={[t('10'), { fontWeight: '700', color: C.amber600 }]}>{display}</Text>
      </View>
      <View style={{ height: 4, backgroundColor: C.gray200, borderRadius: 2, overflow: 'hidden' }}>
        <Animated.View style={[{ height: '100%', backgroundColor: '#FABC16', borderRadius: 2 }, fill]} />
      </View>
    </View>
  );
}

export function SellerStatusBadges({ statuses }) {
  if (!statuses.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 4, flexShrink: 0 }}>
      {statuses.map(({ id, label, Icon, color, bg, border }) => (
        <Chip key={id} Icon={Icon} label={label} tone={{ fg: color, bg, border }} size={9} iconSize={9} gap={2} />
      ))}
    </View>
  );
}

/* ════════ Seller — mobile copy (second to last, above the tabs) ════════ */
function SellerCard({ product, sellerStatuses, vendorProducts, taka, discountPct, currentId, onOpenStore, onOpenProduct }) {
  const shopName = product.shop_name || product.shopName;
  const shopRating = parseFloat(product.shop_rating) || 0;
  const scores = [
    { label: 'Product', score: parseFloat(product.supScore?.productScore || product.productCompositeScore || 0) },
    { label: 'Level', score: parseFloat(product.supScore?.levelScore || product.sellerLevel || 0) },
    { label: 'Service', score: parseFloat(product.supScore?.serviceScore || product.shopServiceScore || 0) },
    { label: 'Delivery', score: parseFloat(product.supScore?.deliveryScore || product.shopDeliveryScore || 0) },
  ];
  const hasSubRatings = scores.some((s) => s.score > 0);
  const bars = hasSubRatings
    ? scores.map((s) => ({ ...s, display: s.score > 0 ? s.score.toFixed(1) : '–' }))
    : shopRating > 0
      ? scores.map((s) => ({ label: s.label, score: shopRating, display: shopRating.toFixed(1) }))
      : [];

  /* "More from seller" fills whole rows: 8 across 4 columns when the seller
     has that many, otherwise 6 across 3. */
  const hasEight = vendorProducts.length >= 8;
  const list = vendorProducts.slice(0, hasEight ? 8 : 6);
  const cols = hasEight ? 4 : 3;
  const tileW = (INNER_W - 6 * (cols - 1)) / cols;

  return (
    <View
      style={{
        marginTop: 16,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: C.gray100,
        boxShadow: SHADOW.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', boxShadow: SHADOW.sm }}>
          <Text style={[t('base'), { color: '#ffffff', fontWeight: '700' }]}>{(shopName || 'S')[0].toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[t('xs'), { fontWeight: '700', color: C.gray800 }]} numberOfLines={1}>
            {shopName || 'Verified Supplier'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Stars rating={shopRating} size={9} />
            {shopRating > 0 && <Text style={[t('10'), { color: C.gray500 }]}>{shopRating.toFixed(1)}</Text>}
          </View>
        </View>
        <SellerStatusBadges statuses={sellerStatuses} />
      </View>

      {bars.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {bars.map((b, i) => (
            <ScoreBar key={b.label} label={b.label} score={b.score} display={b.display} delay={i * 80} />
          ))}
        </View>
      )}

      <Pressable
        onPress={onOpenStore}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          backgroundColor: pressed ? C.orange100 : C.orange50,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: C.orange100,
        })}
      >
        <Text style={[t('xs'), { fontWeight: '600', color: ORANGE2 }]}>View Store</Text>
        <ChevronRight size={12} color={ORANGE2} />
      </Pressable>

      {vendorProducts.length > 0 && (
        <Animated.View entering={FadeIn.duration(250)} style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.gray100 }}>
          <Text style={[t('9'), { fontWeight: '700', color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }]}>
            More from seller
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {list.map((p, i) => {
              const priceBdt = p.salePrice || p.price ? Math.round(parseFloat(p.salePrice || p.price) * taka) : 0;
              const same = String(p.id) === String(currentId);
              return (
                <View key={i} style={{ width: tileW }}>
                  <ScalePress
                    onPress={() => onOpenProduct(p)}
                    scaleTo={0.96}
                    style={{
                      width: tileW,
                      height: tileW,
                      borderRadius: 8,
                      overflow: 'hidden',
                      backgroundColor: C.gray100,
                      borderWidth: 2,
                      borderColor: same ? ORANGE2 : 'transparent',
                    }}
                  >
                    {p.pictures?.[0] ? (
                      <ProductImage uri={p.pictures[0]} thumb style={{ width: '100%', height: '100%' }} fallbackIconSize={16} />
                    ) : (
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 18, color: C.gray300 }}>📦</Text>
                      </View>
                    )}
                  </ScalePress>
                  {priceBdt > 0 && (
                    <Price
                      amount={Math.round(applyDiscount(priceBdt, discountPct))}
                      original={priceBdt}
                      containerStyle={{ marginTop: 2 }}
                      style={[t('9'), { fontWeight: '700', color: ORANGE2 }]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

export default memo(SellerCard);
