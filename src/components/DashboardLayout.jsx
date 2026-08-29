import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import Avatar from '@/components/Avatar';
import colors from '@/theme/colors';

/* The web component carried three layouts at once: a mobile top bar, a desktop
 * breadcrumb strip and a 256px sticky sidebar holding the dashboard nav. Only
 * the first has a native equivalent — the tab bar and stack already provide
 * what the sidebar and breadcrumb did, and duplicating the nav inside every
 * screen would mean two competing back stacks.
 *
 * The web sidebar also only linked six of the dashboard's seventeen screens;
 * the rest were reachable only by deep link or from inside another page. Those
 * orphans are now reachable from the More tab and DashboardOverview.
 *
 * `mounted` gating is gone too: it existed because currentUser came from
 * localStorage-persisted Redux which is absent during SSR. MMKV is read
 * synchronously before the store is created, so the user is there on frame one.
 */
export default function DashboardLayout({
  children,
  title,
  showBack = true,
  headerAction = null,
  scroll = true,
  contentClassName = '',
}) {
  const navigation = useNavigation();
  const currentUser = useSelector((s) => s.user?.currentUser);

  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? { contentContainerClassName: `pb-8 ${contentClassName}`, keyboardShouldPersistTaps: 'handled' }
    : { className: `flex-1 ${contentClassName}` };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {showBack && navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ChevronLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <View className="flex-1">
          <Text className="text-md font-bold text-foreground" numberOfLines={1}>
            {title || 'Dashboard'}
          </Text>
          <Text className="text-2xs text-gray-400">Paicart Sourcing Hub</Text>
        </View>
        {headerAction || (
          <Avatar
            user={currentUser}
            sizeClass="w-8 h-8"
            textClass="text-smd"
            roundedClass="rounded-full"
            bgClass="bg-primary"
            ringClass=""
          />
        )}
      </View>

      <Body {...bodyProps}>{children}</Body>
    </SafeAreaView>
  );
}
