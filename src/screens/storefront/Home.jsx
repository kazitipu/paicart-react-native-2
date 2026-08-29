import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, Image, FlatList, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import {
  ChevronRight, ChevronDown, Ship, Package, MapPin, Truck, Shield, BadgeCheck,
} from 'lucide-react-native';
import {
  getAllBannersRedux, getAllCampaignsRedux, getCurrencyRedux, getSiteDiscountRedux,
} from '@/store/actions';
import { searchProducts } from '@/lib/api';
import { QUICK_CATEGORIES, CATEGORY_SECTIONS, HOME_FAQS, HOME_FAQ_PROHIBITED } from '@/data/homeContent';
import ProductCard from '@/components/ProductCard';
import ProductImage from '@/components/ui/ProductImage';
import { ProductCardSkeleton } from '@/components/ui/Skeleton';
import SearchBar from '@/components/SearchBar';
import colors from '@/theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const GUTTER = 12;
const CARD_W = (SCREEN_W - GUTTER * 3) / 2;

const SERVICES = [
  { label: 'Ship For Me', sub: 'You buy, we ship', screen: 'ShipForMeForm', Icon: Ship, color: colors.primary },
  { label: 'Buy For Me', sub: 'We buy for you', screen: 'BuyForMe', Icon: Package, color: '#7c3aed' },
  { label: 'Track Order', sub: 'Live parcel status', screen: 'TrackOrder', Icon: MapPin, color: '#1677FF' },
];

const TRUST = [
  { label: 'Air & Sea freight', Icon: Truck },
  { label: 'Verified sellers', Icon: BadgeCheck },
  { label: 'Refund protection', Icon: Shield },
];

function SectionHeading({ title, onSeeAll }) {
  return (
    <View className="flex-row items-center justify-between px-3 pb-2.5">
      <Text className="text-md font-extrabold text-foreground">{title}</Text>
      <Pressable onPress={onSeeAll} hitSlop={8} className="flex-row items-center">
        <Text className="text-tiny font-semibold text-brand">See all</Text>
        <ChevronRight size={13} color={colors.brand} />
      </Pressable>
    </View>
  );
}

/* Each section fetches independently. The upstream is flaky enough that the
   web wrapped every one in two retries 1.5s apart — kept, via getWithRetry —
   and a section that genuinely returns nothing hides itself rather than
   showing an empty shelf. */
function CategorySection({ title, categoryId, taka }) {
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);

    searchProducts(categoryId)
      .then((res) => {
        if (!alive) return;
        const list = res.data?.products;
        if (list?.length > 0) setProducts(list.slice(0, 12));
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setFailed(true);
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [categoryId, attempt]);

  if (!loading && !failed && products.length === 0) return null;

  const seeAll = () => navigation.navigate('Collection', { id: categoryId });

  if (failed) {
    return (
      <View className="py-6">
        <SectionHeading title={title} onSeeAll={seeAll} />
        <View className="items-center gap-3 py-6">
          <Text className="text-2xl">📦</Text>
          <Text className="text-smd text-gray-400">Couldn't load products</Text>
          <Pressable
            onPress={() => setAttempt((a) => a + 1)}
            className="border border-brand rounded-full px-4 py-1.5"
          >
            <Text className="text-tiny font-semibold text-brand">Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="py-5">
      <SectionHeading title={title} onSeeAll={seeAll} />
      <FlatList
        horizontal
        data={loading ? Array.from({ length: 6 }) : products}
        keyExtractor={(item, i) => (item?.id ? String(item.id) : `s-${i}`)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: GUTTER }}
        renderItem={({ item }) =>
          loading ? (
            <View style={{ width: CARD_W }}>
              <ProductCardSkeleton />
            </View>
          ) : (
            <ProductCard product={item} taka={taka} width={CARD_W} />
          )
        }
      />
    </View>
  );
}

function FaqItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <View className="border-b border-gray-100">
      <Pressable onPress={() => setOpen((o) => !o)} className="flex-row items-start gap-2 py-3">
        <Text className="flex-1 text-smd font-semibold text-foreground">{item.q}</Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }], marginTop: 2 }}>
          <ChevronDown size={15} color={colors.muted} />
        </View>
      </Pressable>
      {open && (
        <View className="pb-3">
          <Text className="text-smd text-gray-600 leading-relaxed">{item.a}</Text>
          {item.prohibited && (
            <View className="flex-row flex-wrap gap-1.5 mt-3">
              {HOME_FAQ_PROHIBITED.map((p) => (
                <View key={p} className="bg-red-50 border border-red-100 rounded-full px-2.5 py-1">
                  <Text className="text-2xs text-brand">{p}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function Home() {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const banners = useSelector((s) => s.orders?.banners || []);
  const campaigns = useSelector((s) => s.orders?.campaigns || []);
  const taka = useSelector((s) => s.user?.currency?.taka);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    dispatch(getAllBannersRedux());
    dispatch(getAllCampaignsRedux());
    dispatch(getCurrencyRedux());
    dispatch(getSiteDiscountRedux());
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
    setTimeout(() => setRefreshing(false), 800);
  }, [load]);

  /* Campaigns carry an expiry the admin sets; an elapsed one must not keep
     advertising a rate that no longer applies. */
  const activeCampaigns = campaigns.filter(
    (c) => !c.expiryDate || new Date(c.expiryDate).getTime() > Date.now(),
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <SearchBar />
      <ScrollView
        contentContainerClassName="pb-8"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Banners */}
        {banners.length > 0 && (
          <FlatList
            horizontal
            pagingEnabled
            data={banners}
            keyExtractor={(b, i) => String(b.id ?? i)}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_W }} className="px-3 pt-3">
                <ProductImage
                  uri={item.imageUrl || item.image}
                  className="w-full rounded-xl"
                  style={{ height: SCREEN_W * 0.42 }}
                  resizeMode="cover"
                />
              </View>
            )}
          />
        )}

        {/* Campaigns */}
        {activeCampaigns.length > 0 && (
          <View className="pt-4">
            <SectionHeading title="Campaigns" onSeeAll={() => navigation.navigate('Categories')} />
            <FlatList
              horizontal
              data={activeCampaigns}
              keyExtractor={(c, i) => String(c.id ?? i)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: GUTTER, gap: GUTTER }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() =>
                    navigation.navigate('Collection', {
                      id: item.name,
                      campaignName: item.name,
                      campaignImage: item.imageUrl,
                    })
                  }
                  className="rounded-xl overflow-hidden bg-white border border-gray-100"
                  style={{ width: SCREEN_W * 0.6 }}
                >
                  <ProductImage
                    uri={item.imageUrl}
                    className="w-full"
                    style={{ height: SCREEN_W * 0.3 }}
                  />
                  <Text className="text-tiny font-bold text-foreground p-2.5" numberOfLines={1}>
                    {item.name}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        )}

        {/* Services */}
        <View className="flex-row gap-2 px-3 pt-5">
          {SERVICES.map((s) => (
            <Pressable
              key={s.screen}
              onPress={() => navigation.navigate('MoreTab', { screen: s.screen })}
              className="flex-1 bg-white rounded-xl border border-gray-100 p-3 items-center active:opacity-80"
            >
              <s.Icon size={20} color={s.color} />
              <Text className="text-3xs font-bold text-foreground mt-1.5 text-center">{s.label}</Text>
              <Text className="text-xxs text-gray-400 text-center" numberOfLines={1}>
                {s.sub}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Quick categories */}
        <View className="pt-6">
          <Text className="text-md font-extrabold text-foreground px-3 pb-2.5">Shop by Category</Text>
          <View className="flex-row flex-wrap px-2">
            {QUICK_CATEGORIES.map((c) => (
              <Pressable
                key={c.name}
                onPress={() =>
                  navigation.navigate('Collection', { id: c.href.split('/').pop() })
                }
                className="w-1/4 items-center py-3 px-1"
              >
                <View
                  className="w-12 h-12 rounded-2xl items-center justify-center"
                  style={{ backgroundColor: `${c.color}18` }}
                >
                  <c.Icon size={20} color={c.color} />
                </View>
                <Text className="text-xxs text-gray-600 mt-1.5 text-center" numberOfLines={1}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Product shelves */}
        {CATEGORY_SECTIONS.map((s) => (
          <CategorySection key={s.categoryId} title={s.title} categoryId={s.categoryId} taka={taka} />
        ))}

        {/* Trust bar */}
        <View className="flex-row justify-around bg-white border-y border-gray-100 py-4 mt-2">
          {TRUST.map((t) => (
            <View key={t.label} className="items-center gap-1.5 px-2">
              <t.Icon size={18} color={colors.primary} />
              <Text className="text-xxs text-gray-500 text-center">{t.label}</Text>
            </View>
          ))}
        </View>

        {/* FAQ */}
        <View className="px-3 pt-6">
          <Text className="text-md font-extrabold text-foreground pb-1">সাধারণ জিজ্ঞাসা</Text>
          {HOME_FAQS.map((f, i) => (
            <FaqItem key={i} item={f} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
