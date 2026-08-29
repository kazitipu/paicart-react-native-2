/* ─── Key/value storage ───
 *
 * MMKV rather than AsyncStorage, for one decisive reason: it is *synchronous*.
 * The web store rehydrates Redux at module-eval time via `preloadedState`,
 * reading localStorage synchronously. AsyncStorage would have forced that into
 * a redux-persist + PersistGate rewrite and introduced an async rehydration
 * race that every screen would then have to defend against. MMKV keeps the
 * original shape intact.
 *
 * JSON helpers live here so callers never hand-roll try/catch around a parse —
 * a corrupt value should degrade to "no value", never crash the app.
 */
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({ id: 'paicart' });

export const getString = (key) => {
  try {
    return storage.getString(key) ?? null;
  } catch {
    return null;
  }
};

export const setString = (key, value) => {
  try {
    storage.set(key, value);
  } catch {
    /* storage full or unavailable — non-fatal */
  }
};

export const getJSON = (key, fallback = null) => {
  const raw = getString(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const setJSON = (key, value) => {
  try {
    setString(key, JSON.stringify(value));
  } catch {
    /* value not serialisable — non-fatal */
  }
};

export const remove = (key) => {
  try {
    storage.delete(key);
  } catch {
    /* no-op */
  }
};

/* Every key the app persists, in one place. */
export const KEYS = {
  STATE: 'paicart_state',
  BANNERS: 'paicart_banners_v1',
  IMAGE_SEARCH_INSTANCES: 'imageSearchInstances',
  /* Buy-Now intent captured before a login redirect. sessionStorage on web,
     keyed per product: `paicart_pending_${id}`. */
  pendingProduct: (id) => `paicart_pending_${id}`,
};
