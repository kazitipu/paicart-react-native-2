import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { ArrowLeft, Bell, ChevronRight } from 'lucide-react-native';
import EmptyState from '@/components/ui/EmptyState';
import { getAllNoticesRedux } from '@/store/actions';
import colors from '@/theme/colors';

export default function Notices() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const notices = useSelector((s) => s.notices?.notices || []);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(getAllNoticesRedux());
  }, [dispatch]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <Text className="flex-1 text-md font-bold text-foreground">Notices</Text>
      </View>

      <FlatList
        data={notices}
        keyExtractor={(n, i) => String(n.id ?? i)}
        contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              dispatch(getAllNoticesRedux());
              setTimeout(() => setRefreshing(false), 700);
            }}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Bell size={36} color={colors.muted} />}
            title="No notices"
            subtitle="Announcements from Paicart will appear here."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('NoticeDetail', { noticeId: item.id })}
            className="flex-row items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3.5 mb-2.5"
          >
            <View className="w-9 h-9 rounded-full bg-primary-tint items-center justify-center">
              <Bell size={15} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-smd font-semibold text-foreground" numberOfLines={2}>
                {item.title || item.subject}
              </Text>
              {!!item.date && <Text className="text-xxs text-gray-400 mt-0.5">{item.date}</Text>}
            </View>
            <ChevronRight size={16} color="#d1d5db" />
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
