import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import EmptyState from '@/components/ui/EmptyState';
import { getSingleNotice } from '@/lib/firebaseUtils';
import colors from '@/theme/colors';

export default function NoticeDetail() {
  const navigation = useNavigation();
  const route = useRoute();
  const { noticeId } = route.params || {};
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    /* getSingleNotice has no try/catch of its own, so it is guarded here. */
    getSingleNotice(noticeId)
      .then((n) => alive && setNotice(n || null))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [noticeId]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <Text className="flex-1 text-md font-bold text-foreground">Notice</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !notice ? (
        <EmptyState title="Notice not found" />
      ) : (
        <ScrollView contentContainerClassName="p-3 pb-10">
          <View className="bg-white rounded-2xl border border-gray-100 p-4">
            <Text className="text-md font-bold text-foreground">
              {notice.title || notice.subject}
            </Text>
            {!!notice.date && <Text className="text-2xs text-gray-400 mt-1">{notice.date}</Text>}
            {/* Whitespace is preserved — the admin composes these as plain
                text with its own line breaks. */}
            <Text className="text-smd text-gray-600 leading-relaxed mt-3">
              {notice.body || notice.description || notice.message}
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
