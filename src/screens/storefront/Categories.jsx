import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, SectionList, LayoutAnimation } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, ChevronDown } from 'lucide-react-native';
import { CATEGORY_TREE, ICON_BG } from '@/data/categoryTree';
import colors from '@/theme/colors';

/* On the web this was a 215px drawer pinned to the left of the storefront,
   permanently visible above 1024px and slid in over the page below it. A phone
   has no room for a persistent sidebar, so it becomes the Category tab's own
   screen — same tree, same links, no drawer mechanics, and none of the
   `toggle-categories` event plumbing or the `openCategoriesOnLoad`
   sessionStorage handshake the web needed to open it from another page. */

const QUICK_LINKS = [
  { label: '📦 Product Request', screen: 'BuyForMe', className: 'bg-violet-500' },
  { label: '🚢 Ship For Me', screen: 'ShipForMeForm', className: 'bg-orange-500' },
  { label: '📍 Track Order', screen: 'TrackOrder', className: 'bg-blue-500' },
  { label: '📋 How to Order', screen: 'HowToOrder', className: 'bg-emerald-500' },
];

function CategoryRow({ cat, iconClass, open, onToggle, onPickKeyword }) {
  return (
    <View className="border-b border-gray-100">
      <Pressable
        onPress={onToggle}
        className={`flex-row items-center gap-2.5 px-3 py-3 ${open ? 'bg-red-50' : ''}`}
      >
        <View className={`w-7 h-7 rounded-lg items-center justify-center ${iconClass}`}>
          <Text className="text-smd">{cat.icon}</Text>
        </View>
        <Text
          className={`text-tiny font-medium flex-1 ${open ? 'text-brand' : 'text-gray-700'}`}
        >
          {cat.id}
        </Text>
        {open ? (
          <ChevronDown size={12} color={colors.brand} />
        ) : (
          <ChevronRight size={12} color="#d1d5db" />
        )}
      </Pressable>

      {open && (
        <View className="bg-red-50/60 px-3 py-2.5 border-l-2 border-brand ml-4 mr-1">
          {cat.sub.map((group) => (
            <View key={group.label} className="mb-3">
              <Text className="text-xxs uppercase tracking-widest text-gray-400 font-bold mb-1.5">
                {group.label}
              </Text>
              <View className="flex-row flex-wrap gap-1">
                {group.items.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => onPickKeyword(item)}
                    className="bg-white border border-gray-200 rounded-full px-2 py-1 active:bg-brand"
                  >
                    <Text className="text-3xs text-gray-600">{item}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function Categories() {
  const navigation = useNavigation();
  const [openId, setOpenId] = useState(null);

  const toggle = useCallback((id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((cur) => (cur === id ? null : id));
  }, []);

  /* Chips carry the keyword as a route param rather than being URL-encoded
      into a path the way the web did (`/collection/${encodeURIComponent(item)}`)
      — navigation params need no escaping, and several keywords contain
      spaces. */
  const openKeyword = useCallback(
    (keyword) => navigation.navigate('HomeTab', { screen: 'Collection', params: { id: keyword } }),
    [navigation],
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-white">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-primary">
        <Text className="text-md leading-none">☰</Text>
        <Text className="text-white font-bold text-tiny tracking-widest uppercase flex-1">
          All Categories
        </Text>
      </View>

      <SectionList
        sections={[{ data: CATEGORY_TREE }]}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <CategoryRow
            cat={item}
            iconClass={ICON_BG[index % ICON_BG.length]}
            open={openId === item.id}
            onToggle={() => toggle(item.id)}
            onPickKeyword={openKeyword}
          />
        )}
        ListFooterComponent={
          <View className="p-3 border-t border-gray-100 bg-gray-50 flex-row flex-wrap">
            {QUICK_LINKS.map((l) => (
              <View key={l.screen} className="w-1/2 p-1">
                <Pressable
                  onPress={() => navigation.navigate('MoreTab', { screen: l.screen })}
                  className={`${l.className} rounded-lg py-2.5 px-2 active:opacity-80`}
                >
                  <Text className="text-3xs font-semibold text-white text-center">
                    {l.label}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        }
      />
    </SafeAreaView>
  );
}
