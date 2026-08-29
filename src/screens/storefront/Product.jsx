import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, ScrollView, ActivityIndicator, Dimensions, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { WebView } from 'react-native-webview';
import {
  ArrowLeft, Heart, Share2, Truck, Star, ShoppingCart, ChevronRight, AlertTriangle,
} from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import PriceTag from '@/components/PriceTag';
import Button from '@/components/ui/Button';
import VariantSelector from '@/components/product/VariantSelector';
import ShippingRateModal from '@/components/product/ShippingRateModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { addToCart, addToPendingOrdersRedux, addToWishlist, removeFromWishlist, getAllD2DRatesRedux } from '@/store/actions';
import { get1688CategoryRateById } from '@/lib/firebaseUtils';
import { getProductById, getShippingQuote } from '@/lib/api';
import {
  classifyDangerousGoods, findVariantByProperties, propVal, getUnitPrice,
  moqState, buildColorsArray, buildSizesArray, getSellerStatuses,
} from '@/lib/product';
import { chargeFor, ratePerKgFor, isParcelRate } from '@/lib/freight';
import { getActiveDiscountPercent, applyDiscount } from '@/lib/discount';
import { getCampaignRateForProduct } from '@/lib/campaignPricing';
import { cdn, cdnHtml } from '@/lib/cdn';
import { flyToIconFromRef } from '@/lib/flyToIcon';
import { getJSON, setJSON, remove, KEYS } from '@/lib/storage';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const SHIP_DEBOUNCE_MS = 800;

