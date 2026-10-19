/* Freight-mode helpers.
 *
 * The mode is stored under two different shapes depending on which flow
 * created the record:
 *   - website orders and buy-and-ship bookings -> `shipmentMethod`: 'Air' | 'Sea'
 *   - ship-for-me requests                     -> `method` / `shipBy`: 'air' | 'sea'
 * Air is the default everywhere: records written before the sea option
 * existed carry no field at all.
 */
export const isSeaShipment = (record) => {
  if (!record) return false;
  const raw = record.shipmentMethod ?? record.method ?? record.shipBy ?? '';
  return String(raw).trim().toLowerCase() === 'sea';
};

/* The milestone between the abroad warehouse and BD customs is stored as the
 * literal status 'Ready for fly', with its timestamp under
 * `Ready for flyDate`. Both are written by the admin panel and must NOT be
 * renamed here - only what the customer reads changes, because a sea parcel
 * is loaded onto a vessel rather than flown.
 *
 * `airLabel` is passed in rather than fixed: the track-order timeline words
 * the air case as "Ready to Fly" while the ship-for-me screens use
 * "Ready for fly", and this is not the place to quietly re-word either. */
export const READY_STATUS = 'Ready for fly';
export const READY_SEA_LABEL = 'Ready for vessel';

export const readyStepLabel = (record, airLabel = READY_STATUS) =>
  isSeaShipment(record) ? READY_SEA_LABEL : airLabel;

/* What a stored status reads as — mirrors the web's src/lib/shipment.js.
 * "Bangladesh warehouse" is the stage after BD customs and is shown as
 * "Custom Released"; the stored value is written by the admin panel and must
 * not change — only the wording does. */
export const STATUS_DISPLAY = { 'Bangladesh warehouse': 'Custom Released' };
export const statusDisplay = (status) => STATUS_DISPLAY[status] || status;
