import React, { useState } from 'react';
import { View, Text, Pressable, LayoutAnimation, Platform, UIManager } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import colors from '@/theme/colors';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* Each order/booking card on the web carried three independent collapsibles —
   items, weight breakdown, bill — reimplemented inline on every screen. One
   component instead. */
export default function Collapsible({
  title,
  right = null,
  defaultOpen = false,
  children,
  className = '',
  headerClassName = '',
}) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View className={className}>
      <Pressable
        onPress={toggle}
        className={`flex-row items-center justify-between py-2.5 ${headerClassName}`}
      >
        <Text className="text-smd font-bold text-foreground flex-1">{title}</Text>
        <View className="flex-row items-center gap-2">
          {right}
          <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
            <ChevronDown size={16} color={colors.muted} />
          </View>
        </View>
      </Pressable>
      {open && <View className="pb-2">{children}</View>}
    </View>
  );
}
