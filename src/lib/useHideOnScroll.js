import { useState } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { markScrolling } from '@/lib/scrollActivity';

/* The web Header's Facebook-style hide-on-scroll: always shown within 80px of
 * the top, hidden after a >5px downward move, shown again after a >5px upward
 * move, sliding over 300ms ease-out.
 *
 * Returns the scroll handler to attach, the live scroll offset (for anything
 * that tracks scroll, like a sticky toolbar), a `hidden` shared value (0|1),
 * a JS-side `isHidden` flag (to pause decorative loops), the header's
 * measured height, and an animated style for the header wrapper. */
export default function useHideOnScroll(initialHeight = 118) {
  const [headerH, setHeaderHState] = useState(initialHeight);
  const [isHidden, setIsHidden] = useState(false);
  const hidden = useSharedValue(0);
  const lastY = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const headerHV = useSharedValue(initialHeight);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      markScrolling();
      const y = e.contentOffset.y;
      scrollY.value = y;
      const delta = y - lastY.value;
      let next = hidden.value;
      if (y < 80) next = 0;
      else if (delta > 5) next = 1;
      else if (delta < -5) next = 0;
      if (next !== hidden.value) {
        hidden.value = next;
        runOnJS(setIsHidden)(next === 1);
      }
      lastY.value = y;
    },
  });

  const headerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withTiming(hidden.value ? -headerHV.value : 0, {
          duration: 300,
          easing: Easing.out(Easing.ease),
        }),
      },
    ],
  }));

  const setHeaderH = (h) => {
    setHeaderHState(h);
    headerHV.value = h + 24; // also clear the drop shadow
  };

  return { onScroll, scrollY, hidden, isHidden, headerH, setHeaderH, headerStyle };
}
