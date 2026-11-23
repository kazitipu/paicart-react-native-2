import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Bell, BellOff, CheckCheck, ChevronDown, ChevronUp } from 'lucide-react-native';
import EmptyState from '@/components/ui/EmptyState';
import useNotifications from '@/lib/useNotifications';
import useNow from '@/lib/useNow';
import { markNotificationRead, markAllNotificationsRead } from '@/lib/firebaseUtils';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

/* In-app notifications the Paicart team sends to this customer from the admin
   panel (`notifications` collection, one doc per recipient). Distinct from
   Notices, which are public announcements shown to everyone.

   Tapping a card marks it read and, when the body is long, expands it. The
   list is live (onSnapshot), so read state and new arrivals update in place. */

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* Built by hand rather than toLocaleString — Hermes' Intl data varies by build. */
const absoluteTime = (ms) => {
  const d = new Date(ms);
  const h = d.getHours();
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
};

const relativeTime = (ms, now) => {
  const diff = Math.max(0, now - ms);
  if (diff < MIN) return 'Just now';
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return null;
};

const formatTime = (time, now) => {
  const ms = Number(time);
  if (!ms) return '';
  const rel = relativeTime(ms, now);
  return rel ? `${rel} · ${absoluteTime(ms)}` : absoluteTime(ms);
};

const COLLAPSED_LINES = 3;
const isLong = (body) => {
  const s = String(body || '');
  return s.length > 140 || s.split('\n').length > COLLAPSED_LINES;
};

function NotificationCard({ item, now, expanded, onPress }) {
  const unread = !item.read;
  const long = isLong(item.body);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: long ? expanded : undefined }}
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.title || 'Notification'}`}
      className={`flex-row gap-3 rounded-xl border px-4 py-3.5 mb-2.5 active:opacity-80 ${
        unread ? 'bg-primary-tint border-orange-200' : 'bg-white border-gray-100'
      }`}
    >
      <View className={`w-9 h-9 rounded-full items-center justify-center ${unread ? 'bg-white' : 'bg-gray-100'}`}>
        <Bell size={15} color={unread ? colors.primary : '#94a3b8'} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-start gap-2">
          <Text
            className={`flex-1 text-smd text-foreground ${unread ? 'font-bold' : 'font-medium'}`}
            numberOfLines={expanded ? undefined : 2}
          >
            {item.title || 'Notification'}
          </Text>
          {unread && <View className="w-2 h-2 rounded-full bg-primary mt-1.5" />}
        </View>
        {!!item.body && (
          <Text
            className={`text-xs mt-1 leading-5 ${unread ? 'text-gray-700' : 'text-gray-500'}`}
            numberOfLines={expanded ? undefined : COLLAPSED_LINES}
          >
            {item.body}
          </Text>
        )}
        <View className="flex-row items-center justify-between mt-1.5">
          <Text className="text-xxs text-gray-400">{formatTime(item.time, now)}</Text>
          {long && (
            <View className="flex-row items-center gap-0.5">
              <Text className="text-xxs font-semibold text-primary">{expanded ? 'Show less' : 'Read more'}</Text>
              {expanded ? <ChevronUp size={12} color={colors.primary} /> : <ChevronDown size={12} color={colors.primary} />}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function Notifications() {
  const navigation = useNavigation();
  const { uid, items, unreadCount, loading, error } = useNotifications();
  const now = useNow(60 * 1000);
  const [expanded, setExpanded] = useState({});
  const [markingAll, setMarkingAll] = useState(false);

  const onPressItem = useCallback((item) => {
    if (isLong(item.body)) setExpanded((e) => ({ ...e, [item.id]: !e[item.id] }));
    if (!item.read) {
      markNotificationRead(item.id).catch((e) => {
        console.error('markNotificationRead', e);
        toast.error('Could not mark as read.');
      });
    }
  }, []);

  const onMarkAll = useCallback(async () => {
    if (markingAll) return;
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(ids);
    } catch (e) {
      console.error('markAllNotificationsRead', e);
      toast.error('Could not mark all as read.');
    }
    setMarkingAll(false);
  }, [items, markingAll]);

  let empty;
  if (!uid) {
    empty = (
      <EmptyState
        icon={<BellOff size={36} color={colors.muted} />}
        title="Sign in to see notifications"
        subtitle="Messages from the Paicart team about your account will appear here."
        actionLabel="Sign in"
        onAction={() => navigation.navigate('Login', { returnTo: 'Notifications' })}
      />
    );
  } else if (loading) {
    empty = (
      <View className="py-16 items-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  } else if (error) {
    empty = (
      <EmptyState
        icon={<BellOff size={36} color={colors.muted} />}
        title="Could not load notifications"
        subtitle="Please check your connection and try again later."
      />
    );
  } else {
    empty = (
      <EmptyState
        icon={<Bell size={36} color={colors.muted} />}
        title="No notifications yet"
        subtitle="Messages from the Paicart team about your account will appear here."
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1" accessibilityLabel="Go back">
            <ArrowLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <View className="flex-1">
          <Text className="text-md font-bold text-foreground">Notifications</Text>
          {unreadCount > 0 && <Text className="text-2xs text-gray-400">{unreadCount} unread</Text>}
        </View>
        {unreadCount > 0 && (
          <Pressable
            onPress={onMarkAll}
            disabled={markingAll}
            hitSlop={6}
            className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary-tint active:opacity-70"
          >
            {markingAll ? <ActivityIndicator size="small" color={colors.primary} /> : <CheckCheck size={14} color={colors.primary} />}
            <Text className="text-xs font-semibold text-primary">Mark all as read</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => String(n.id)}
        extraData={{ expanded, now }}
        contentContainerStyle={{ padding: 12, paddingBottom: 24, flexGrow: 1 }}
        ListEmptyComponent={empty}
        renderItem={({ item }) => (
          <NotificationCard item={item} now={now} expanded={!!expanded[item.id]} onPress={() => onPressItem(item)} />
        )}
      />
    </SafeAreaView>
  );
}
