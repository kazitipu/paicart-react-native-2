import React from 'react';
import { View, Text, FlatList, Dimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Heart, ArrowLeft } from 'lucide-react-native';
import ProductCard from '@/components/ProductCard';
import EmptyState from '@/components/ui/EmptyState';
import colors from '@/theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const GUTTER = 12;
const CARD_W = (SCREEN_W - GUTTER * 3) / 2;

export default function Wishlist() {
  const navigation = useNavigation();
  const wishlist = useSelector((s) => s.wishlist?.wishlist || []);
  const currentUser = useSelector((s) => s.user?.currentUser);
  const taka = useSelector((s) => s.user?.currency?.taka);

  const isLoggedIn = currentUser && (currentUser.email || currentUser.displayName) && currentUser.email !== '';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <Text className="flex-1 text-md font-bold text-foreground">My Wishlist</Text>
      </View>

      {!isLoggedIn ? (
        <EmptyState
          icon={<Heart size={40} color={colors.muted} />}
          title="Sign in to see your wishlist"
          subtitle="Your saved products follow you across devices."
          actionLabel="Sign In"
          onAction={() => navigation.navigate('Login')}
        />
      ) : wishlist.length === 0 ? (
        <EmptyState
          icon={<Heart size={40} color={colors.muted} />}
          title="Nothing saved yet"
          subtitle="Tap the heart on any product to keep it here."
          actionLabel="Start browsing"
          onAction={() => navigation.navigate('Home')}
        />
      ) : (
        <FlatList
          data={wishlist}
          numColumns={2}
          keyExtractor={(p, i) => `${p.id}-${i}`}
          columnWrapperStyle={{ gap: GUTTER, paddingHorizontal: GUTTER }}
          contentContainerStyle={{ gap: GUTTER, paddingVertical: GUTTER, paddingBottom: 32 }}
          renderItem={({ item }) => <ProductCard product={item} taka={taka} width={CARD_W} />}
        />
      )}
    </SafeAreaView>
  );
}
