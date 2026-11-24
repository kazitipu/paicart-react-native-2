/* ─── Address book schema ───
 *
 * Each entry of `users/{id}.addressBook` (web profile page, this app's
 * profile screen and the admin panel all read the same shape):
 *
 *   { id, name, mobileNo, address, district: <Pathao city>, thana: <zone>,
 *     area: <area name>, division,
 *     pathao: { cityId, cityName, zoneId, zoneName, areaId, areaName,
 *               homeDelivery },
 *     defaultShipping, defaultBilling }
 *
 * built by lib/pathaoLocations buildPathaoAddress. The admin panel books
 * Pathao parcels straight from `pathao`.
 *
 * Older entries may lack `pathao` (and may carry `areaObj` from the previous
 * courier, or `division` from the address package) — they are still read
 * through the helpers below; the profile screen asks the customer to re-add
 * them to pick a Pathao delivery area.
 *
 * Earlier builds of this app wrote { isDefault, phone, area: {…} } instead.
 * Those entries are still READ through the helpers below, and rewritten in
 * the shared shape (toWebAddress) whenever this app writes the address book
 * again — no bulk migration.
 */

const bdAddress = require('@bangladeshi/bangladesh-address/build/src/index');

/* `area` is a string (Pathao area name) on current entries; only the old
   app shape stored an object there. */
const LEGACY_KEYS = ['isDefault', 'phone'];
const isLegacy = (a) =>
  !!a && (LEGACY_KEYS.some((k) => k in a) || (!!a.area && typeof a.area === 'object'));

export const addrPhone = (a) => a?.mobileNo || a?.phone || '';
export const addrThana = (a) => a?.thana || a?.areaObj?.name || a?.area?.name || '';
export const addrAreaObj = (a) => a?.areaObj || (a?.area && typeof a.area === 'object' ? a.area : null);
export const addrAreaId = (a) => addrAreaObj(a)?.id ?? null;

/* Legacy entries carried a district but no division. */
export const divisionOfDistrict = (district) => {
  if (!district) return '';
  try {
    return bdAddress.getDivisionOfDistrict?.(district) || '';
  } catch {
    return '';
  }
};
export const addrDivision = (a) => a?.division || divisionOfDistrict(a?.district);

/* "area, zone/thana, city/district[, division]" (no street) — Pathao area
   first when the zone has one; empty / repeated parts skipped */
export const addrAreaLine = (a) =>
  [typeof a?.area === 'string' ? a.area : '', addrThana(a), a?.district, a?.pathao ? a?.division : addrDivision(a)]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(', ');

/* "address, area, zone/thana, city/district[, division]" — what the cards
   and checkout show. Pathao entries have no division. */
export const addrLine = (a) =>
  [a?.address, typeof a?.area === 'string' ? a.area : '', addrThana(a), a?.district, a?.pathao ? a?.division : addrDivision(a)]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(', ');

/* The web reads `defaultShipping` only. A legacy `isDefault` counts only when
   no entry in the book carries a web default, so the two can never disagree. */
export const pickDefaultAddress = (book = []) =>
  book.find((a) => a?.defaultShipping) || book.find((a) => a?.isDefault) || null;

export const isDefaultShipping = (a, book = []) => !!a && pickDefaultAddress(book) === a;

/* Web schema for one entry. A web-shaped entry is returned untouched (same
   object, every field kept); a legacy one is rewritten field by field. */
export const toWebAddress = (a, book) => {
  if (!isLegacy(a)) return a;
  const { isDefault, phone, area, ...rest } = a;
  const legacyDefault = book ? isDefaultShipping(a, book) : !!isDefault;
  return {
    ...rest,
    name: a.name || '',
    address: a.address || '',
    mobileNo: a.mobileNo || phone || '',
    division: addrDivision(a),
    district: a.district || '',
    thana: addrThana(a),
    areaObj: a.areaObj || (area && typeof area === 'object' ? area : null),
    area: typeof area === 'string' ? area : '',
    defaultShipping: 'defaultShipping' in a ? !!a.defaultShipping : legacyDefault,
    defaultBilling: !!a.defaultBilling,
  };
};

export const toWebBook = (book = []) => book.map((a) => toWebAddress(a, book));
