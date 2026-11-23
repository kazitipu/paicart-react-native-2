import React from 'react';
import { View, Text } from 'react-native';
import { Bell } from 'lucide-react-native';
import { Press, C, ORANGE } from '@/components/product/ui';

/* Bell button with an unread-count badge, for the dashboard top bar. The
   count comes from useNotifications() in the parent so the badge and the
   screen read the same live listener. */
export default function NotificationBell({ count = 0, onPress, size = 20 }) {
  const label = count > 0 ? `Notifications, ${count} unread` : 'Notifications';
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? '#f3f4f6' : '#f9fafb',
        borderWidth: 1,
        borderColor: C.gray100,
      })}
    >
      <Bell size={size} color={C.gray700} />
      {count > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -4,
            right: -5,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
            borderRadius: 9,
            backgroundColor: ORANGE,
            borderWidth: 2,
            borderColor: '#ffffff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '800' }}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </Press>
  );
}
