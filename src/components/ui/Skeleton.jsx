import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';

/* Replaces the web's `shimmer` keyframes (globals.css) and the copy of them
   DashboardLayout declared inline. A looping opacity pulse rather than a
   moving gradient: on native a gradient sweep needs a masked LinearGradient
   per skeleton block, which is a lot of overdraw for list placeholders. */
export function Skeleton({ className = '', style }) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      className={`bg-gray-200 rounded ${className}`}
      style={[{ opacity: pulse }, style]}
    />
  );
}

/* Product grid placeholder, matching the card shape used on Home and
   Collection. */
export function ProductCardSkeleton() {
  return (
    <View className="p-2">
      <Skeleton className="w-full aspect-square rounded-lg" />
      <Skeleton className="h-3 mt-2 w-full" />
      <Skeleton className="h-3 mt-1.5 w-2/3" />
      <Skeleton className="h-4 mt-2 w-1/2" />
    </View>
  );
}

export function ListRowSkeleton() {
  return (
    <View className="flex-row items-center p-3 gap-3">
      <Skeleton className="w-14 h-14 rounded-lg" />
      <View className="flex-1">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 mt-2 w-1/2" />
      </View>
    </View>
  );
}

export default Skeleton;
