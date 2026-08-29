/* ─── App-wide event bus ───
 *
 * The web app wired otherwise-unrelated components together with
 * `document.dispatchEvent(new CustomEvent(...))` on four channels. There is no
 * document in React Native, so they land on DeviceEventEmitter instead.
 *
 * Kept as a thin named wrapper rather than raw string literals because the web
 * version had the channel names spelled out at both ends — BottomNav fired
 * 'toggle-categories' and CategoryDrawer listened for it, with nothing tying
 * the two together. A typo silently did nothing.
 */
import { DeviceEventEmitter } from 'react-native';

export const EVENTS = {
  /* product card → FlyToIconAnimation, and → Header for the icon bounce */
  FLY_TO_ICON: 'fly-to-icon',
  /* BottomNav Category tab → CategoryDrawer */
  TOGGLE_CATEGORIES: 'toggle-categories',
  /* BottomNav WhatsApp tab → FloatingWhatsApp sheet */
  TOGGLE_WHATSAPP: 'toggle-whatsapp',
};

export const emit = (event, payload) =>
  DeviceEventEmitter.emit(event, payload);

/* Returns the unsubscribe function, so callers can return it straight from a
   useEffect. */
export const on = (event, handler) => {
  const sub = DeviceEventEmitter.addListener(event, handler);
  return () => sub.remove();
};
