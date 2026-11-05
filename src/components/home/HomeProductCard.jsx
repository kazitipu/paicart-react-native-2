import React, { useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Heart, Star, BadgeCheck, Factory, Crown, Award, Flame, Package } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import PriceTag from '@/components/PriceTag';
import { Skeleton } from '@/components/ui/Skeleton';
import { addToWishlist, removeFromWishlist } from '@/store/actions';
import { flyToIconFromRef } from '@/lib/flyToIcon';
import { getActiveDiscountPercent, applyDiscount } from '@/lib/discount';

const RED = '#e62222';

/* 1688 seller-identity tags → one badge (web page.jsx getBadges).
   Priority, highest wins: super_factory > powerful_merchants > tp_member. */
const SELLER_IDENTITY_PRIORITY = ['super_factory', 'powerful_merchants', 'tp_member'];
const BADGE_ICONS = { star: Star, flame: Flame, verified: BadgeCheck, factory: Factory, badge: Award, crown: Crown };

function getBadges(product) {
  const ids = product.sellerIdentities || [];
  const tpYear = parseInt(product.tpYear, 10) || 0;
  const yearSuffix = tpYear > 0 ? ` · ${tpYear} yrs` : '';
  const topId = SELLER_IDENTITY_PRIORITY.find((id) => ids.includes(id));
  if (!topId) return [];
  if (topId === 'super_factory') return [{ label: 'Direct Factory', icon: 'factory', color: '#FF6A00' }];
  if (topId === 'powerful_merchants') return [{ label: `Top Rated${yearSuffix}`, icon: 'crown', color: '#F5222D' }];
  return [{ label: `Verified${yearSuffix}`, icon: 'verified', color: '#00B42A' }];
}

/* Web homepage ProductCardSkeleton. */
export function HomeProductCardSkeleton() {
  return (
    <View className="flex-1 bg-white rounded-xl overflow-hidden border border-gray-100">
      <Skeleton className="w-full aspect-square rounded-none bg-gray-100" />
      <View className="p-3" style={{ gap: 10 }}>
        <Skeleton className="h-2.5 rounded-full w-full bg-gray-100" />
        <Skeleton className="h-2.5 rounded-full w-2/3 bg-gray-100" />
        <Skeleton className="h-5 rounded-lg w-1/2 mt-1 bg-gray-100" />
        <Skeleton className="h-2.5 rounded-full w-1/2 bg-gray-100" />
        <Skeleton className="h-2.5 rounded-full w-1/3 bg-gray-100" />
      </View>
    </View>
  );
}

/* The homepage product tile, a 1:1 port of web page.jsx ProductCard at its
 * mobile size. Hover-only effects (zoom, "VIEW PRODUCT" strip) have no touch
 * equivalent; they are replaced by a press-down scale. The heart pops when a
 * product is wishlisted, and the thumbnail flies to the header heart. */
