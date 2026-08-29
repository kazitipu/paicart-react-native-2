import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { Search, ArrowLeft } from 'lucide-react-native';
import ProductCard from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import {
  setSearchedProductsArray, emptySearchedProductsArray, setSearchedProductDetail,
} from '@/store/actions';
import { searchTaobao } from '@/lib/api';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const GUTTER = 12;
const CARD_W = (SCREEN_W - GUTTER * 3) / 2;

/* Taobao keyword search. Note this hits alglimited.com, a DIFFERENT host from
   the rest of the catalogue — not a mistake, they are separate services.
   Tapping a result seeds singleProduct (whose reducer normalises the Taobao
   schema onto the 1688 one) before opening the detail screen. */
export default function TaobaoSearch() {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const products = useSelector((s) => s.searchedProducts?.products || []);
  const totalFound = useSelector((s) => s.searchedProducts?.totalFound || 0);
  const totalResults = useSelector((s) => s.searchedProducts?.totalResults || 0);
  const taka = useSelector((s) => s.user?.currency?.taka);

  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);

  const fetchPage = useCallback(
    async (term, page, append) => {
      try {
        const { data } = await searchTaobao(term, page);
        const list = data?.products || data?.result?.items || [];
        if (list.length > 0) {
          const merged = append ? totalResults + list.length : list.length;
          dispatch(setSearchedProductsArray(merged, list, data?.totalRecords || 0, term, page, list.length >= 10));
          setHasMore(list.length >= 10);
        } else {
          setHasMore(false);
        }
      } catch {
        toast.error('Search failed. Please try again.');
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [dispatch, totalResults],
  );

  const submit = () => {
    const term = q.trim();
    if (!term) return;
    setQuery(term);
    pageRef.current = 1;
    setHasMore(true);
    setLoading(true);
    dispatch(emptySearchedProductsArray());
    fetchPage(term, 1, false);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore || loading || !query) return;
    setLoadingMore(true);
    pageRef.current += 1;
    fetchPage(query, pageRef.current, true);
  };

  const open = (product) => {
    dispatch(setSearchedProductDetail(product, 'taobao'));
    navigation.navigate('ProductTaobao', { id: product.num_iid || product.id });
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2 bg-white border-b border-gray-100">
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <View className="flex-1 flex-row items-center bg-gray-100 rounded-full px-3">
          <Search size={15} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={submit}
            returnKeyType="search"
            placeholder="Search Taobao"
            placeholderTextColor="#9ca3af"
            className="flex-1 text-smd text-foreground py-2.5 px-2"
          />
        </View>
      </View>

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
      ) : products.length === 0 ? (
        <EmptyState
          title={query ? 'No products found' : 'Search Taobao'}
          subtitle={query ? 'Try a different keyword.' : 'Type a keyword to get started.'}
        />
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(p, i) => `${p.num_iid || p.id}-${i}`}
          columnWrapperStyle={{ gap: GUTTER, paddingHorizontal: GUTTER }}
          contentContainerStyle={{ gap: GUTTER, paddingVertical: GUTTER, paddingBottom: 32 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          ListHeaderComponent={
            totalFound > 0 ? (
              <Text className="text-2xs text-gray-500 px-1 pb-1">
                {totalFound.toLocaleString()} results
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => open(item)}>
              <ProductCard
                product={{
                  id: item.num_iid || item.id,
                  name: item.title || item.name,
                  pictures: item.pic_url ? [item.pic_url] : item.pictures,
                  salePrice: item.price || item.salePrice,
                  totalSold: item.total_sold,
                }}
                taka={taka}
                width={CARD_W}
              />
            </Pressable>
          )}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-6">
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
