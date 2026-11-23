/* Cartons per tracking number — display helpers for the customer app.
 * The admin panel (paicart-backend2/src/constants/cartons.js) fetches cartons
 * from ALG or takes them by hand and stores them on the record as
 * `cartons: [{ trackingNo, cartonNo, cnWeight, bdWeight, cbm, length, width,
 * height, lotNo, productName, imageUrl, receivedDate, status, source }]`.
 * This file only reads that list. Keep the helpers in step with the admin copy.
 */

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

export const trackingNumbersOf = (record) => {
  if (!record) return [];
  const list =
    Array.isArray(record.trackingNumbers) && record.trackingNumbers.length
      ? record.trackingNumbers
      : String(record.trackingNo || "").split(/[,\n]/);
  return Array.from(
    new Set(list.map((t) => String(t || "").trim()).filter(Boolean))
  );
};

const sum = (list, key) =>
  list.reduce((a, c) => a + (Number.isFinite(c[key]) ? c[key] : num(c[key]) || 0), 0);
const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;

export const cartonTotals = (cartons) => {
  const list = cartons || [];
  return {
    count: list.length,
    cnWeight: round(sum(list, "cnWeight"), 2),
    bdWeight: round(sum(list, "bdWeight"), 2),
    cbm: round(sum(list, "cbm"), 4),
  };
};

export const groupCartonsByTracking = (cartons, trackingNos) => {
  const order = trackingNos && trackingNos.length ? [...trackingNos] : [];
  (cartons || []).forEach((c) => {
    if (!order.includes(c.trackingNo)) order.push(c.trackingNo);
  });
  return order.map((t) => {
    const list = (cartons || []).filter((c) => c.trackingNo === t);
    return {
      trackingNo: t,
      cartons: list,
      totals: cartonTotals(list),
      source: list.length ? (list.every((c) => c.source === "alg") ? "alg" : "manual") : null,
    };
  });
};
