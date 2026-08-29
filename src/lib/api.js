/* ─── External APIs ───
 *
 * Every non-Firebase network call in one place. On the web these URLs were
 * inline at ~20 call sites across the route tree, which is how the Taobao
 * search ended up on a different host from everything else without anyone
 * noticing, and how a bearer token ended up hardcoded in a page component.
 */
import axios from 'axios';

/* Product catalogue — search, detail, category rates, vendor listings,
   shipping quotes, image upload. */
export const ALG_BASE = 'https://alg.com.bd/api';

/* Taobao keyword search only. A DIFFERENT host from the rest of the
   catalogue — not a typo, the two are separate services. */
export const ALGLIMITED_BASE = 'https://alglimited.com/api/v1';

/* Paicart's own backend: OTP SMS and the bKash gateway. */
export const PAICART_API_BASE = 'https://paicart.com/api/v1';

/* RedX courier.
 *
 * ⚠️ The web called this directly from the browser with a bearer token
 * hardcoded in the page source (place-order line 36). Shipping a static
 * bearer token inside an APK is worse than shipping it in a web bundle — an
 * APK is trivially unpacked and the token cannot be rotated without a store
 * release. `REDX_PROXY_BASE` is where a paicart.com endpoint should sit; until
 * that exists the calls degrade gracefully rather than embedding a secret.
 * Tracked as issue #1 in MIGRATION.md. */
export const REDX_BASE = 'https://openapi.redx.com.bd/v1.0.0-beta';
export const REDX_PROXY_BASE = null;

export const alg = axios.create({ baseURL: ALG_BASE, timeout: 15000 });
export const algLimited = axios.create({ baseURL: ALGLIMITED_BASE, timeout: 15000 });
export const paicartApi = axios.create({ baseURL: PAICART_API_BASE, timeout: 20000 });

/* Retries a GET on failure. The homepage fetches every category section
   independently and the upstream is flaky enough that the web app wrapped each
   one in two retries with a 1.5s gap — without that, sections routinely
   rendered empty on a cold start. */
export const getWithRetry = async (client, url, config = {}, retries = 2, delayMs = 1500) => {
  try {
    return await client.get(url, config);
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((r) => setTimeout(r, delayMs));
    return getWithRetry(client, url, config, retries - 1, delayMs);
  }
};

/* ── Catalogue ── */

export const searchProducts = (keyword, { framePosition = 1, filterByCategory = 'Default', ...rest } = {}) =>
  getWithRetry(alg, '/products/search', {
    params: { keyword, framePosition, filterByCategory, ...rest },
    timeout: 12000,
  });

export const searchByImage = (imageUrl, params = {}) =>
  alg.get('/products/search-by-image', { params: { imageUrl, ...params } });

export const getVendorProducts = (params) => alg.get('/products/vendor-products', { params });

export const getProductById = (id) => alg.get(`/products/${id}`);

export const getProductDetail = (params) => alg.get('/products/detail', { params });

export const getProductCategory = (params) => alg.get('/products/category', { params });

export const getShippingQuote = (params) => alg.get('/products/shipping', { params });

/* Returns the server-assigned image id used as the image-search key. The
   payload is bare base64 with no `data:` prefix. */
export const uploadSearchImage = async (imageBase64) => {
  const { data } = await alg.post('/products/upload-image', { imageBase64 });
  return data?.result?.result;
};

/* ── Taobao (separate host) ── */

export const searchTaobao = (query, page = 1) =>
  algLimited.get(`/search-taobao-product/${encodeURIComponent(query)}`, { params: { page } });

/* ── Paicart backend ── */

export const sendOtpSms = (phoneNumber) => paicartApi.get(`/otp-sms-send/${phoneNumber}`);

/* ── RedX courier ── */

/* Returns null rather than throwing when no proxy is configured, so checkout
   falls back to its default delivery charge instead of blocking the order. */
export const getRedxCharge = async (params) => {
  if (!REDX_PROXY_BASE) return null;
  const { data } = await axios.get(`${REDX_PROXY_BASE}/charge/charge_calculator`, { params });
  return data;
};

export const getRedxAreas = async (districtName) => {
  if (!REDX_PROXY_BASE) return [];
  const { data } = await axios.get(`${REDX_PROXY_BASE}/areas`, {
    params: { district_name: districtName },
  });
  return data?.areas || [];
};