export default function Product() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { id, campaignCategoryId } = route.params || {};

  const cached = useSelector((s) => s.singleProduct?.product);
  const currentUser = useSelector((s) => s.user?.currentUser);
  const taka = parseFloat(useSelector((s) => s.user?.currency?.taka)) || 18;
  const siteDiscount = useSelector((s) => s.orders?.siteDiscount);
  const campaigns = useSelector((s) => s.orders?.campaigns || []);
  const wishlist = useSelector((s) => s.wishlist?.wishlist || []);

  /* Seeded from the listing the user came from so the page paints immediately,
     then replaced by the detail fetch. A direct/deep link has no seed. */
  const [product, setProduct] = useState(cached?.id === id ? cached : null);
  const [loading, setLoading] = useState(true);
  const [categoryRate, setCategoryRate] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [skuQtys, setSkuQtys] = useState({});
  const [simpleQty, setSimpleQty] = useState(1);
  const [shipMode, setShipMode] = useState('air');
  const [goodsType, setGoodsType] = useState(null);
  const [rateModal, setRateModal] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [warning, setWarning] = useState('');
  const [tab, setTab] = useState('description');

  /* China-local courier charge, quoted per quantity. */
  const [shipping, setShipping] = useState(null);
  const [shipQty, setShipQty] = useState(0);
  const [shipLoading, setShipLoading] = useState(false);
  const debounceRef = useRef(null);
  const imgRef = useRef(null);

  /* ── Load ── */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getProductById(id)
      .then((res) => {
        if (!alive) return;
        const p = res.data?.product || res.data;
        if (p) setProduct((prev) => ({ ...(prev || {}), ...p }));
      })
      .catch(() => {
        if (alive && !product) toast.error('Could not load this product.');
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const catId = campaignCategoryId || product?.thirdCategoryId || product?.categoryId;
    if (!catId) return;
    let alive = true;
    get1688CategoryRateById(catId)
      .then((r) => alive && setCategoryRate(r || null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [product?.thirdCategoryId, product?.categoryId, campaignCategoryId]);

  useEffect(() => {
    dispatch(getAllD2DRatesRedux('air', 'China'));
  }, [dispatch]);

  /* ── Derived ── */
  const colorsArray = useMemo(() => buildColorsArray(product), [product]);
  const sizesArray = useMemo(() => buildSizesArray(product), [product]);
  const hasVariants = colorsArray.length > 0 || sizesArray.length > 0;
  const priceRange = product?.price_range || [];
  const pics = useMemo(() => product?.pictures || [], [product]);

  useEffect(() => {
    if (!selectedColor && colorsArray.length > 0) setSelectedColor(colorsArray[0].properties);
  }, [colorsArray, selectedColor]);

  const dgInfo = useMemo(() => classifyDangerousGoods(product), [product]);
  const effectiveGoodsType = goodsType || dgInfo.types[0]?.id || 'regular';
  const isDgGoods = effectiveGoodsType !== 'regular';

  /* Campaign rate overrides the global FX rate for matching categories; the
     campaign's own discount then supersedes the site-wide one. */
  const campaignRate = useMemo(
    () => getCampaignRateForProduct(campaigns, product),
    [campaigns, product],
  );
  const effTaka = campaignRate?.rmbRate > 0 ? campaignRate.rmbRate : taka;
  const discountPct = campaignRate
    ? campaignRate.discountPercent
    : getActiveDiscountPercent(siteDiscount);

  const unitPriceFor = useCallback(
    (key) => {
      const v = findVariantByProperties(product?.variants, key);
      return getUnitPrice(
        v?.price || product?.salePrice || product?.price || 0,
        totalQty,
        priceRange,
        effTaka,
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [product, priceRange, effTaka, skuQtys, simpleQty],
  );

  const stockFor = useCallback(
    (key) => {
      const v = findVariantByProperties(product?.variants, key);
      const n = parseInt(v?.stock ?? v?.amountOnSale, 10);
      return Number.isFinite(n) ? n : null;
    },
    [product],
  );

  const { totalQty, totalPrice } = useMemo(() => {
    if (!product) return { totalQty: 0, totalPrice: 0 };
    if (!hasVariants) {
      const p = getUnitPrice(
        parseFloat(product.salePrice || product.price || 0),
        simpleQty,
        priceRange,
        effTaka,
      );
      return { totalQty: simpleQty, totalPrice: p * simpleQty };
    }
    let qty = 0;
    Object.values(skuQtys).forEach((q) => {
      qty += parseInt(q, 10) || 0;
    });
    let sum = 0;
    Object.entries(skuQtys).forEach(([key, q]) => {
      const n = parseInt(q, 10) || 0;
      if (!n) return;
      const v = findVariantByProperties(product.variants, key);
      sum += getUnitPrice(v?.price, qty, priceRange, effTaka) * n;
    });
    return { totalQty: qty, totalPrice: sum };
  }, [product, hasVariants, simpleQty, skuQtys, priceRange, effTaka]);

  const basePrice = product
    ? getUnitPrice(product.salePrice || product.price || 0, totalQty, priceRange, effTaka)
    : 0;
  const discountedBase = Math.round(applyDiscount(basePrice, discountPct));
  const discountedTotal = Math.round(applyDiscount(totalPrice, discountPct));

  const moq = moqState(product, totalQty);
  const approxWeightKg = parseFloat(((product?.item_weight || 0) * totalQty).toFixed(2));
  const freightCharge = totalQty > 0 ? chargeFor(categoryRate, shipMode, approxWeightKg, isDgGoods) : 0;
  const ratePerKg = ratePerKgFor(categoryRate, shipMode, approxWeightKg, isDgGoods);

  /* The China courier charge is baked into the order payload both Buy Now and
     Add to Cart build, so ordering before it settles commits the previous
     quantity's charge. True from the moment the quantity changes until the
     fetch for that exact quantity lands — it covers the debounce too. */
  const shipChargePending = totalQty > 0 && (shipLoading || shipQty !== totalQty);

  /* ── China-local shipping quote, debounced ── */
  const fetchShipping = useCallback(
    async (qty) => {
      if (!product?.id || qty <= 0) {
        setShipping(null);
        setShipQty(qty);
        return;
      }
      setShipLoading(true);
      try {
        const skuList = Object.entries(skuQtys)
          .filter(([, q]) => q > 0)
          .map(([key, q]) => {
            const v = findVariantByProperties(product.variants, key);
            return { skuId: v?.skuId || v?.sku_id, quantity: parseInt(q, 10) };
          });
        const res = await getShippingQuote({
          productId: product.id,
          totalQuantity: qty,
          skus: JSON.stringify(skuList),
        });
        const sc = res.data?.shippingCost;
        if (sc?.freePostage) setShipping('free');
        else if (sc?.freight) setShipping(String(Math.round(parseFloat(sc.freight) * effTaka)));
        else setShipping('later');
      } catch {
        setShipping('later');
      } finally {
        setShipQty(qty);
        setShipLoading(false);
      }
    },
    [product, skuQtys, effTaka],
  );

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchShipping(totalQty), SHIP_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalQty]);

  /* ── Pending intent across a login round-trip ── */
  useEffect(() => {
    if (!currentUser?.id) return;
    const pending = getJSON(KEYS.pendingProduct(id));
    if (!pending) return;
    remove(KEYS.pendingProduct(id));
    if (pending.skuQtys) setSkuQtys(pending.skuQtys);
    if (pending.simpleQty) setSimpleQty(pending.simpleQty);
    if (pending.selectedColor) setSelectedColor(pending.selectedColor);
    toast.info('Your selection was restored — tap the button again to continue.');
  }, [currentUser?.id, id]);

  const requireLogin = (intent) => {
    if (currentUser?.id || currentUser?.email) return false;
    setJSON(KEYS.pendingProduct(id), { skuQtys, simpleQty, selectedColor, intent });
    navigation.navigate('Login', { returnTo: 'Product' });
    return true;
  };

  const blockedByMoq = () => {
    if (!moq.blocked) return false;
    setWarning(moq.message);
    toast.error(
      totalQty === 0
        ? 'Please select a quantity first.'
        : `Minimum order quantity is ${moq.moq} pcs — please add ${moq.shortfall} more.`,
    );
    return true;
  };

  /* Both actions send the identical payload; only the destination differs. */
  const buildOrderPayload = () => {
    const skus = !hasVariants
      ? [{ totalQuantity: simpleQty, price: basePrice, sku_id: Date.now().toString() }]
      : Object.entries(skuQtys)
          .filter(([, q]) => q > 0)
          .map(([key, q]) => {
            const v = findVariantByProperties(product.variants, key);
            const cp = key.split(';').find((p) => p.startsWith('0'));
            const sp = key.split(';').find((p) => p.startsWith('1'));
            return {
              totalQuantity: parseInt(q, 10),
              color: cp ? propVal(product.props_list?.[cp]) : null,
              size: sp ? propVal(product.props_list?.[sp]) : null,
              image: colorsArray.find((c) => c.properties === cp)?.url || null,
              ...v,
              price: getUnitPrice(
                v?.price || product.salePrice || product.price || 0,
                totalQty,
                priceRange,
                effTaka,
              ),
            };
          });

    const localShip =
      !shipping || shipping === 'free' || shipping === 'later' ? '0' : `${parseInt(shipping, 10)}`;

    return {
      shopId: product.shop_id,
      shopName: product.shop_name || product.shopName,
      localShipping: localShip,
      currency: effTaka,
      items: [
        {
          id: product.id,
          name: product.name,
          detail_url: product.detail_url,
          availability: product.availability,
          picture: pics[0],
          variants: hasVariants ? false : [],
          skus,
          propertyNames: product.propertyNames || product.props_name,
          price_range: priceRange.length ? JSON.stringify(priceRange) : '',
          /* The same per-kg rate shown on the page — it used to be the
             alg.com.bd category value, which could differ from the
             1688Category rate the customer was actually quoted. */
          shippingRate: ratePerKg,
          productType: product.productType || 'Others',
          shipmentMethod: shipMode === 'sea' ? 'Sea' : 'Air',
          campaignId: campaignRate?.campaignId || null,
          campaignDiscountPercent: campaignRate ? discountPct : 0,
          weight: approxWeightKg.toFixed(2),
          batch: product.batch || '',
          /* The cart re-enforces both of these when quantities change. */
          moq: moq.moq,
          /* Air's 0–0.3kg band is charged per parcel, not per kg — the cart
             needs the per-piece weight to tell which band a changed quantity
             falls into, plus the unit as it stood here. */
          unitWeight: parseFloat(product.item_weight) || 0,
          shippingRateUnit: isParcelRate(shipMode, approxWeightKg) ? 'parcel' : 'kg',
        },
      ],
    };
  };

  const handleAddToCart = async () => {
    if (blockedByMoq() || requireLogin('cart')) return;
    if (shipChargePending) {
      toast.info('Just a moment — calculating the China courier charge.');
      return;
    }
    setWarning('');
    setCartLoading(true);
    try {
      await dispatch(addToCart(currentUser, buildOrderPayload()));
      flyToIconFromRef(pics[0], imgRef, 'cart');
      toast.success('Added to cart');
    } catch {
      toast.error('Failed to add to cart. Please try again.');
    }
    setCartLoading(false);
  };

  const handleBuyNow = () => {
    if (blockedByMoq() || requireLogin('order')) return;
    if (shipChargePending) {
      toast.info('Just a moment — calculating the China courier charge.');
      return;
    }
    setWarning('');
    dispatch(addToPendingOrdersRedux([buildOrderPayload()]));
    navigation.navigate('CartTab', { screen: 'PlaceOrder' });
  };

  const isWishlisted = wishlist.some((w) => w.id === product?.id);
  const toggleWishlist = () => {
    if (!product) return;
    if (isWishlisted) dispatch(removeFromWishlist(product.id));
    else {
      dispatch(addToWishlist(product));
      flyToIconFromRef(pics[0], imgRef, 'wishlist');
    }
  };

  if (loading && !product) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <View className="p-3 gap-3">
          <Skeleton className="w-full rounded-xl" style={{ height: SCREEN_W }} />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-3 w-full" />
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 items-center justify-center bg-background">
        <Text className="text-md font-bold text-foreground">Product not found</Text>
        <Pressable onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-smd text-primary font-semibold">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const sellerStatuses = getSellerStatuses(product.sellerIdentities);
  const descriptionHtml = product.description ? cdnHtml(product.description) : '';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2 bg-white border-b border-gray-100">
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
          <ArrowLeft size={22} color={colors.foreground} />
        </Pressable>
        <Text className="flex-1 text-smd font-bold text-foreground" numberOfLines={1}>
          {product.name}
        </Text>
        <Pressable onPress={toggleWishlist} hitSlop={8} className="p-1">
          <Heart
            size={20}
            color={isWishlisted ? colors.brand : colors.muted}
            fill={isWishlisted ? colors.brand : 'transparent'}
          />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="pb-40">
        {/* Gallery */}
        <View ref={imgRef}>
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
            <View className="absolute bottom-3 right-3 bg-black/50 rounded-full px-2.5 py-1">
              <Text className="text-white text-2xs font-semibold">
                {activeImg + 1}/{pics.length}
              </Text>
            </View>
          )}
        </View>

        <View className="bg-white px-3 py-3">
          <PriceTag
            amount={discountedBase}
            original={discountPct > 0 ? basePrice : null}
            className="text-xl font-extrabold text-brand"
            originalClassName="text-smd"
          />
          <Text className="text-smd text-foreground mt-2 leading-snug">{product.name}</Text>

          <View className="flex-row items-center gap-3 mt-2">
            {parseFloat(product.rating) > 0 && (
              <View className="flex-row items-center gap-1">
                <Star size={11} color="#f59e0b" fill="#f59e0b" />
                <Text className="text-2xs text-gray-500">
                  {parseFloat(product.rating).toFixed(1)}
                </Text>
              </View>
            )}
            {(product.totalSold || product.orders) > 0 && (
              <Text className="text-2xs text-gray-400">
                {parseInt(product.totalSold || product.orders, 10).toLocaleString()} sold
              </Text>
            )}
            {moq.moq > 1 && (
              <Text className="text-2xs text-gray-400">MOQ {moq.moq} pcs</Text>
            )}
          </View>

          {sellerStatuses.length > 0 && (
            <View className="flex-row gap-1.5 mt-2">
              {sellerStatuses.map((s) => (
                <View
                  key={s.id}
                  className="flex-row items-center gap-1 rounded px-1.5 py-0.5"
                  style={{ backgroundColor: s.bg }}
                >
                  <s.Icon size={9} color={s.color} />
                  <Text className="text-xxs font-bold" style={{ color: s.color }}>
                    {s.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {dgInfo.isDangerousGoods && (
            <View className="flex-row items-start gap-2 rounded-xl bg-amber-soft border border-amber-line px-3 py-2.5 mt-3">
              <AlertTriangle size={14} color="#8a5a06" />
              <Text className="flex-1 text-2xs text-amber-900">
                This item looks like it contains{' '}
                {dgInfo.types.map((t) => t.label.toLowerCase()).join(', ')} — it cannot be flown
                out of the mainland and ships via Hong Kong at a different rate.
              </Text>
            </View>
          )}
        </View>

        {/* Wholesale tiers */}
        {priceRange.length > 1 && (
          <View className="bg-white mt-2 px-3 py-3">
            <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
              Wholesale pricing
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {priceRange.map((r, i) => {
                const minQ = parseInt(r[0] ?? r.beginAmount ?? 0, 10);
                const p = Math.round(parseFloat(r[1] ?? r.price ?? 0) * effTaka);
                const active =
                  totalQty >= minQ &&
                  (i === priceRange.length - 1 ||
                    totalQty < parseInt(priceRange[i + 1][0] ?? 0, 10));
                return (
                  <View
                    key={i}
                    className={`rounded-lg px-3 py-2 border ${active ? 'border-primary bg-primary-tint' : 'border-gray-100 bg-gray-50'}`}
                  >
                    <Text className="text-xxs text-gray-500">{minQ}+ pcs</Text>
                    <Text
                      className={`text-smd font-extrabold ${active ? 'text-primary' : 'text-foreground'}`}
                    >
                      ৳{p.toLocaleString()}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Variants */}
        <View className="bg-white mt-2 px-3 py-3">
          {hasVariants ? (
            <VariantSelector
              colorsArray={colorsArray}
              sizesArray={sizesArray}
              selectedColor={selectedColor}
              onSelectColor={setSelectedColor}
              skuQtys={skuQtys}
              onQtyChange={(key, q) =>
                setSkuQtys((prev) => {
                  const next = { ...prev };
                  if (q > 0) next[key] = q;
                  else delete next[key];
                  return next;
                })
              }
              unitPriceFor={unitPriceFor}
              stockFor={stockFor}
            />
          ) : (
            <View className="flex-row items-center justify-between">
              <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest">
                Quantity
              </Text>
              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => setSimpleQty((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-full border border-gray-300 items-center justify-center"
                >
                  <Text className="text-md text-gray-500">−</Text>
                </Pressable>
                <Text className="text-md font-bold text-foreground w-8 text-center">
                  {simpleQty}
                </Text>
                <Pressable
                  onPress={() => setSimpleQty((q) => q + 1)}
                  className="w-8 h-8 rounded-full border border-gray-300 items-center justify-center"
                >
                  <Text className="text-md text-gray-500">+</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Shipping */}
        <Pressable
          onPress={() => setRateModal(true)}
          className="bg-white mt-2 px-3 py-3 flex-row items-center gap-3"
        >
          <Truck size={18} color={colors.primary} />
          <View className="flex-1">
            <Text className="text-smd font-bold text-foreground">
              {shipMode === 'air' ? 'By Air' : 'By Sea'} · ৳{ratePerKg.toLocaleString()}
              <Text className="text-2xs font-normal text-gray-400">
                {isParcelRate(shipMode, approxWeightKg) ? '/parcel' : '/kg'}
              </Text>
            </Text>
            <Text className="text-2xs text-gray-400">
              {totalQty > 0
                ? `≈ ${approxWeightKg} kg · ৳${freightCharge.toLocaleString()} freight`
                : 'Select a quantity to estimate freight'}
            </Text>
          </View>
          <ChevronRight size={16} color={colors.muted} />
        </Pressable>

        {/* China local courier */}
        <View className="bg-white mt-2 px-3 py-3 flex-row items-center justify-between">
          <Text className="text-smd text-gray-600">China local courier</Text>
          {shipLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text className="text-smd font-bold text-foreground">
              {shipping === 'free'
                ? 'Free'
                : shipping === 'later' || shipping == null
                  ? 'Calculated later'
                  : `৳${parseInt(shipping, 10).toLocaleString()}`}
            </Text>
          )}
        </View>

        {/* Description */}
        <View className="bg-white mt-2">
          <View className="flex-row border-b border-gray-100">
            {[
              { key: 'description', label: 'Description' },
              { key: 'specs', label: 'Specifications' },
            ].map((t) => (
              <Pressable key={t.key} onPress={() => setTab(t.key)} className="px-4 py-3">
                <Text
                  className={`text-smd ${tab === t.key ? 'text-primary font-bold' : 'text-gray-500'}`}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {tab === 'specs' ? (
            <View className="px-3 py-2">
              {(product.specs || []).map((s, i) => (
                <View key={i} className="flex-row py-1.5 border-b border-gray-50">
                  <Text className="text-smd text-gray-500 w-1/3">{s.name}</Text>
                  <Text className="text-smd text-foreground flex-1">{s.value}</Text>
                </View>
              ))}
              {(product.specs || []).length === 0 && (
                <Text className="text-smd text-gray-400 py-4">
                  No specifications provided.
                </Text>
              )}
            </View>
          ) : descriptionHtml ? (
            /* The description is raw seller HTML with inline <img> tags. It is
               rendered in a WebView with the CDN rewrite already applied — a
               native re-implementation would have to reproduce arbitrary
               vendor markup. */
            <View style={{ height: 520 }}>
              <WebView
                originWhitelist={['*']}
                source={{
                  html: `<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:8px;font-family:-apple-system,Roboto,sans-serif;font-size:14px;color:#1e293b}img{max-width:100%!important;height:auto!important}table{max-width:100%}</style>
${descriptionHtml}`,
                }}
                scalesPageToFit={false}
                showsVerticalScrollIndicator={false}
              />
            </View>
          ) : (
            <Text className="text-smd text-gray-400 px-3 py-4">No description provided.</Text>
          )}
        </View>
      </ScrollView>

      {/* Sticky action bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-3 pt-2.5 pb-6">
        {!!warning && <Text className="text-2xs text-brand mb-1.5">{warning}</Text>}
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xs text-gray-500">
            {totalQty} pcs{moq.moq > 1 ? ` · min ${moq.moq}` : ''}
          </Text>
          <PriceTag
            amount={discountedTotal}
            original={discountPct > 0 ? totalPrice : null}
            className="text-md font-extrabold text-brand"
            originalClassName="text-2xs"
          />
        </View>
        <View className="flex-row gap-2">
          <Button
            title="Add to Cart"
            variant="outline"
            loading={cartLoading}
            onPress={handleAddToCart}
            icon={<ShoppingCart size={15} color={colors.foreground} />}
            className="flex-1"
          />
          <Button title="Buy Now" onPress={handleBuyNow} className="flex-1" />
        </View>
      </View>

      <ShippingRateModal
        visible={rateModal}
        onClose={() => setRateModal(false)}
        categoryRate={categoryRate}
        weightKg={approxWeightKg}
        isDgGoods={isDgGoods}
        shipMode={shipMode}
        onSelectMode={setShipMode}
        goodsTypeOptions={[
          { id: 'regular', label: 'Regular (No Battery)' },
          ...dgInfo.types.map((t) => ({ id: t.id, label: t.label, Icon: t.Icon })),
        ]}
        goodsType={effectiveGoodsType}
        onSelectGoodsType={setGoodsType}
      />
    </SafeAreaView>
  );
}
