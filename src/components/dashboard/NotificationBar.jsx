import React from 'react';
import { View, Text } from 'react-native';
import { Bell, ChevronRight } from 'lucide-react-native';
import { C, ORANGE, Press } from '@/components/product/ui';
import useNotifications from '@/lib/useNotifications';
import useNow from '@/lib/useNow';

/* The bar at the very top of the dashboard Overview: unread count and the
   newest unread (else newest) in-app notification, opening the
   Notifications screen. Port of the website's components/NotificationBar.jsx.
   Hidden while signed out, and until the first snapshot arrives. */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const when = (ms, now) => {
  const t = Number(ms) || 0;
  if (!t) return '';
  const min = Math.round((now - t) / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = new Date(t);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`;
};

const RED = '#e62222';

export default function NotificationBar({ onPress }) {
  const { uid, items, unreadCount: unread, loading } = useNotifications();
  const now = useNow(60 * 1000, !!uid);
  if (!uid || loading) return null;
  const latest = items.find((n) => !n.read) || items[0];

  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={unread ? `${unread} unread notifications` : 'Notifications'}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: unread ? C.orange200 : C.gray100,
        backgroundColor: unread ? '#fff5ec' : '#ffffff',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: unread ? ORANGE : C.gray100,
        }}
      >
        <Bell size={17} color={unread ? '#ffffff' : C.gray500} />
        {unread > 0 && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              minWidth: 18,
              height: 18,
              paddingHorizontal: 4,
              borderRadius: 9,
              borderWidth: 2,
              borderColor: '#ffffff',
              backgroundColor: RED,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#ffffff' }}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.gray900 }}>Notifications</Text>
          {unread > 0 && (
            <View style={{ borderRadius: 999, backgroundColor: C.orange100, paddingHorizontal: 6, paddingVertical: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#E05900' }}>{unread} new</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 11, color: C.gray500, marginTop: 1 }} numberOfLines={1}>
          {latest ? (
            <>
              <Text style={latest.read ? null : { fontWeight: '600', color: C.gray700 }}>{latest.title || 'Paicart'}</Text>
              {latest.time ? ` · ${when(latest.time, now)}` : ''}
            </>
          ) : (
            "You're all caught up"
          )}
        </Text>
      </View>

      <ChevronRight size={16} color={C.gray400} />
    </Press>
  );
}
