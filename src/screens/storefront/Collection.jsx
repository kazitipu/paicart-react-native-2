import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, ActivityIndicator, Dimensions, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { ArrowLeft, SlidersHorizontal, Crop, Check } from 'lucide-react-native';
import ProductCard from '@/components/ProductCard';
import ProductImage from '@/components/ui/ProductImage';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import SearchBar from '@/components/SearchBar';
import { setSearchedProductsArray, emptySearchedProductsArray } from '@/store/actions';
import { searchByImage, getVendorProducts, searchProducts, uploadSearchImage } from '@/lib/api';
import {
  getImageSearchInstances, appendImageSearchInstance, resizeAndCompressToBase64,
} from '@/lib/imageUtils';
import { cropImage } from '@/lib/picker';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const GUTTER = 12;
const CARD_W = (SCREEN_W - GUTTER * 3) / 2;

const SORTS = [
  { key: 'Default', label: 'Best match' },
  { key: 'price_asc', label: 'Price: low to high' },
  { key: 'price_desc', label: 'Price: high to low' },
  { key: 'sales_desc', label: 'Best selling' },
];

const titleize = (s) =>
  String(s || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

/* Three listing modes behind one screen, picked by which params are present:
     imageUrl -> image search   (id is the sentinel 'img_uploads')
     shopName -> vendor listing (id is the vendorId)
     otherwise-> keyword search (id is the keyword)
   Same shape as the web, where the mode came from the query string. */
export default function Collection() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  const { id, imageUrl, shopName, campaignName } = route.params || {};

  const products = useSelector((s) => s.searchedProducts?.products || []);
  const totalFound = useSelector((s) => s.searchedProducts?.totalFound || 0);
  const totalResults = useSelector((s) => s.searchedProducts?.totalResults || 0);
  const storedKey = useSelector((s) => s.searchedProducts?.searchKey);
  const taka = useSelector((s) => s.user?.currency?.taka);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sortBy, setSortBy] = useState('Default');
  const [sortOpen, setSortOpen] = useState(false);
  const [instances, setInstances] = useState([]);
  const [activeImgId, setActiveImgId] = useState(imageUrl || null);
  const [cropping, setCropping] = useState(false);

  const pageRef = useRef(1);
  const currentKey = `${id}|${imageUrl || ''}|${shopName || ''}`;

  const doFetch = useCallback(
    async (pageNum, sort, append) => {
      const params = { framePosition: pageNum, filterByCategory: sort || 'Default' };
      try {
        let response;
        if (activeImgId) {
          response = (await searchByImage(activeImgId, params)).data;
        } else if (shopName) {
          response = (await getVendorProducts({ vendorId: id, ...params })).data;
        } else {
          response = (await searchProducts(id, params)).data;
        }

        const list = response?.products;
        if (list?.length > 0) {
          const merged = append ? totalResults + list.length : list.length;
          /* The upstream has no total-pages field, so "more" is inferred: a
             full-looking page, capped at 300 results. Same rule as the web. */
          const more = list.length >= 10 && merged < 300;
          dispatch(
            setSearchedProductsArray(
              merged,
              list,
              response.totalRecords || 0,
              currentKey,
              pageNum,
              more,
            ),
          );
          setHasMore(more);
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
      }
    },
    [id, activeImgId, shopName, dispatch, totalResults, currentKey],
  );

  /* A new query resets the cached list; returning to an already-loaded one
     reuses it, which is what preserves scroll position on back-navigation. */
  useEffect(() => {
    pageRef.current = 1;
    setHasMore(true);
    setNotFound(false);
    if (storedKey !== currentKey) {
      dispatch(emptySearchedProductsArray());
      setLoading(true);
      doFetch(1, sortBy, false);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, activeImgId]);

  useEffect(() => {
    setInstances(getImageSearchInstances());
  }, [activeImgId]);

  const changeSort = (key) => {
    setSortOpen(false);
    if (key === sortBy) return;
    setSortBy(key);
    pageRef.current = 1;
    setHasMore(true);
    setLoading(true);
    dispatch(emptySearchedProductsArray());
    doFetch(1, key, false);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    pageRef.current += 1;
    doFetch(pageRef.current, sortBy, true);
  };

  /* Re-crop loop: crop an existing instance, upload the crop as a new one, and
     search again from it. Every crop stays in the strip so the customer can
     jump back to the original. */
  const recrop = async () => {
    const source = instances.find((i) => i.id === activeImgId) || instances[0];
    if (!source?.preview || cropping) return;
    setCropping(true);
    try {
      const cropped = await cropImage(source.preview);
      if (cropped) {
        const { base64, uri } = await resizeAndCompressToBase64(cropped.uri);
        const newId = await uploadSearchImage(base64);
        if (!newId) throw new Error('No image id');
        setInstances(appendImageSearchInstance(newId, uri));
        dispatch(emptySearchedProductsArray());
        setActiveImgId(newId);
      }
    } catch {
      toast.error('Could not crop that image.');
    }
    setCropping(false);
  };

  const heading = campaignName || (shopName ? titleize(shopName) : activeImgId ? 'Image search' : titleize(id));

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2 bg-white">
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <Text className="flex-1 text-md font-bold text-foreground" numberOfLines={1}>
          {heading}
        </Text>
      </View>

      {!activeImgId && <SearchBar initialValue="" />}

      {/* Image-search instance strip */}
      {activeImgId && instances.length > 0 && (
        <View className="flex-row items-center gap-2 px-3 py-2 bg-white border-b border-gray-100">
          <FlatList
            horizontal
            data={instances}
            keyExtractor={(i) => String(i.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => {
              const active = item.id === activeImgId;
              return (
                <Pressable
                  onPress={() => {
                    if (item.id !== activeImgId) {
                      dispatch(emptySearchedProductsArray());
                      setActiveImgId(item.id);
                    }
                  }}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 ${active ? 'border-primary' : 'border-gray-200'}`}
                >
                  <ProductImage uri={item.preview} className="w-full h-full" fallbackIconSize={14} />
                  {active && (
                    <View className="absolute bottom-0 right-0 bg-primary rounded-tl px-0.5">
                      <Check size={9} color="#ffffff" strokeWidth={3} />
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
          <Pressable
            onPress={recrop}
            disabled={cropping}
            className="flex-row items-center gap-1 rounded-full bg-primary-tint px-3 py-2"
          >
            {cropping ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Crop size={13} color={colors.primary} />
            )}
            <Text className="text-2xs font-bold text-primary">Crop</Text>
          </Pressable>
        </View>
      )}

      {/* Stats + sort */}
      <View className="flex-row items-center justify-between px-3 py-2">
        <Text className="text-2xs text-gray-500">
          {totalFound > 0 ? `${totalFound.toLocaleString()} results` : `${products.length} shown`}
        </Text>
        <Pressable
          onPress={() => setSortOpen((o) => !o)}
          className="flex-row items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5"
        >
          <SlidersHorizontal size={12} color={colors.muted} />
          <Text className="text-2xs font-semibold text-gray-600">
            {SORTS.find((s) => s.key === sortBy)?.label}
          </Text>
        </Pressable>
      </View>

      {sortOpen && (
        <View className="bg-white border-y border-gray-100">
          {SORTS.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => changeSort(s.key)}
              className="flex-row items-center justify-between px-4 py-3"
            >
              <Text className={`text-smd ${s.key === sortBy ? 'text-primary font-bold' : 'text-gray-600'}`}>
                {s.label}
              </Text>
              {s.key === sortBy && <Check size={14} color={colors.primary} />}
            </Pressable>
          ))}
        </View>
      )}

      {loading ? (
        <FlatList
          data={Array.from({ length: 8 })}
          numColumns={2}
          keyExtractor={(_, i) => `sk-${i}`}
          columnWrapperStyle={{ gap: GUTTER, paddingHorizontal: GUTTER }}
          contentContainerStyle={{ gap: GUTTER, paddingVertical: GUTTER }}
          renderItem={() => (
            <View style={{ width: CARD_W }}>
              <ProductCardSkeleton />
            </View>
          )}
        />
      ) : notFound || products.length === 0 ? (
        <EmptyState
          title="No products found"
          subtitle="Try a different keyword, or search with a photo."
          actionLabel="Back to Home"
          onAction={() => navigation.navigate('Home')}
        />
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(p, i) => `${p.id}-${i}`}
          columnWrapperStyle={{ gap: GUTTER, paddingHorizontal: GUTTER }}
          contentContainerStyle={{ gap: GUTTER, paddingVertical: GUTTER, paddingBottom: 32 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          removeClippedSubviews
          renderItem={({ item }) => <ProductCard product={item} taka={taka} width={CARD_W} />}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-6">
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : !hasMore ? (
              <Text className="text-2xs text-gray-400 text-center py-6">
                That's everything we found.
              </Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
