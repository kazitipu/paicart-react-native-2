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

/* RedX courier — called directly with the same API token the web app
 * ships in its page source (owner-approved, 2026-11-04). The token is in the
 * APK; rotating it needs an app release, so keep it in this one place. */
export const REDX_BASE = 'https://openapi.redx.com.bd/v1.0.0-beta';
const REDX_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3Njg5NDEiLCJpYXQiOjE3NTM4ODAxNTksImlzcyI6IkZVT2VESWVSZzlwdDRmeGUzSmRYb2tmNnZPYVFBYk1TIiwic2hvcF9pZCI6NzY4OTQxLCJ1c2VyX2lkIjoxMTY3ODQ1fQ.hDlvRuwKit8rpfz2ETnsfPW2lXT-JZS_2ZBZsMdvTfk';
const redx = axios.create({ baseURL: REDX_BASE, timeout: 12000, headers: { 'API-ACCESS-TOKEN': REDX_TOKEN } });

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

/* The upstream expects the uploaded image's id as `imgId` (web: same). */
export const searchByImage = (imgId, params = {}) =>
  alg.get('/products/search-by-image', { params: { imgId, ...params } });

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

/* Returns null instead of throwing, so checkout falls back to its default
   delivery charge rather than blocking the order. */
export const getRedxCharge = async (params) => {
  try {
    const { data } = await redx.get('/charge/charge_calculator', { params });
    return data;
  } catch {
    return null;
  }
};

export const getRedxAreas = async (districtName) => {
  try {
    const { data } = await redx.get('/areas', { params: { district_name: districtName } });
    return data?.areas || [];
  } catch {
    return [];
  }
};
