import React, { useId, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { decorPhase } from '@/lib/decorClock';

/* The web header's shimmer: a half-width translucent white band that travels
 * across its container (globals.css hdrSweep / hdrSweepSkewed, and the
 * banner skeleton's bannerShimmer). Same geometry: the band is 50% of the
 * container and travels -120% → 260% of its own width.
 *
 * Purely decorative, so it is pointerEvents="none", respects the OS
 * reduce-motion setting, and stops while `paused` is true.
 *
 * Performance: the web loops it forever. Here it rides the shared decor
 * clock (lib/decorClock) — one pass together with every other decoration,
 * then a rest with the band parked off-screen, and still while a list
 * scrolls — so a budget phone is not redrawing every frame. A `duration`
 * prop from callers is ignored; the clock sets the pace. */
export default function Sweep({
  opacity = 0.28,
  skew = false,
  paused = false,
  bandRatio = 0.5,
}) {
  const reduceMotion = useReducedMotion();
  const [w, setW] = useState(0);
  const gradientId = `sweep${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const still = paused || reduceMotion;

  const band = w * bandRatio;
  const style = useAnimatedStyle(() => {
    const p = still ? 1 : decorPhase(); // p = 1: parked past the right edge
    return {
      transform: [{ translateX: band * (-1.2 + 3.8 * p) }, ...(skew ? [{ skewX: '-18deg' }] : [])],
    };
  }, [still, band, skew]);

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      className="overflow-hidden"
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 && !reduceMotion && (
        <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: band }, style]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                <Stop offset="0.5" stopColor="#ffffff" stopOpacity={opacity} />
                <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}
