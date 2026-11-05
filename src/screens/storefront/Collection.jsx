import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, Pressable, ActivityIndicator, Dimensions, ScrollView, RefreshControl, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect, useScrollToTop } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import Animated, {
  useAnimatedStyle,
  useAnimatedRef,
  useAnimatedReaction,
  withTiming,
  withSpring,
  FadeIn,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import {
  ChevronRight, ChevronLeft, ChevronDown, Home as HomeIcon, ArrowUpDown, Image as ImageIcon, Crop, Check,
  TrendingUp, ShieldCheck, Flame, ArrowUp,
} from 'lucide-react-native';
import Header from '@/components/Header';
import SortSheet from '@/components/collection/SortSheet';
import ProductImage from '@/components/ui/ProductImage';
import CollectionProductCard, { CollectionProductCardSkeleton } from '@/components/collection/CollectionProductCard';
import {
  setSearchedProductsArray, emptySearchedProductsArray, setSearchedProductDetail,
} from '@/store/actions';
import { searchByImage, getVendorProducts, searchProducts, uploadSearchImage } from '@/lib/api';
import { getImageSearchInstances, appendImageSearchInstance, resizeAndCompressToBase64 } from '@/lib/imageUtils';
import { getCampaignRateForCategoryIds } from '@/lib/campaignPricing';
import { cropImage } from '@/lib/picker';
import { toast } from '@/lib/toast';
import useHideOnScroll from '@/lib/useHideOnScroll';
import { FlashList } from '@shopify/flash-list';
import { goHome } from '@/navigation/goHome';

/* ═══════════════════════════════════════════════════════════════════════
   COLLECTION — port of paicart-nextjs15 src/app/collection/[id]/page.jsx
   at its mobile breakpoint. One screen, three listing modes, picked by the
   route params exactly as the web picked them from the query string:
     imageUrl  → image search    (id is the sentinel 'img_uploads')
     shopName  → vendor store    (id is the vendorId)
     otherwise → keyword / category search (id is the keyword)
   Native additions: sort in a bottom sheet (the web's <select> opens the OS
   picker on a phone), pull to refresh, a back arrow in the breadcrumb, fading
   card entrances, a scroll-to-top button and tap-tab-to-top.
   ═══════════════════════════════════════════════════════════════════════ */

const { width: SCREEN_W } = Dimensions.get('window');
/* Reanimated's scroll handler drives the hide-on-scroll chrome. */
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList);

const PAGE_PX = 8; // px-2
const GAP = 12; // gap-3
const CARD_W = (SCREEN_W - PAGE_PX * 2 - GAP) / 2;
const RED = '#e62222';
const ORANGE = '#FF6A00';
const HERO_H = 160; // h-40

