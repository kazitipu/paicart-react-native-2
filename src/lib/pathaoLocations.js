/* Pathao locations & delivery charge for the address book, Place Order and
 * the home-delivery sheet. Port of the website's src/lib/pathaoLocations.js
 * (same exports).
 *
 * Calls Paicart's own Cloud Functions (functions/pathao.js in
 * paicart-nextjs15), which hold the Pathao merchant credentials — nothing
 * secret is in this file. Plain fetch with the signed-in user's Firebase ID
 * token (anonymous users count); no Functions SDK, no native module.
 *
 * Saved address shape (users.addressBook[]):
 *   { id, name, mobileNo, address, district: <city>, thana: <zone>,
 *     area: <area>, division,
 *     pathao: { cityId, cityName, zoneId, zoneName, areaId, areaName,
 *               homeDelivery },
 *     defaultShipping, defaultBilling }
 * The admin panel books Pathao parcels straight from `pathao` — no extra
 * data needed. */
import { auth } from './firebase';

const FUNCTIONS_BASE = 'https://asia-south1-paicart.cloudfunctions.net';
const TIMEOUT_MS = 15000;

const call = async (path, options = {}) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in to choose a delivery location.');
  const token = await user.getIdToken();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
  let res;
  try {
    res = await fetch(`${FUNCTIONS_BASE}/${path}`, {
      ...options,
      signal: controller ? controller.signal : undefined,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new Error('Could not reach Pathao. Please check your connection and try again.');
  } finally {
    if (timer) clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not reach Pathao. Please try again.');
  return data;
};

/* lists rarely change — keep them for the session */
const cache = new Map();
const listFor = (key, query) => {
  if (!cache.has(key)) {
    cache.set(
      key,
      call(`pathaoLocations?${query}`).then((d) => d.list || []).catch((e) => {
        cache.delete(key);
        throw e;
      }),
    );
  }
  return cache.get(key);
};

export const getPathaoCities = () => listFor('cities', 'level=cities');
export const getPathaoZones = (cityId) => listFor(`zones_${cityId}`, `level=zones&parentId=${cityId}`);
export const getPathaoAreas = (zoneId) => listFor(`areas_${zoneId}`, `level=areas&parentId=${zoneId}`);

/* → { price, finalPrice, codPercentage, codEnabled, additionalCharge } */
export const getPathaoPrice = ({ cityId, zoneId, weight }) =>
  call('pathaoPrice', { method: 'POST', body: JSON.stringify({ cityId, zoneId, weight }) });

/* An address-book entry from the form + the chosen Pathao locations */
export const buildPathaoAddress = ({ id, name, mobileNo, address, city, zone, area, defaultShipping, defaultBilling }) => ({
  id: id || parseInt(Math.random() * 1000000, 10),
  name: String(name || '').trim(),
  mobileNo: String(mobileNo || '').trim(),
  address: String(address || '').trim(),
  district: city ? city.name : '',
  thana: zone ? zone.name : '',
  area: area ? area.name : '',
  division: '',
  pathao: {
    cityId: city ? city.id : null,
    cityName: city ? city.name : '',
    zoneId: zone ? zone.id : null,
    zoneName: zone ? zone.name : '',
    areaId: area ? area.id : null,
    areaName: area ? area.name : '',
    homeDelivery: area ? area.homeDelivery !== false : true,
  },
  defaultShipping: !!defaultShipping,
  defaultBilling: !!defaultBilling,
});

/* "Area, Zone, City" for display, old addresses included. Entries written
   by earlier app builds may carry `area` as an object — only strings are
   shown (the website's version assumes strings). */
export const addressAreaLine = (a) =>
  a
    ? [a.area, a.thana, a.district, a.division]
      .filter((v) => typeof v === 'string' && v)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .join(', ')
    : '';
