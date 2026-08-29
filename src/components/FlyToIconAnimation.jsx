import React, { useEffect, useState, useCallback } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { on, EVENTS } from '@/lib/events';
import { imageSource } from '@/lib/cdn';

const DURATION = 750;
const SIZE = 64;

/* The web version injected a uniquely-named @keyframes rule into a <style> tag
 * per in-flight item, animated `position: fixed` thumbnails, and found its
 * landing target with document.getElementById('header-cart-btn'). None of that
 * exists here.
 *
 * The target is derived from the tab bar's known geometry instead of a DOM
 * lookup: Cart is tab 2 of 5 and the tab bar is pinned to the bottom, so the
 * landing point is computable without any cross-component ref plumbing. That
 * keeps this component decoupled — it subscribes to an event and needs nothing
 * else wired into it.
 */
function targetFor(target) {
  const { width, height } = Dimensions.get('window');
  const TAB_COUNT = 5;
  /* Cart is index 1, Home 2, Orders 3 — wishlist has no tab of its own and
     lives under Home, so it lands on the same place a cart flight would. */
  const index = target === 'wishlist' ? 2 : 1;
  const tabWidth = width / TAB_COUNT;
  return {
    x: tabWidth * index + tabWidth / 2,
    y: height - 40,
  };
}

function FlyingItem({ item, onDone }) {
  const from = item.rect
    ? { x: item.rect.x + item.rect.width / 2, y: item.rect.y + item.rect.height / 2 }
    : { x: Dimensions.get('window').width / 2, y: Dimensions.get('window').height / 2 };
  const to = targetFor(item.target);

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: DURATION, easing: Easing.bezier(0.4, 0, 0.6, 1) },
      (finished) => {
        if (finished) runOnJS(onDone)(item.id);
      },
    );
  }, [progress, onDone, item.id]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    /* A straight interpolation reads as a slide. Lifting the midpoint gives
       the arc the web version got from its keyframe's translate/scale pair. */
    const arcLift = Math.sin(p * Math.PI) * 90;
    return {
      transform: [
        { translateX: from.x + (to.x - from.x) * p - SIZE / 2 },
        { translateY: from.y + (to.y - from.y) * p - arcLift - SIZE / 2 },
        { scale: 1 - 0.75 * p },
      ],
      opacity: p > 0.85 ? (1 - p) / 0.15 : 1,
    };
  });

  const source = imageSource(item.imgUrl);
  if (!source) return null;

  return (
    <Animated.Image
      source={source}
      style={[styles.item, style]}
      resizeMode="cover"
    />
  );
}

export default function FlyToIconAnimation() {
  const [items, setItems] = useState([]);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  useEffect(
    () =>
      on(EVENTS.FLY_TO_ICON, (detail) => {
        setItems((prev) => [...prev, { ...detail, id: `${Date.now()}-${prev.length}` }]);
      }),
    [],
  );

  if (!items.length) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {items.map((item) => (
        <FlyingItem key={item.id} item={item} onDone={remove} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIZE,
    height: SIZE,
    borderRadius: 10,
  },
});