const SORT_OPTIONS = [
  { value: 'Default', label: 'Relevance' },
  { value: 'sales-desc', label: 'Best Selling' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
];

const titleize = (raw) => {
  let s = String(raw || '');
  try {
    s = decodeURIComponent(s);
  } catch {
    /* already decoded */
  }
  return s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

/* ─── Campaign hero ─── */
function CampaignHero({ image, title }) {
  return (
    <View style={{ height: HERO_H }} className="w-full overflow-hidden">
      <ProductImage uri={image} className="w-full h-full" resizeMode="cover" />
      {/* from-black/85 via-black/25 to-black/10 (to top) */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="heroFade" x1="0" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor="#000" stopOpacity="0.85" />
            <Stop offset="0.5" stopColor="#000" stopOpacity="0.25" />
            <Stop offset="1" stopColor="#000" stopOpacity="0.1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroFade)" />
      </Svg>
      <View className="absolute left-0 right-0 bottom-0 pb-4" style={{ paddingHorizontal: PAGE_PX }}>
        <View className="flex-row items-center self-start rounded-full px-2 py-1 mb-1.5" style={{ backgroundColor: ORANGE, gap: 4 }}>
          <Flame size={11} color="#ffffff" />
          <Text className="text-white font-bold" style={{ fontSize: 10, lineHeight: 12 }}>ক্যাম্পেইন</Text>
        </View>
        <Text
          className="text-white text-xl font-extrabold"
          style={{ lineHeight: 25, textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}
        >
          {title}
        </Text>
      </View>
    </View>
  );
}

/* ─── Stats strip above the grid ─── */
function StatsStrip({ count, total, imageUrl, shopName }) {
  return (
    <View className="flex-row items-center flex-wrap mb-4" style={{ gap: 12, paddingHorizontal: PAGE_PX }}>
      {imageUrl ? (
        <View className="flex-row items-center bg-white border border-gray-200 rounded-full px-3 py-1" style={{ gap: 6 }}>
          <ImageIcon size={12} color={RED} />
          <Text className="text-xs text-gray-500">Image search results</Text>
        </View>
      ) : shopName ? (
        <View className="flex-row items-center bg-white border border-gray-200 rounded-full px-3 py-1" style={{ gap: 6 }}>
          <ShieldCheck size={12} color="#10b981" />
          <Text className="text-xs text-gray-500">Vendor: {shopName}</Text>
        </View>
      ) : null}
      <View className="flex-row items-center" style={{ gap: 4 }}>
        <TrendingUp size={12} color={RED} />
        <Text className="text-xs font-medium text-gray-700">
          {count} products shown
          {total > 0 && <Text className="text-gray-400 font-normal"> of {total}+ total</Text>}
        </Text>
      </View>
    </View>
  );
}

/* ─── Image-search instance strip: original + every crop made from it ─── */
function InstanceStrip({ instances, activeId, cropping, onSelect, onCrop }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: PAGE_PX, paddingTop: 12, gap: 8 }}
    >
      {instances.map((inst) => {
        const active = inst.id === activeId;
        return (
          <Pressable
            key={inst.id}
            onPress={() => onSelect(inst.id)}
            disabled={cropping}
            className="w-16 h-16 rounded-xl overflow-hidden border-2"
            style={{ borderColor: active ? ORANGE : '#e5e7eb', opacity: cropping ? 0.7 : 1, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}
          >
            <ProductImage uri={inst.preview} className="w-full h-full" fallbackIconSize={14} />
            {active && (
              <View className="absolute top-1 right-1 w-4 h-4 rounded-full items-center justify-center" style={{ backgroundColor: ORANGE }}>
                <Check size={10} color="#ffffff" strokeWidth={3} />
              </View>
            )}
            <Pressable
              onPress={() => onCrop(inst.preview)}
              disabled={cropping}
              className="absolute bottom-0 left-0 right-0 flex-row items-center justify-center py-1 active:opacity-80"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', gap: 4 }}
            >
              <Crop size={9} color="#ffffff" />
              <Text className="text-white font-bold" style={{ fontSize: 8, lineHeight: 9 }}>Crop</Text>
            </Pressable>
            {cropping && (
              <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
                <ActivityIndicator size="small" color="#ffffff" />
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ═══════════════════════════════════════
   COLLECTION SCREEN
═══════════════════════════════════════ */
export default function Collection() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const { id, imageUrl: imageUrlRaw = '', shopName = '', campaignName = '', campaignImage = '' } = route.params || {};
  const imageUrl = imageUrlRaw
    ? String(imageUrlRaw).replace('rechargeRequests/', 'rechargeRequests%2F').replaceAll(' ', '%20')
    : '';
  const currentKey = `${id}|${imageUrlRaw}|${shopName}`;

  const rawProducts = useSelector((s) => s.searchedProducts?.products || []);
  const totalResults = useSelector((s) => s.searchedProducts?.totalResults || 0);
  const totalFound = useSelector((s) => s.searchedProducts?.totalFound || 0);
  const storedSearchKey = useSelector((s) => s.searchedProducts?.searchKey || '');
  const storedPage = useSelector((s) => s.searchedProducts?.page || 1);
  const storedHasMore = useSelector((s) => s.searchedProducts?.hasMore ?? true);
  const taka = useSelector((s) => s.user?.currency?.taka);
  const campaigns = useSelector((s) => s.orders?.campaigns || []);

  /* The route id IS the campaign's configured category, so the collection's
     own category decides the campaign rate (web: same). */
  const campaignRate = useMemo(() => getCampaignRateForCategoryIds(campaigns, [id]), [campaigns, id]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState('Default');
  const [sortOpen, setSortOpen] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [instances, setInstances] = useState([]);
  const [cropping, setCropping] = useState(false);
  const [toolbarH, setToolbarH] = useState(96);
  const [showTop, setShowTop] = useState(false);
  const pageRef = useRef(1);

  useEffect(() => {
    if (imageUrl) setInstances(getImageSearchInstances());
  }, [imageUrl]);

  /* Client-side sort over what is loaded — the web never refetched. */
  const products = useMemo(() => {
    /* Pages can overlap upstream; drop repeats so every card keeps one stable
       key and re-sorting moves cards instead of rebuilding them. */
    const seen = new Set();
    const arr = rawProducts.filter((p) => {
      const k = p?.id != null ? String(p.id) : null;
      if (!k) return true;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (sortBy === 'price-asc') return arr.sort((a, b) => parseFloat(a.salePrice || 0) - parseFloat(b.salePrice || 0));
    if (sortBy === 'price-desc') return arr.sort((a, b) => parseFloat(b.salePrice || 0) - parseFloat(a.salePrice || 0));
    if (sortBy === 'sales-desc') return arr.sort((a, b) => parseInt(b.totalSold || 0, 10) - parseInt(a.totalSold || 0, 10));
    return arr;
  }, [rawProducts, sortBy]);

  const categoryName = titleize(id);
  const breadcrumbLabel = campaignName || categoryName;
  const title = imageUrl ? 'Image Search Results' : shopName ? 'Vendor Store' : campaignName || categoryName;

  /* ── Core fetch ── */
  const doFetch = useCallback(
    async (pageNum, sort, append) => {
      try {
        const params = { framePosition: pageNum, filterByCategory: sort || 'Default' };
        let response;
        if (imageUrl) {
          response = (await searchByImage(imageUrl, params)).data;
        } else if (shopName) {
          response = (await getVendorProducts({ vendorId: id, ...params })).data;
        } else {
          response = (await searchProducts(id, params)).data;
        }

        if (response?.products?.length > 0) {
          const newProducts = response.products;
          const newTotal = append ? totalResults + newProducts.length : newProducts.length;
          /* No total-pages field upstream: "more" = a full-looking page, capped at 300. */
          const newHasMore = newProducts.length >= 10 && newTotal < 300;
          dispatch(setSearchedProductsArray(newTotal, newProducts, response.totalRecords || 0, currentKey, pageNum, newHasMore));
          setHasMore(newHasMore);
        } else {
          if (!append) setNotFound(true);
          setHasMore(false);
        }
      } catch {
        if (!append) setNotFound(true);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
        setFetched(true);
      }
    },
    [id, imageUrl, shopName, dispatch, totalResults, currentKey],
  );

  const freshFetch = useCallback(() => {
    dispatch(emptySearchedProductsArray());
    pageRef.current = 1;
    setLoading(true);
    setLoadingMore(false);
    setNotFound(false);
    setHasMore(true);
    setFetched(false);
    setSortBy('Default');
    doFetch(1, 'Default', false);
  }, [dispatch, doFetch]);

  /* ── On focus: restore the cached list for this exact query, else fetch.
        (The redux cache holds one list, so returning to an earlier
        collection in the stack refetches — as the web did.) ── */
  /* Latest store values for the focus effect, which must not re-run (and
     refetch) every time they change. */
  const cacheRef = useRef({});
  cacheRef.current = { storedSearchKey, count: rawProducts.length, storedPage, storedHasMore };

  useFocusEffect(
    useCallback(() => {
      const { storedSearchKey, count, storedPage, storedHasMore } = cacheRef.current; // eslint-disable-line no-shadow
      if (currentKey === storedSearchKey && count > 0) {
        /* Back from a product: keep the list, the page and the chosen sort. */
        pageRef.current = storedPage;
        setLoading(false);
        setLoadingMore(false);
        setNotFound(false);
        setHasMore(storedHasMore);
        setFetched(true);
        return;
      }
      freshFetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentKey]),
  );

  /* ── Infinite scroll ── */
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore || !fetched || loading) return;
    pageRef.current += 1;
    setLoadingMore(true);
    doFetch(pageRef.current, sortBy, true);
  }, [loadingMore, hasMore, fetched, loading, sortBy, doFetch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    freshFetch();
  }, [freshFetch]);

  /* ── Product detail ── */
  const openProduct = useCallback(
    (product) => {
      dispatch(setSearchedProductDetail(product, '1688'));
      /* Carry this collection's campaign category so the product page applies
         the same campaign rate (the product's own category rarely matches). */
      navigation.navigate('Product', campaignRate ? { id: product.id, campaignCategoryId: id } : { id: product.id });
    },
    [dispatch, navigation, campaignRate, id],
  );

  /* ── Image-search instances ── */
  const selectInstance = useCallback(
    (instanceId) => {
      if (instanceId === imageUrlRaw) return;
      navigation.push('Collection', { id: 'img_uploads', imageUrl: instanceId });
    },
    [navigation, imageUrlRaw],
  );

  const startCrop = useCallback(
    async (preview) => {
      if (cropping) return;
      let cropped;
      try {
        cropped = await cropImage(preview);
      } catch {
        toast.error('There was an error cropping your image.');
        return;
      }
      if (!cropped) return;
      setCropping(true);
      try {
        const { base64, uri } = await resizeAndCompressToBase64(cropped.uri);
        const newImgId = await uploadSearchImage(base64);
        if (!newImgId) throw new Error('no id');
        setInstances(appendImageSearchInstance(newImgId, uri));
        navigation.push('Collection', { id: 'img_uploads', imageUrl: newImgId });
      } catch {
        toast.error('There was an error cropping your image.');
      }
      setCropping(false);
    },
    [cropping, navigation],
  );

  /* ── Scroll chrome: header hides on scroll; the toolbar sticks under it
        once the campaign hero has scrolled away, and fades with it. ── */
  const listRef = useAnimatedRef();
  useScrollToTop(listRef);
  const { onScroll, scrollY, hidden, isHidden, headerH, setHeaderH, headerStyle } = useHideOnScroll();
  const heroH = campaignImage ? HERO_H : 0;

  /* `top` (a layout prop) rather than a transform, so the toolbar's touch
     area follows it as it docks under the header — see SortSheet. */
  const toolbarBaseTop = insets.top + headerH;
  const toolbarStyle = useAnimatedStyle(() => ({
    opacity: withTiming(hidden.value ? 0 : 1, { duration: 300 }),
    top: toolbarBaseTop + Math.max(0, heroH - scrollY.value),
  }));

  useAnimatedReaction(
    () => scrollY.value > 1400,
    (show, prev) => {
      if (show !== prev) runOnJS(setShowTop)(show);
    },
  );
  const topBtnStyle = useAnimatedStyle(() => {
    const on = scrollY.value > 1400;
    return {
      opacity: withTiming(on ? 1 : 0, { duration: 200 }),
      transform: [{ scale: withSpring(on ? 1 : 0.6, { damping: 12 }) }],
    };
  });
  const scrollToTop = () => {
    listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
  };

  /* ── List pieces ── */
  const listData = loading ? Array.from({ length: 20 }, (_, i) => ({ __skeleton: i })) : notFound ? [] : products;

  /* FlashList has no columnWrapperStyle or gap: each cell carries half the
     gutter on either side (the container's padding is reduced to match) and
     the row gap below it, which lays out exactly like the old FlatList grid.
     No per-card entering fade — recycled cells would replay it. */
  const renderItem = useCallback(
    ({ item }) => (
      <View style={{ paddingHorizontal: GAP / 2, paddingBottom: GAP }}>
        {item.__skeleton !== undefined ? (
          <View style={{ width: CARD_W }}>
            <CollectionProductCardSkeleton />
          </View>
        ) : (
          <View style={{ width: CARD_W }}>
            <CollectionProductCard product={item} taka={taka} campaignRate={campaignRate} onOpen={openProduct} />
          </View>
        )}
      </View>
    ),
    [taka, campaignRate, openProduct],
  );
  const getItemType = useCallback((item) => (item.__skeleton !== undefined ? 'skeleton' : 'product'), []);

  const listHeader = (
    <View>
      {!!campaignImage && <CampaignHero image={campaignImage} title={campaignName || categoryName} />}
      {/* room for the toolbar overlay */}
      <View style={{ height: toolbarH }} />
      <View style={{ height: 20 }} />
      {!loading && products.length > 0 && (
        <StatsStrip count={products.length} total={totalFound} imageUrl={imageUrl} shopName={shopName} />
      )}
    </View>
  );

  const listFooter =
    !loading && products.length > 0 ? (
      loadingMore ? (
        <View className="flex-row items-center justify-center py-10" style={{ gap: 8 }}>
          <ActivityIndicator size="small" color={RED} />
          <Text className="text-sm text-gray-400">Loading more products…</Text>
        </View>
      ) : !hasMore ? (
        <View className="items-center py-10">
          <View className="bg-white border border-gray-100 rounded-full px-5 py-2.5" style={{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
            <Text className="text-sm text-gray-400">✓ You've seen all {products.length} products</Text>
          </View>
        </View>
      ) : (
        <View style={{ height: 16 }} />
      )
    ) : null;

  const listEmpty =
    !loading && notFound ? (
      <Animated.View entering={FadeIn.duration(300)} className="items-center justify-center py-24 px-6">
        <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-5">
          <Text style={{ fontSize: 36 }}>🔍</Text>
        </View>
        <Text className="text-lg font-bold text-gray-800 mb-1.5">No products found</Text>
        <Text className="text-sm text-gray-400 text-center mb-7" style={{ maxWidth: 320, lineHeight: 22.75 }}>
          We couldn't find any products for <Text className="font-bold">"{breadcrumbLabel}"</Text>. Try a different keyword or browse a category.
        </Text>
        <Pressable
          onPress={goHome}
          className="rounded-full px-7 py-2.5 active:opacity-80"
          style={{ backgroundColor: RED, boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}
        >
          <Text className="text-white text-sm font-bold">Back to Home</Text>
        </Pressable>
      </Animated.View>
    ) : null;

  const closeSort = useCallback(() => setSortOpen(false), []);
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label;

  return (
    <View className="flex-1" style={{ backgroundColor: '#f5f5f5' }}>
      {/* FlashList recycles card views instead of building new ones while
          flicking — the FlatList grid logged "large list that is slow to
          update" (777 ms batches) on a budget phone. */}
      <AnimatedFlashList
        ref={listRef}
        data={listData}
        keyExtractor={(item, i) => (item.__skeleton !== undefined ? `sk-${i}` : item.id != null ? String(item.id) : `p-${i}`)}
        numColumns={2}
        renderItem={renderItem}
        getItemType={getItemType}
        contentContainerStyle={{ paddingTop: insets.top + headerH, paddingBottom: 24 - GAP, paddingHorizontal: PAGE_PX - GAP / 2 }}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={listEmpty}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[ORANGE]}
            tintColor={ORANGE}
            progressViewOffset={insets.top + headerH + heroH + toolbarH}
          />
        }
      />

      {/* Breadcrumb + toolbar — one sticky group, as on the web */}
      <Animated.View
        pointerEvents={isHidden ? 'none' : 'box-none'}
        onLayout={(e) => setToolbarH(e.nativeEvent.layout.height)}
        style={[{ position: 'absolute', left: 0, right: 0, zIndex: 5 }, toolbarStyle]}
      >
        {/* Breadcrumb */}
        <View className="bg-white border-b border-gray-100">
          <View className="flex-row items-center py-2.5" style={{ paddingHorizontal: PAGE_PX, gap: 6 }}>
            {navigation.canGoBack() && (
              <Pressable onPress={() => navigation.goBack()} hitSlop={10} className="mr-0.5 active:opacity-60">
                <ChevronLeft size={16} color="#6b7280" />
              </Pressable>
            )}
            <Pressable
              onPress={goHome}
              className="flex-row items-center active:opacity-60"
              style={{ gap: 4 }}
            >
              <HomeIcon size={12} color="#6b7280" />
              <Text className="text-xs text-gray-500">Home</Text>
            </Pressable>
            <ChevronRight size={11} color="#d1d5db" />
            {imageUrl ? (
              <View className="flex-row items-center" style={{ gap: 4 }}>
                <ImageIcon size={12} color="#374151" />
                <Text className="text-xs text-gray-700 font-medium">Image Search</Text>
              </View>
            ) : (
              <Text className="flex-1 text-xs text-gray-700 font-medium" numberOfLines={1}>
                {shopName ? `Vendor: ${shopName}` : breadcrumbLabel}
              </Text>
            )}
          </View>
        </View>

        {/* Toolbar */}
        <View className="bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}>
          {!!imageUrl && instances.length > 0 && (
            <InstanceStrip
              instances={instances}
              activeId={imageUrlRaw}
              cropping={cropping}
              onSelect={selectInstance}
              onCrop={startCrop}
            />
          )}

          <View className="flex-row items-center justify-between py-3" style={{ paddingHorizontal: PAGE_PX, gap: 16 }}>
            <View className="flex-1" style={{ minWidth: 0 }}>
              <Text className="font-extrabold text-gray-900" style={{ fontSize: 15, lineHeight: 19 }} numberOfLines={1}>
                {title}
              </Text>
              {fetched && !loading && products.length > 0 && (
                <Animated.Text entering={FadeIn.duration(250)} className="text-gray-400 mt-0.5" style={{ fontSize: 11 }}>
                  {products.length} of {totalFound > 0 ? `${totalFound}+` : 'many'} products
                </Animated.Text>
              )}
            </View>

            <View className="flex-row items-center" style={{ gap: 8 }}>
              <ArrowUpDown size={13} color="#9ca3af" />
              <Pressable
                onPress={() => setSortOpen(true)}
                className="flex-row items-center border rounded-lg px-2.5 py-1.5 bg-white active:bg-gray-50"
                style={{ gap: 4, borderColor: sortOpen ? RED : '#e5e7eb' }}
              >
                <Text className="text-gray-700" style={{ fontSize: 11 }}>{sortLabel}</Text>
                <ChevronDown size={12} color="#9ca3af" />
              </Pressable>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Header (slides away on scroll) under a fixed status-bar strip */}
      <Animated.View
        pointerEvents={isHidden ? 'none' : 'box-none'}
        style={[{ position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 10 }, headerStyle]}
      >
        <Header hidden={isHidden} onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)} />
      </Animated.View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: '#ffffff', zIndex: 11 }} />

      {/* Scroll to top */}
      <Animated.View
        pointerEvents={showTop ? 'auto' : 'none'}
        style={[{ position: 'absolute', right: 16, bottom: 16, zIndex: 12 }, topBtnStyle]}
      >
        <Pressable
          onPress={scrollToTop}
          accessibilityLabel="Scroll to top"
          className="w-11 h-11 rounded-full bg-white items-center justify-center active:opacity-80"
          style={{ boxShadow: '0 6px 16px -4px rgba(15,23,42,0.25)', borderWidth: 1, borderColor: '#f1f5f9' }}
        >
          <ArrowUp size={18} color={ORANGE} strokeWidth={2.4} />
        </Pressable>
      </Animated.View>

      {/* Sort sheet */}
      <SortSheet
        visible={sortOpen}
        options={SORT_OPTIONS}
        value={sortBy}
        onClose={closeSort}
        onSelect={(v) => {
          setSortBy(v);
          setSortOpen(false);
          scrollToTop();
        }}
      />
    </View>
  );
}

