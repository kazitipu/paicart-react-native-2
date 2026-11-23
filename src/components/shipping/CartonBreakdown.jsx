import React from 'react';
import { View, Text } from 'react-native';
import { Navigation2, Boxes, BadgeCheck, Hourglass, Box } from 'lucide-react-native';
import CopyIdButton from '@/components/CopyIdButton';
import { C } from '@/components/product/ui';
import { trackingNumbersOf, cartonTotals, groupCartonsByTracking } from '@/lib/cartons';

/* ═══════════════════════════════════════════════════════════════════════
   "Tracking & Cartons" section for the Ship For Me / website order / product
   request detail screens. One card per tracking number with its cartons
   (as stored on the record by the admin panel — see src/lib/cartons.js),
   a subtotal per tracking number and a grand total when there is more than
   one tracking number or carton. Renders nothing when the record has
   neither tracking numbers nor cartons.
   ═══════════════════════════════════════════════════════════════════════ */

const CARD_SHADOW = '0 4px 16px -4px rgba(28,28,28,0.08), 0 2px 6px -2px rgba(28,28,28,0.04)';
const TEAL = '#00B8A9';
const TEAL_DARK = '#0f766e';
const TEAL_TINT = 'rgba(0,184,169,0.06)';
const ORANGE_FG = '#ea580c';

const T = {
  p9: { fontSize: 9, lineHeight: 13 },
  p10: { fontSize: 10, lineHeight: 14 },
  p11: { fontSize: 11, lineHeight: 15 },
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 13, lineHeight: 18 },
};

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

const trim = (n, d) => String(Math.round(n * 10 ** d) / 10 ** d);
const kg = (v) => {
  const n = num(v);
  return n && n > 0 ? `${trim(n, 2)} kg` : '—';
};
const cbm = (v) => {
  const n = num(v);
  return n && n > 0 ? trim(n, 4) : '—';
};

const dims = (c) => {
  const [l, w, h] = [num(c.length), num(c.width), num(c.height)];
  if (!l && !w && !h) return null;
  return `${l ? trim(l, 1) : '—'}×${w ? trim(w, 1) : '—'}×${h ? trim(h, 1) : '—'} cm`;
};

/* receivedDate may be a string, epoch millis or a Firestore Timestamp. */
const dateText = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  const d = typeof v.toDate === 'function' ? v.toDate() : typeof v === 'number' ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

function Metric({ label, value, align = 'flex-start', light }) {
  return (
    <View style={{ alignItems: align, flexShrink: 1 }}>
      <Text
        style={[
          T.p9,
          { color: light ? 'rgba(255,255,255,0.7)' : C.gray400, textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: '600' },
        ]}
      >
        {label}
      </Text>
      <Text style={[T.xs, { fontWeight: '800', color: light ? '#ffffff' : C.gray800 }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function VerifiedBadge() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: C.emerald50,
        borderWidth: 1,
        borderColor: C.emerald100,
      }}
    >
      <BadgeCheck size={10} color={C.emerald600} />
      <Text style={[T.p10, { fontWeight: '700', color: C.emerald700 }]}>Verified by warehouse</Text>
    </View>
  );
}

function CartonRow({ carton, index }) {
  const size = dims(carton);
  const when = dateText(carton.receivedDate);
  const status = carton.status ? String(carton.status) : null;
  const meta = [status, when].filter(Boolean).join(' · ');
  const metrics = [
    `CN ${kg(carton.cnWeight)}`,
    `BD ${kg(carton.bdWeight)}`,
    `${cbm(carton.cbm)} m³`,
    size,
  ].filter(Boolean);

  return (
    <View
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: C.gray100,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 4,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              backgroundColor: C.orange50,
              borderWidth: 1,
              borderColor: C.orange200,
              paddingHorizontal: 6,
              paddingVertical: 1,
              borderRadius: 6,
            }}
          >
            <Box size={9} color={ORANGE_FG} />
            <Text style={[T.p10, { fontWeight: '800', color: ORANGE_FG }]} numberOfLines={1}>
              {carton.cartonNo ? String(carton.cartonNo) : `CTN ${index + 1}`}
            </Text>
          </View>
          {!!carton.lotNo && (
            <Text style={[T.p10, { color: C.gray400 }]} numberOfLines={1}>
              Lot {String(carton.lotNo)}
            </Text>
          )}
        </View>
        {!!meta && (
          <Text style={[T.p10, { color: C.gray500, textTransform: 'capitalize', flexShrink: 1, textAlign: 'right' }]} numberOfLines={1}>
            {meta}
          </Text>
        )}
      </View>
      <Text style={[T.p11, { color: C.gray600, fontWeight: '600' }]}>{metrics.join('  ·  ')}</Text>
    </View>
  );
}

