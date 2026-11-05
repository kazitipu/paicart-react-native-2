/* ─── Cheaper box-shadows on Android ───
 *
 * The UI ports the web's Tailwind shadows verbatim (~150 boxShadow styles,
 * most of them two-layer). On Android each layer is drawn with its own blur
 * pass, and on a budget GPU (measured on a Redmi 15 / Snapdragon SM6225 at
 * 120 Hz) the GPU alone took 9–12 ms a frame — over the whole 8.3 ms budget —
 * so scrolling ran at ~50 fps.
 *
 * Rather than edit every call site, this wraps React Native's boxShadow style
 * processor once at startup:
 *   - small and inset shadows (blur ≤ 8: Tailwind sm / base / md / inner, the
 *     card and badge shadows) are dropped — they are barely visible, and the
 *     cards already carry a hairline border;
 *   - larger ones (sheets, floating buttons, the orange CTA glow) keep only
 *     their widest layer, with the blur capped at 20.
 * iOS draws shadows cheaply and keeps them exactly as written.
 *
 * Must run before the first render (index.js), because view configs read the
 * style attribute table when they are created. */
import { Platform, StyleSheet, LogBox } from 'react-native';
import processBoxShadow from 'react-native/Libraries/StyleSheet/processBoxShadow';

const SMALL_BLUR = 8;
const MAX_BLUR = 20;

export function simplifyShadows(layers) {
  if (!Array.isArray(layers) || layers.length === 0) return layers;
  let widest = null;
  for (const layer of layers) {
    if (!layer || layer.inset) continue;
    const blur = layer.blurRadius || 0;
    if (blur <= SMALL_BLUR) continue;
    if (!widest || blur > (widest.blurRadius || 0)) widest = layer;
  }
  if (!widest) return [];
  return [{ ...widest, blurRadius: Math.min(widest.blurRadius || 0, MAX_BLUR) }];
}

let installed = false;

export function installCheapShadows() {
  if (installed || Platform.OS !== 'android') return;
  installed = true;
  /* RN warns (dev only) whenever a built-in preprocessor is replaced. */
  if (__DEV__) LogBox.ignoreLogs(['Overwriting boxShadow style attribute preprocessor']);
  StyleSheet.setStyleAttributePreprocessor('boxShadow', (value) => simplifyShadows(processBoxShadow(value)));
}
