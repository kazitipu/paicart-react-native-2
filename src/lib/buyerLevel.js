// 1 point = 1 Tk of any verified payment (order, product request, or shipment).
// Mirrors computeBuyerLvl() in paicart-backend2/src/firebase/firebase.utils.js —
// keep both in sync if thresholds ever change.
export const BUYER_LEVELS = [
  { lvl: 1, label: 'Level 1 Buyer', min: 0,      max: 100000 },
  { lvl: 2, label: 'Level 2 Buyer', min: 100000, max: 300000 },
  { lvl: 3, label: 'Level 3 Buyer', min: 300000, max: 500000 },
  { lvl: 4, label: 'Level 4 Buyer', min: 500000, max: null },
];

export function computeBuyerLvl(totalPoints) {
  if (totalPoints > 500000) return 4;
  if (totalPoints > 300000) return 3;
  if (totalPoints > 100000) return 2;
  return 1;
}

export function getLevelMeta(lvl) {
  return BUYER_LEVELS.find((l) => l.lvl === lvl) || BUYER_LEVELS[0];
}

// Progress (0-1) toward the next level, and the points still needed.
export function getLevelProgress(totalPoints) {
  const lvl = computeBuyerLvl(totalPoints);
  const meta = getLevelMeta(lvl);
  if (meta.max == null) {
    return { fraction: 1, pointsToNext: 0, next: null };
  }
  const fraction = Math.min(1, Math.max(0, (totalPoints - meta.min) / (meta.max - meta.min)));
  return {
    fraction,
    pointsToNext: Math.max(0, meta.max - totalPoints),
    next: getLevelMeta(lvl + 1),
  };
}
