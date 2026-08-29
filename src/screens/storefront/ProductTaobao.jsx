import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { ArrowLeft, Heart, ShoppingCart, Minus, Plus } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import PriceTag from '@/components/PriceTag';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import { addToCart, addToWishlist, removeFromWishlist, setSearchedProductDetail } from '@/store/actions';
import { getProductDetail } from '@/lib/api';
import { getActiveDiscountPercent, applyDiscount } from '@/lib/discount';
import { getCampaignRateForProduct } from '@/lib/campaignPricing';
import { propVal } from '@/lib/product';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');

/* Taobao product view.
 *
 * ⚠️ The web version rendered PURELY from Redux and fetched nothing, so a
 * direct link or a refresh showed a permanent spinner — only arriving from the
 * search screen worked. This fetches on a cold start instead, which is what
 * makes the /taobao/:id deep link usable. */
export default function ProductTaobao() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { id } = route.params || {};

  const cached = useSelector((s) => s.singleProduct?.product);
  const currentUser = useSelector((s) => s.user?.currentUser);
  const taka = parseFloat(useSelector((s) => s.user?.currency?.taka)) || 18;
  const siteDiscount = useSelector((s) => s.orders?.siteDiscount);
  const campaigns = useSelector((s) => s.orders?.campaigns || []);
  const wishlist = useSelector((s) => s.wishlist?.wishlist || []);

  const seeded = cached?.id === id || cached?.num_iid === id;
  const [product, setProduct] = useState(seeded ? cached : null);
  const [loading, setLoading] = useState(!seeded);
  const [activeImg, setActiveImg] = useState(0);
  const [qtys, setQtys] = useState({});
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (seeded) return;
    let alive = true;
    getProductDetail({ num_iid: id })
      .then((res) => {
        if (!alive) return;
        const p = res.data?.product || res.data?.item || res.data;
        if (p) {
          /* singleProductSlice normalises the Taobao schema onto the 1688 one
             — the only place the two are unified. */
          dispatch(setSearchedProductDetail(p, 'taobao'));
          setProduct(p);
        }
      })
      .catch(() => alive && toast.error('Could not load this product.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, seeded, dispatch]);

  useEffect(() => {
    if (seeded && cached) setProduct(cached);
  }, [seeded, cached]);

  const campaignRate = useMemo(
    () => getCampaignRateForProduct(campaigns, product),
    [campaigns, product],
  );
  const effTaka = campaignRate?.rmbRate > 0 ? campaignRate.rmbRate : taka;
  const discountPct = campaignRate
    ? campaignRate.discountPercent
    : getActiveDiscountPercent(siteDiscount);

  const pics = product?.pictures || [];
  const variants = product?.variants || [];

  const basePrice = Math.round(parseFloat(product?.salePrice || product?.price || 0) * effTaka);
  const discountedBase = Math.round(applyDiscount(basePrice, discountPct));

  const totalQty = Object.values(qtys).reduce((a, q) => a + (parseInt(q, 10) || 0), 0);
  const totalPrice = variants.length
    ? Object.entries(qtys).reduce((sum, [sid, q]) => {
        const v = variants.find((x) => String(x.sku_id ?? x.skuId) === sid);
        const unit = Math.round(parseFloat(v?.price || product?.salePrice || 0) * effTaka);
        return sum + unit * (parseInt(q, 10) || 0);
      }, 0)
    : basePrice * (qtys.__simple || 0);
  const discountedTotal = Math.round(applyDiscount(totalPrice, discountPct));

  const isWishlisted = wishlist.some((w) => w.id === product?.id);

  const bump = (key, delta) =>
    setQtys((prev) => {
      const next = { ...prev };
      const v = Math.max(0, (prev[key] || 0) + delta);
      if (v > 0) next[key] = v;
      else delete next[key];
      return next;
    });

  const handleAddToCart = async () => {
    if (!currentUser?.id && !currentUser?.email) {
      navigation.navigate('Login', { returnTo: 'ProductTaobao' });
      return;
    }
    if (totalQty === 0) {
      toast.error('Please select a quantity first.');
      return;
    }
    setAdding(true);
    try {
      const skus = variants.length
        ? Object.entries(qtys).map(([sid, q]) => {
            const v = variants.find((x) => String(x.sku_id ?? x.skuId) === sid);
            return {
              ...v,
              totalQuantity: parseInt(q, 10),
              price: Math.round(parseFloat(v?.price || product.salePrice || 0) * effTaka),
              image: v?.image || pics[0] || null,
            };
          })
        : [{ totalQuantity: qtys.__simple || 0, price: basePrice, sku_id: Date.now().toString() }];

      await dispatch(
        addToCart(currentUser, {
          shopId: product.shop_id,
          shopName: product.shop_name || product.shopName,
          localShipping: '0',
          /* The rate at purchase time is frozen onto the record. */
          currency: effTaka,
          items: [
            {
              id: product.id,
              name: product.name,
              picture: pics[0],
              detail_url: product.detail_url,
              skus,
              variants: variants.length ? false : [],
              productType: 'Others',
              shipmentMethod: 'Air',
              source: 'taobao',
            },
          ],
        }),
      );
      toast.success('Added to cart');
    } catch {
      toast.error('Failed to add to cart. Please try again.');
    }
    setAdding(false);
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <EmptyState
          title="Product not found"
          subtitle="This Taobao listing is no longer available."
          actionLabel="Back"
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2 bg-white border-b border-gray-100">
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
          <ArrowLeft size={22} color={colors.foreground} />
        </Pressable>
        <Text className="flex-1 text-smd font-bold text-foreground" numberOfLines={1}>
          {product.name}
        </Text>
        <Pressable
          onPress={() =>
            isWishlisted
              ? dispatch(removeFromWishlist(product.id))
              : dispatch(addToWishlist({ ...product, source: 'taobao' }))
          }
          hitSlop={8}
          className="p-1"
        >
          <Heart
            size={20}
            color={isWishlisted ? colors.brand : colors.muted}
            fill={isWishlisted ? colors.brand : 'transparent'}
          />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="pb-32">
        <FlatList
          horizontal
          pagingEnabled
          data={pics.length ? pics : [null]}
          keyExtractor={(_, i) => `pic-${i}`}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) =>
            setActiveImg(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
          }
          renderItem={({ item }) => (
            <ProductImage
              uri={item}
              className="bg-white"
              style={{ width: SCREEN_W, height: SCREEN_W }}
              resizeMode="contain"
              fallbackIconSize={40}
            />
          )}
        />
        {pics.length > 1 && (
          <View className="absolute top-[92%] right-3 bg-black/50 rounded-full px-2.5 py-1">
            <Text className="text-white text-2xs font-semibold">
              {activeImg + 1}/{pics.length}
            </Text>
          </View>
        )}

        <View className="bg-white px-3 py-3">
          <PriceTag
            amount={discountedBase}
            original={discountPct > 0 ? basePrice : null}
            className="text-xl font-extrabold text-brand"
            originalClassName="text-smd"
          />
          <Text className="text-smd text-foreground mt-2 leading-snug">{product.name}</Text>
        </View>

        <View className="bg-white mt-2 px-3 py-3">
          <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
            {variants.length ? `Options · ${variants.length}` : 'Quantity'}
          </Text>

          {variants.length ? (
            variants.map((v) => {
              const sid = String(v.sku_id ?? v.skuId);
              const q = qtys[sid] || 0;
              const label = [v.color, v.size, v.properties_name && propVal(v.properties_name)]
                .filter(Boolean)
                .join(' / ');
              const unit = Math.round(parseFloat(v.price || product.salePrice || 0) * effTaka);
              return (
                <View
                  key={sid}
                  className="flex-row items-center justify-between py-2 border-b border-gray-100"
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-smd text-foreground" numberOfLines={1}>
                      {label || 'Default'}
                    </Text>
                    <Text className="text-2xs text-brand font-bold">
                      ৳{unit.toLocaleString()}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      onPress={() => bump(sid, -1)}
                      hitSlop={6}
                      className="w-7 h-7 rounded-full border border-gray-300 items-center justify-center"
                    >
                      <Minus size={12} color={colors.muted} />
                    </Pressable>
                    <Text className="text-smd font-bold text-foreground w-6 text-center">{q}</Text>
                    <Pressable
                      onPress={() => bump(sid, 1)}
                      hitSlop={6}
                      className="w-7 h-7 rounded-full border border-gray-300 items-center justify-center"
                    >
                      <Plus size={12} color={colors.muted} />
                    </Pressable>
                  </View>
                </View>
              );
            })
          ) : (
            <View className="flex-row items-center justify-end gap-3">
              <Pressable
                onPress={() => bump('__simple', -1)}
                className="w-8 h-8 rounded-full border border-gray-300 items-center justify-center"
              >
                <Minus size={13} color={colors.muted} />
              </Pressable>
              <Text className="text-md font-bold text-foreground w-8 text-center">
                {qtys.__simple || 0}
              </Text>
              <Pressable
                onPress={() => bump('__simple', 1)}
                className="w-8 h-8 rounded-full border border-gray-300 items-center justify-center"
              >
                <Plus size={13} color={colors.muted} />
              </Pressable>
            </View>
          )}
        </View>

        {(product.specs || []).length > 0 && (
          <View className="bg-white mt-2 px-3 py-3">
            <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
              Specifications
            </Text>
            {product.specs.map((s, i) => (
              <View key={i} className="flex-row py-1.5 border-b border-gray-50">
                <Text className="text-smd text-gray-500 w-1/3">{s.name}</Text>
                <Text className="text-smd text-foreground flex-1">{s.value}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-3 pt-2.5 pb-6">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xs text-gray-500">{totalQty} pcs</Text>
          <PriceTag
            amount={discountedTotal}
            original={discountPct > 0 ? totalPrice : null}
            className="text-md font-extrabold text-brand"
            originalClassName="text-2xs"
          />
        </View>
        <Button
          title="Add to Cart"
          loading={adding}
          onPress={handleAddToCart}
          icon={<ShoppingCart size={15} color="#ffffff" />}
        />
      </View>
    </SafeAreaView>
  );
}
