import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import cartReducer from './slices/cartSlice';
import wishlistReducer from './slices/wishlistSlice';
import ordersReducer from './slices/ordersSlice';
import bookingRequestReducer from './slices/bookingRequestSlice';
import shipForMeListReducer from './slices/shipForMeListSlice';
import productReducer from './slices/productSlice';
import searchedProductsReducer from './slices/searchedProductsSlice';
import singleProductReducer from './slices/singleProductSlice';
import noticesReducer from './slices/noticesSlice';
import filtersReducer from './slices/filtersSlice';
import currencyReducer from './slices/currencySlice';
import { getJSON, setJSON, KEYS } from '@/lib/storage';

/* ─── Persistence ───
 *
 * MMKV is synchronous, so this keeps the web app's shape exactly: read once at
 * module-eval time and hand the result to `preloadedState`. No redux-persist,
 * no PersistGate, and no async-rehydration race for screens to defend against.
 *
 * Two things the web version got away with and mobile would not:
 *
 *   1. It persisted the ENTIRE root state. That includes
 *      `searchedProducts.products`, `data.products` and
 *      `singleProduct.product` — whole 1688/Taobao payloads carrying
 *      `props_list` and raw description HTML. Tens of megabytes of catalogue
 *      cache would end up on the device to no benefit, since all three are
 *      re-fetched on mount anyway. Only the three slices that represent the
 *      user's own state are persisted.
 *
 *   2. It wrote on EVERY dispatch. With three Firestore onSnapshot listeners
 *      feeding the store, a burst of updates meant a burst of full-state
 *      serialisations on the JS thread. The write is debounced instead.
 */
const PERSIST_SLICES = ['user', 'cartList', 'wishlist'];

const WRITE_DEBOUNCE_MS = 300;

function loadPersistedState() {
  const saved = getJSON(KEYS.STATE, null);
  if (!saved || typeof saved !== 'object') return undefined;
  /* Only feed back the whitelisted slices. A state blob written by an older
     build may carry keys this build no longer has; handing an unknown key to
     configureStore's preloadedState throws. */
  const next = {};
  PERSIST_SLICES.forEach((key) => {
    if (saved[key] && typeof saved[key] === 'object') next[key] = saved[key];
  });
  return Object.keys(next).length ? next : undefined;
}

function pickPersistable(state) {
  const next = {};
  PERSIST_SLICES.forEach((key) => {
    next[key] = state[key];
  });
  return next;
}

const store = configureStore({
  reducer: {
    user: userReducer,
    cartList: cartReducer,
    wishlist: wishlistReducer,
    orders: ordersReducer,
    bookingRequests: bookingRequestReducer,
    shipForMeList: shipForMeListReducer,
    data: productReducer,
    searchedProducts: searchedProductsReducer,
    singleProduct: singleProductReducer,
    notices: noticesReducer,
    filters: filtersReducer,
    currency: currencyReducer,
  },
  preloadedState: loadPersistedState(),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      /* Order/booking records carry Firestore Timestamps and the cart holds
         deeply nested product payloads; both checks are hot paths here. */
      serializableCheck: false,
      immutableCheck: false,
    }),
});

let writeTimer = null;
store.subscribe(() => {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    setJSON(KEYS.STATE, pickPersistable(store.getState()));
  }, WRITE_DEBOUNCE_MS);
});

export default store;