function HomeProductCard({ product, taka }) {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const imageRef = useRef(null);

  const currentUser = useSelector((s) => s.user?.currentUser);
  const isWishlisted = useSelector((s) => (s.wishlist?.wishlist || []).some((w) => w.id === product.id));
  const discountPct = getActiveDiscountPercent(useSelector((s) => s.orders?.siteDiscount));

  const image = product.pictures?.[0];
  const price = taka && product.salePrice ? Math.round(parseFloat(product.salePrice) * parseFloat(taka)) : null;
  const discountedPrice = price !== null ? Math.round(applyDiscount(price, discountPct)) : null;
  const badges = getBadges(product);
  const rating = parseFloat(product.rating) || 0;
  const sold = parseInt(product.totalSold, 10) || 0;
  const moq = parseInt(product.batch, 10) || parseInt(product.moq, 10) || 0;
  const soldStr = sold >= 1000 ? `${(sold / 1000).toFixed(1)}k` : sold > 0 ? String(sold) : null;

  const press = useSharedValue(1);
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const heart = useSharedValue(1);
  const heartStyle = useAnimatedStyle(() => ({ transform: [{ scale: heart.value }] }));

  const prevWish = useRef(isWishlisted);
  useEffect(() => {
    if (isWishlisted && !prevWish.current) {
      heart.value = withSequence(
        withTiming(1.3, { duration: 120, easing: Easing.out(Easing.ease) }),
        withSpring(1, { damping: 6, stiffness: 220 }),
      );
    }
    prevWish.current = isWishlisted;
  }, [isWishlisted, heart]);

  const handleWishlist = useCallback(() => {
    if (!currentUser?.id && !currentUser?.email) {
      navigation.navigate('Login');
      return;
    }
    if (isWishlisted) {
      dispatch(removeFromWishlist(product.id));
    } else {
      dispatch(addToWishlist({ ...product, source: 'taobao' }));
      flyToIconFromRef(image, imageRef, 'wishlist');
    }
  }, [currentUser, isWishlisted, dispatch, product, image, navigation]);

  return (
    <Animated.View style={[{ flex: 1 }, cardStyle]}>
      <Pressable
        onPress={() => navigation.navigate('Product', { id: product.id })}
        onPressIn={() => {
          press.value = withTiming(0.97, { duration: 100 });
        }}
        onPressOut={() => {
          press.value = withSpring(1, { damping: 12, stiffness: 260 });
        }}
        className="flex-grow bg-white rounded-xl overflow-hidden border border-gray-100"
      >
        {/* Image */}
        <View ref={imageRef} collapsable={false} className="relative bg-gray-50 aspect-square w-full">
          <ProductImage uri={image} thumb className="absolute inset-0 w-full h-full" fallbackIconSize={28} />

          <View className="absolute top-2 left-2" style={{ gap: 4 }}>
            {product.sale ? (
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: RED, boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
                <Text className="text-white font-extrabold" style={{ fontSize: 10, lineHeight: 12 }}>SALE</Text>
              </View>
            ) : product.new ? (
              <View className="bg-emerald-500 rounded-full px-2 py-0.5" style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1)' }}>
                <Text className="text-white font-extrabold" style={{ fontSize: 10, lineHeight: 12 }}>NEW</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Body */}
        <View className="p-2.5 flex-grow" style={{ gap: 6 }}>
          <Text
            className="text-gray-800 font-medium"
            style={{ fontSize: 12, lineHeight: 16.8, minHeight: 30 }}
            numberOfLines={2}
          >
            {product.name}
          </Text>

          <View className="flex-row items-baseline">
            {price !== null ? (
              <PriceTag
                amount={discountedPrice}
                original={price}
                className="text-[15px] font-extrabold text-[#e62222] tracking-tight"
                originalClassName="text-[12.75px]"
              />
            ) : (
              <Text className="text-gray-300" style={{ fontSize: 13 }}>—</Text>
            )}
          </View>

          {(rating > 0 || soldStr) && (
            <View className="flex-row items-center overflow-hidden" style={{ gap: 6 }}>
              {rating > 0 && (
                <View className="flex-row items-center" style={{ gap: 2 }}>
                  <Star size={9} color="#fbbf24" fill="#fbbf24" />
                  <Text className="text-gray-500 font-semibold" style={{ fontSize: 10, lineHeight: 11 }}>
                    {rating.toFixed(1)}
                  </Text>
                </View>
              )}
              {rating > 0 && soldStr && (
                <Text className="text-gray-200" style={{ fontSize: 10, lineHeight: 11 }}>·</Text>
              )}
              {soldStr && (
                <Text className="text-gray-400" style={{ fontSize: 10, lineHeight: 11 }} numberOfLines={1}>
                  {soldStr} sold
                </Text>
              )}
            </View>
          )}

          <View className="flex-grow" />

          {moq > 1 && (
            <View className="flex-row items-center self-start bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5" style={{ gap: 4 }}>
              <Package size={9} color="#f59e0b" />
              <Text className="text-amber-600 font-semibold" style={{ fontSize: 10, lineHeight: 11 }}>
                Min. {moq}
              </Text>
            </View>
          )}

          {badges.length > 0 && (
            <View className="flex-row flex-wrap" style={{ gap: 4 }}>
              {badges.map((b) => {
                const Icon = BADGE_ICONS[b.icon] || Award;
                return (
                  <View
                    key={b.label}
                    className="flex-row items-center rounded px-1.5 py-0.5"
                    style={{ backgroundColor: b.color, gap: 2 }}
                  >
                    <Icon size={8} color="#ffffff" />
                    <Text className="text-white font-bold" style={{ fontSize: 10, lineHeight: 11 }}>
                      {b.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </Pressable>

      {/* Wishlist toggle — a sibling of the card press target, as on the web */}
      <Pressable
        onPress={handleWishlist}
        hitSlop={8}
        className="absolute top-2 right-2 w-7 h-7 rounded-full items-center justify-center"
        style={{
          backgroundColor: isWishlisted ? RED : 'rgba(255,255,255,0.9)',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
        }}
      >
        <Animated.View style={heartStyle}>
          <Heart
            size={13}
            color={isWishlisted ? '#ffffff' : '#9ca3af'}
            fill={isWishlisted ? '#ffffff' : 'transparent'}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(HomeProductCard);
