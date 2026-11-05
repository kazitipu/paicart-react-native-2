import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';

/* A clock for countdowns: returns Date.now(), refreshed every `intervalMs`.
 *
 * It only ticks while its screen is focused. React Navigation keeps every
 * screen in a stack (and every visited tab) mounted, so a plain setInterval
 * keeps re-rendering cards nobody can see. With a few screens stacked, those
 * renders added up to a JS thread that was busy 100% of the time and taps that
 * took seconds to land. On refocus the clock jumps straight to the current
 * time. Pass `enabled = false` once the countdown no longer matters. */
export default function useNow(intervalMs = 1000, enabled = true) {
  const isFocused = useIsFocused();
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (!enabled || !isFocused) return undefined;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, enabled, isFocused]);

  return now;
}
