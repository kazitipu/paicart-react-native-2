import React, { useRef, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Heart, Star, BadgeCheck, Factory, Crown, Award } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import PriceTag from '@/components/PriceTag';
import { addToWishlist, removeFromWishlist } from '@/store/actions';
import { flyToIconFromRef } from '@/lib/flyToIcon';
import { getActiveDiscountPercent, applyDiscount } from '@/lib/discount';
import colors from '@/theme/colors';

/* 1688 seller-identity tags → one badge. Priority, highest wins — only ever
   one badge per card: super_factory > powerful_merchants > tp_member. */
const SELLER_IDENTITY_PRIORITY = ['super_factory', 'powerful_merchants', 'tp_member'];

function getBadge(product) {
  const ids = product.sellerIdentities || [];
  const tpYear = parseInt(product.tpYear, 10) || 0;
  const yearSuffix = tpYear > 0 ? ` · ${tpYear} yrs` : '';

  const topId = SELLER_IDENTITY_PRIORITY.find((id) => ids.includes(id));
  if (!topId) return null;
  if (topId === 'super_factory')
    return { label: 'Direct Factory', Icon: Factory, color: colors.primary };
  if (topId === 'powerful_merchants')
    return { label: `Top Rated${yearSuffix}`, Icon: Crown, color: colors.invoiceBad };
  return { label: `Verified${yearSuffix}`, Icon: BadgeCheck, color: colors.invoiceOk };
}

/* The product tile shared by Home, Collection and search results. On the web
   this was redeclared in three files, which is why the wishlist heart behaved
   slightly differently on each. */
function ProductCard({ product, taka, width }) {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const cardRef = useRef(null);

  const currentUser = useSelector((s) => s.user?.currentUser);
  const wishlistItems = useSelector((s) => s.wishlist?.wishlist || []);
  const siteDiscount = useSelector((s) => s.orders?.siteDiscount);

  const isWishlisted = wishlistItems.some((w) => w.id === product.id);
  const discountPct = getActiveDiscountPercent(siteDiscount);

  const image = product.pictures?.[0];
  const price =
    taka && product.salePrice
      ? Math.round(parseFloat(product.salePrice) * parseFloat(taka))
      : null;
  const discountedPrice = price !== null ? Math.round(applyDiscount(price, discountPct)) : null;

  const badge = getBadge(product);
  const rating = parseFloat(product.rating) || 0;
  const sold = parseInt(product.totalSold, 10) || 0;
  const soldStr = sold >= 1000 ? `${(sold / 1000).toFixed(1)}k` : sold > 0 ? String(sold) : null;

  const handleWishlist = useCallback(() => {
    if (!currentUser?.id && !currentUser?.email) {
      navigation.navigate('Login');
      return;
    }
    if (isWishlisted) {
      dispatch(removeFromWishlist(product.id));
    } else {
      dispatch(addToWishlist({ ...product, source: 'taobao' }));
      flyToIconFromRef(image, cardRef, 'wishlist');
    }
  }, [currentUser, isWishlisted, dispatch, product, image, navigation]);

  const open = () => navigation.navigate('Product', { id: product.id });

  return (
    <Pressable
      ref={cardRef}
      onPress={open}
      style={width ? { width } : undefined}
      className="bg-white rounded-xl overflow-hidden border border-gray-100 active:opacity-90"
    >
      <View className="relative bg-gray-50 aspect-square w-full">
        <ProductImage uri={image} thumb className="w-full h-full" fallbackIconSize={28} />

        <View className="absolute top-2 left-2 flex-row gap-1">
          {product.sale ? (
            <View className="bg-brand rounded-full px-2 py-0.5">
              <Text className="text-white text-xxs font-extrabold">SALE</Text>
            </View>
          ) : product.new ? (
            <View className="bg-emerald-500 rounded-full px-2 py-0.5">
              <Text className="text-white text-xxs font-extrabold">NEW</Text>
            </View>
          ) : null}
        </View>

        <Pressable
          onPress={handleWishlist}
          hitSlop={8}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 items-center justify-center"
        >
          <Heart
            size={14}
            color={isWishlisted ? colors.brand : colors.muted}
            fill={isWishlisted ? colors.brand : 'transparent'}
          />
        </Pressable>
      </View>

      <View className="p-2.5 gap-1.5">
        <Text className="text-tiny text-gray-800 font-medium leading-snug" numberOfLines={2}>
          {product.name}
        </Text>

        {price !== null && (
          <PriceTag
            amount={discountedPrice}
            original={discountPct > 0 ? price : null}
            className="text-md font-extrabold text-brand"
            originalClassName="text-2xs"
          />
        )}

        {badge && (
          <View
            className="flex-row items-center gap-0.5 rounded px-1.5 py-0.5 self-start"
            style={{ backgroundColor: badge.color }}
          >
            <badge.Icon size={8} color="#ffffff" />
            <Text className="text-white text-xxs font-bold">{badge.label}</Text>
          </View>
        )}

        {(rating > 0 || soldStr) && (
          <View className="flex-row items-center gap-2">
            {rating > 0 && (
              <View className="flex-row items-center gap-0.5">
                <Star size={9} color="#f59e0b" fill="#f59e0b" />
                <Text className="text-xxs text-gray-500">{rating.toFixed(1)}</Text>
              </View>
            )}
            {soldStr && <Text className="text-xxs text-gray-400">{soldStr} sold</Text>}
          </View>
        )}
      </View>
    </Pressable>
  );
}

/* Grids re-render on every cart/wishlist tick; the tiles themselves rarely
   change. */
export default React.memo(ProductCard);
