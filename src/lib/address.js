/* ─── Address book schema ───
 *
 * The web profile page (and the admin panel, which books RedX parcels from
 * `deliveryAddress.areaObj` and prints slips from the `defaultShipping`
 * entry) store each entry of `users/{id}.addressBook` as:
 *
 *   { id, name, address, mobileNo, division, district, thana, areaObj,
 *     defaultShipping, defaultBilling }
 *
 * `thana` is the chosen RedX area's name and `areaObj` the whole RedX area
 * object ({ id, name, post_code, division_name, zone_id }); `id` is
 * parseInt(Math.random() * 10000).
 *
 * Earlier builds of this app wrote { isDefault, phone, area } instead. Those
 * entries are still READ through the helpers below, and rewritten in the web
 * shape (toWebAddress) whenever this app writes the address book again — no
 * bulk migration.
 */

const bdAddress = require('@bangladeshi/bangladesh-address/build/src/index');

/* RedX spells some districts differently from the address package (web
   information/page.jsx DISTRICT_ALIASES, verbatim). */
export const DISTRICT_ALIASES = {
  Narsingdi: 'Norshingdi', Jhalokati: 'Jhalokathi', Pirojpur: 'Perojpur',
  Chattogram: 'Chittagong', Lakshmipur: 'Laksmipur',
  Sirajgonj: 'Sirajganj', Maulvibazar: 'Moulvibazar',
};

const LEGACY_KEYS = ['isDefault', 'phone', 'area'];
const isLegacy = (a) => !!a && LEGACY_KEYS.some((k) => k in a);

export const addrPhone = (a) => a?.mobileNo || a?.phone || '';
export const addrThana = (a) => a?.thana || a?.areaObj?.name || a?.area?.name || '';
export const addrAreaObj = (a) => a?.areaObj || a?.area || null;
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

/* "address, thana, district, division" — what the web cards and checkout show. */
export const addrLine = (a) =>
  [a?.address, addrThana(a), a?.district, addrDivision(a)].filter(Boolean).join(', ');

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
    areaObj: a.areaObj || area || null,
    defaultShipping: 'defaultShipping' in a ? !!a.defaultShipping : legacyDefault,
    defaultBilling: !!a.defaultBilling,
  };
};

export const toWebBook = (book = []) => book.map((a) => toWebAddress(a, book));
