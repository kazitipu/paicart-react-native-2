import { makeMutable, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { isScrollingNow } from '@/lib/scrollActivity';

/* ─── One clock for every decorative animation ───
 * The header shimmer, search sparkle, WhatsApp ring, Home-tab halo, Home's
 * floating icons and pulsing dots each used to loop on their own timing.
 * Even with rests, being out of sync meant something was always moving, so
 * the screen redrew every frame (measured on a Redmi 15: Home drew ~2,200
 * frames in 10 idle seconds; Categories, with no loops, drew 0).
 *
 * Now they all read this one value: `p` sweeps 0 → 1 over PLAY_MS, then sits
 * at 1 for REST_MS. Every decoration is written so p = 1 is its still state,
 * so between plays nothing changes and nothing redraws. The restart is a
 * plain JS timer, so during the rest no animation is running at all.
 *
 * decorPhase() also reads as resting (1) while a list is being scrolled. */
const PLAY_MS = 2200;
const REST_MS = 6000;

const clock = makeMutable(1);
let timer = null;

const play = () => {
  clock.value = withSequence(
    withTiming(0, { duration: 0 }),
    withTiming(1, { duration: PLAY_MS, easing: Easing.linear }),
  );
};

/* Called once from App (not when the OS asks for reduced motion). */
export function startDecorClock() {
  if (timer) return;
  play();
  timer = setInterval(play, PLAY_MS + REST_MS);
}

export function stopDecorClock() {
  if (timer) clearInterval(timer);
  timer = null;
  clock.value = 1;
}

/* 0 → 1 during a play, 1 at rest or while scrolling. Worklet. */
export function decorPhase() {
  'worklet';
  return isScrollingNow() ? 1 : clock.value;
}

/* 0 → 1 → 0 once per play (pulses, floats). Worklet. */
export function decorWave() {
  'worklet';
  return Math.sin(Math.PI * decorPhase());
}

/* An expanding ring that fades out over a play: { opacity, scale }. Worklet. */
export function decorRing(maxOpacity, grow) {
  'worklet';
  const p = decorPhase();
  return {
    opacity: p <= 0 || p >= 1 ? 0 : maxOpacity * (1 - p),
    transform: [{ scale: 1 + grow * p }],
  };
}