function TrackingGroup({ group }) {
  const { trackingNo, cartons, totals, source } = group;
  const hasCartons = cartons.length > 0;

  return (
    <View style={{ backgroundColor: C.gray50, borderRadius: 12, borderWidth: 1, borderColor: C.gray100, padding: 10, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
          <View style={{ width: 22, height: 22, borderRadius: 7, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' }}>
            <Navigation2 size={11} color="#ffffff" />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={[T.p9, { color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.3, fontWeight: '600' }]}>
              Tracking Number
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text selectable style={[T.sm, { fontWeight: '800', color: C.gray800, flexShrink: 1 }]}>
                {trackingNo || 'Not assigned'}
              </Text>
              {!!trackingNo && <CopyIdButton value={trackingNo} size={12} />}
            </View>
          </View>
        </View>
        {source === 'alg' && <VerifiedBadge />}
      </View>

      {hasCartons ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 8,
              backgroundColor: '#ffffff',
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: C.gray100,
            }}
          >
            <Metric label="Cartons" value={String(totals.count)} />
            <Metric label="CN wt" value={kg(totals.cnWeight)} />
            <Metric label="BD wt" value={kg(totals.bdWeight)} />
            <Metric label="CBM" value={cbm(totals.cbm)} align="flex-end" />
          </View>
          <View style={{ gap: 6 }}>
            {cartons.map((c, i) => (
              <CartonRow key={`${c.cartonNo || 'ctn'}-${i}`} carton={c} index={i} />
            ))}
          </View>
        </>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 }}>
          <Hourglass size={11} color={C.gray400} />
          <Text style={[T.p11, { color: C.gray500, flexShrink: 1 }]}>
            Cartons will appear once the parcel reaches our warehouse
          </Text>
        </View>
      )}
    </View>
  );
}

export default function CartonBreakdown({ record, style }) {
  if (!record) return null;
  const trackingNos = trackingNumbersOf(record);
  const cartons = Array.isArray(record.cartons) ? record.cartons.filter(Boolean) : [];
  if (!trackingNos.length && !cartons.length) return null;

  const groups = groupCartonsByTracking(cartons, trackingNos);
  const grand = cartonTotals(cartons);
  const showGrand = cartons.length > 0 && (groups.length >= 2 || cartons.length >= 2);

  const subtitle = [
    `${groups.length} tracking no${groups.length === 1 ? '' : 's'}`,
    cartons.length ? `${cartons.length} carton${cartons.length === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={[
        { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: C.gray100, overflow: 'hidden', boxShadow: CARD_SHADOW },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: TEAL_TINT,
          borderBottomWidth: 1,
          borderBottomColor: C.gray100,
        }}
      >
        <Boxes size={14} color={TEAL_DARK} />
        <View style={{ flex: 1 }}>
          <Text style={[T.p11, { fontWeight: '800', color: TEAL_DARK, textTransform: 'uppercase', letterSpacing: 0.9 }]}>
            Tracking & Cartons
          </Text>
          <Text style={[T.p10, { color: C.gray500 }]}>{subtitle}</Text>
        </View>
      </View>

      <View style={{ padding: 12, gap: 10 }}>
        {groups.map((g, i) => (
          <TrackingGroup key={`${g.trackingNo || 'none'}-${i}`} group={g} />
        ))}

        {showGrand && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              backgroundColor: TEAL_DARK,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Metric light label="Total cartons" value={String(grand.count)} />
            <Metric light label="CN wt" value={kg(grand.cnWeight)} />
            <Metric light label="BD wt" value={kg(grand.bdWeight)} />
            <Metric light label="CBM" value={cbm(grand.cbm)} align="flex-end" />
          </View>
        )}
      </View>
    </View>
  );
}

/* "3 cartons · 12.5 kg" — for list cards. Prefers the BD (actual) weight.
   Returns null when the record has no cartons. */
export function cartonHint(record) {
  const list = Array.isArray(record?.cartons) ? record.cartons.filter(Boolean) : [];
  if (!list.length) return null;
  const t = cartonTotals(list);
  const w = t.bdWeight > 0 ? t.bdWeight : t.cnWeight;
  return `${t.count} carton${t.count === 1 ? '' : 's'}${w > 0 ? ` · ${trim(w, 2)} kg` : ''}`;
}
