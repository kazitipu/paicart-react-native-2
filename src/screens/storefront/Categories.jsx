import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, SectionList, LayoutAnimation } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, ChevronDown } from 'lucide-react-native';
import { CATEGORY_TREE } from '@/data/categoryTree';
import CategoryIcon from '@/components/CategoryIcon';
import colors from '@/theme/colors';

/* On the web this was a 215px drawer pinned to the left of the storefront,
   permanently visible above 1024px and slid in over the page below it. A phone
   has no room for a persistent sidebar, so it becomes the Category tab's own
   screen — same tree, same links, no drawer mechanics, and none of the
   `toggle-categories` event plumbing or the `openCategoriesOnLoad`
   sessionStorage handshake the web needed to open it from another page. */


function CategoryRow({ cat, open, onToggle, onPickKeyword }) {
  return (
    <View className="border-b border-gray-100">
      <Pressable
        onPress={onToggle}
        className={`flex-row items-center gap-3 px-4 py-3 ${open ? 'bg-red-50' : ''}`}
      >
        <CategoryIcon id={cat.id} box={42} size={23} />
        <Text
          style={{ fontSize: 15.5, lineHeight: 20 }}
          className={`font-semibold flex-1 ${open ? 'text-brand' : 'text-gray-800'}`}
        >
          {cat.id}
        </Text>
        {open ? (
          <ChevronDown size={18} color={colors.brand} />
        ) : (
          <ChevronRight size={18} color="#c7cbd1" />
        )}
      </Pressable>

      {open && (
        <View className="bg-red-50/60 px-3 py-3 border-l-2 border-brand ml-5 mr-2">
          {cat.sub.map((group) => (
            <View key={group.label} className="mb-3">
              <Text style={{ fontSize: 11.5 }} className="uppercase tracking-widest text-gray-400 font-bold mb-2">
                {group.label}
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => onPickKeyword(item)}
                    className="bg-white border border-gray-200 rounded-full px-3 py-1.5 active:bg-brand"
                  >
                    <Text style={{ fontSize: 13.5 }} className="text-gray-700">{item}</Text>
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
      <View className="flex-row items-center gap-2 px-4 py-3 bg-primary">
        <Text style={{ fontSize: 18 }} className="text-white leading-none">☰</Text>
        <Text style={{ fontSize: 14.5 }} className="text-white font-bold tracking-widest uppercase flex-1">
          All Categories
        </Text>
      </View>

      <SectionList
        sections={[{ data: CATEGORY_TREE }]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CategoryRow
            cat={item}
            open={openId === item.id}
            onToggle={() => toggle(item.id)}
            onPickKeyword={openKeyword}
          />
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
}
