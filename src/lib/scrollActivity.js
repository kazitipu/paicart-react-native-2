import { makeMutable } from 'react-native-reanimated';

/* ─── "Is a list being scrolled right now?" — on the UI thread ───
 * Every scroll handler stamps the time (markScrolling); decorative loops
 * (header shimmer, search-bar typewriter) check isScrollingNow() and hold
 * still meanwhile, so the GPU spends a scrolling frame on the scroll alone.
 * Measured on a Redmi 15 at 120 Hz: with loops running, frames sat at
 * ~19 ms median instead of the 8.3 ms budget. */
const lastScrollAt = makeMutable(0);
const QUIET_MS = 250;

export function markScrolling() {
  'worklet';
  lastScrollAt.value = Date.now();
}

export function isScrollingNow() {
  'worklet';
  return Date.now() - lastScrollAt.value < QUIET_MS;
}
