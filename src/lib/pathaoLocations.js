/* Pathao locations & delivery charge for the address book, Place Order and
 * the home-delivery sheet. Port of the website's src/lib/pathaoLocations.js
 * (same exports).
 *
 * Calls the website's Next.js API (paicart.com/api/pathao/*, in
 * paicart-nextjs15/src/app/api/pathao), which holds the Pathao merchant
 * credentials — nothing secret is in this file. Plain fetch, no native
 * module; location lists are public so no sign-in is needed.
 *
 * Saved address shape (users.addressBook[]):
 *   { id, name, mobileNo, address, district: <city>, thana: <zone>,
 *     area: <area>, division,
 *     pathao: { cityId, cityName, zoneId, zoneName, areaId, areaName,
 *               homeDelivery },
 *     defaultShipping, defaultBilling }
 * The admin panel books Pathao parcels straight from `pathao` — no extra
 * data needed. */
const PATHAO_API_BASE = 'https://paicart.com/api/pathao';
const TIMEOUT_MS = 15000;

const call = async (path, options = {}) => {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
  let res;
  try {
    res = await fetch(`${PATHAO_API_BASE}/${path}`, {
      ...options,
      signal: controller ? controller.signal : undefined,
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
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
      call(`locations?${query}`).then((d) => d.list || []).catch((e) => {
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
  call('price', { method: 'POST', body: JSON.stringify({ cityId, zoneId, weight }) });

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
