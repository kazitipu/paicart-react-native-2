import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import ContentPage from '@/components/ContentPage';
import { TS, C, SHADOW, RED, INK, relaxed } from '@/components/static/StaticBits';

/* Web: src/app/pages/tax-and-Shipping/page.jsx (< 640px). Copy verbatim.
   Unlike the other static pages it has no breadcrumb / hero tile: a centred
   #1C1C1C banner, then three shadow-sm cards on bg-gray-50.

   The rates are a real <table class="w-full text-sm"> inside
   overflow-x-auto. Its columns are sized by the browser's automatic table
   layout, reproduced here from measured text widths:
     min-content = widest unbreakable run + 32px cell padding (px-4),
     max-content = whole cell on one line + 32px;
     room ≥ Σmax  → columns grow in proportion to max-content,
     Σmin ≤ room → min + (max − min) × share of the spare room,
     room < Σmin  → min-content widths, scrolling sideways. */

const HEAD = ['Weight', 'Air (per kg)', 'Sea (per kg)', 'Delivery Time'];
const RATES = [
  { range: '0–0.5 kg', air: '৳700', sea: '৳250', time: 'Air: 7–14 days / Sea: 30–45 days' },
  { range: '0.5–1 kg', air: '৳600', sea: '৳220', time: 'Air: 7–14 days / Sea: 30–45 days' },
  { range: '1–5 kg', air: '৳550', sea: '৳200', time: 'Air: 7–14 days / Sea: 30–45 days' },
  { range: '5 kg+', air: 'Contact us', sea: 'Contact us', time: 'Varies' },
];
const CUSTOMS = [
  'Clothing & textiles: 25–37%',
  'Electronics: 15–25%',
  'Cosmetics & beauty: 20–30%',
  'Toys & gifts: 10–15%',
  'Food items: Subject to inspection and special regulations',
];

const TH = [TS.sm, { color: C.gray500, fontWeight: '500' }];
const TD = [
  [TS.sm, { color: C.gray700, fontWeight: '500' }],
  [TS.sm, { color: C.gray600 }],
  [TS.sm, { color: C.gray600 }],
  [TS.xs, { color: C.gray500 }],
];
const CELL_PX = 16;

/* Every cell as [col, text, style]; header row first. */
const CELLS = [
  ...HEAD.map((h, i) => [i, h, TH]),
  ...RATES.flatMap((r) => [r.range, r.air, r.sea, r.time].map((v, i) => [i, v, TD[i]])),
];
/* Break opportunities: spaces, and after an en dash. */
const words = (s) => s.split(' ').flatMap((w) => w.replace(/–/g, '–\n').split('\n').filter(Boolean));

const MEASURE = [];
CELLS.forEach(([col, text, style], k) => {
  MEASURE.push({ key: `max${k}`, col, kind: 'max', text, style });
  words(text).forEach((w, j) => MEASURE.push({ key: `min${k}-${j}`, col, kind: 'min', text: w, style }));
});

function useAutoTable() {
  const sizes = useRef({});
  const [measured, setMeasured] = useState(null);
  const [room, setRoom] = useState(0);

  const onMeasure = useCallback((m) => (e) => {
    sizes.current[m.key] = e.nativeEvent.layout.width;
    if (Object.keys(sizes.current).length === MEASURE.length) {
      const min = [0, 0, 0, 0];
      const max = [0, 0, 0, 0];
      MEASURE.forEach(({ key, col, kind }) => {
        const w = Math.ceil(sizes.current[key] + 0.5) + CELL_PX * 2;
        if (kind === 'min') min[col] = Math.max(min[col], w);
        else max[col] = Math.max(max[col], w);
      });
      setMeasured({ min, max });
    }
  }, []);

  const widths = useMemo(() => {
    if (!measured || !room) return null;
    const { min, max } = measured;
    const sMin = min.reduce((a, b) => a + b, 0);
    const sMax = max.reduce((a, b) => a + b, 0);
    if (room >= sMax) return max.map((m) => (m * room) / sMax);
    if (room >= sMin) return min.map((m, i) => m + ((max[i] - m) * (room - sMin)) / (sMax - sMin));
    return min;
  }, [measured, room]);

  return { onMeasure, widths, setRoom };
}

function RatesTable() {
  const { onMeasure, widths, setRoom } = useAutoTable();
  const total = widths ? widths.reduce((a, b) => a + b, 0) : 0;

  const row = (cells, styles, border, key) => (
    <View
      key={key}
      style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: border }}
    >
      {cells.map((v, i) => (
        <View key={i} style={{ width: widths[i], paddingVertical: 12, paddingHorizontal: CELL_PX }}>
          <Text style={styles[i]}>{v}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View onLayout={(e) => setRoom(e.nativeEvent.layout.width)}>
      {/* off-screen measuring pass */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, width: 2000, opacity: 0 }}>
        {MEASURE.map((m) => (
          <View key={m.key} style={{ position: 'absolute', top: 0, left: 0, flexDirection: 'row' }}>
            <Text numberOfLines={1} style={m.style} onLayout={onMeasure(m)}>
              {m.text}
            </Text>
          </View>
        ))}
      </View>

      {widths ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
          <View style={{ width: total }}>
            {row(HEAD, [TH, TH, TH, TH], C.gray100, 'head')}
            {RATES.map((r, i) => row([r.range, r.air, r.sea, r.time], TD, C.gray50, i))}
          </View>
        </ScrollView>
      ) : (
        <View style={{ height: 300 }} />
      )}
    </View>
  );
}

function Card({ title, children }) {
  return (
    <View style={{ backgroundColor: '#ffffff', borderRadius: 16, boxShadow: SHADOW.base, padding: 24 }}>
      <Text style={[TS.lg, { fontWeight: '700', color: RED, marginBottom: 16 }]}>{title}</Text>
      {children}
    </View>
  );
}

export default function TaxAndShipping() {
  return (
    <ContentPage bg={C.gray50}>
      <View style={{ backgroundColor: INK, paddingVertical: 48, alignItems: 'center' }}>
        <Text style={{ fontSize: 30, lineHeight: 36, fontWeight: '700', color: '#ffffff', textAlign: 'center' }}>
          Tax & Shipping Info
        </Text>
        <Text style={[TS.base, { color: C.blue100, marginTop: 8, textAlign: 'center' }]}>
          Understand what you&apos;re paying for
        </Text>
      </View>

      <ContentPage.Body style={{ paddingHorizontal: 8, paddingVertical: 48, gap: 32 }}>
        <Card title="Shipping Rates">
          <RatesTable />
        </Card>

        <Card title="Customs & Import Taxes">
          <Text style={[relaxed(14), { color: C.gray600, marginBottom: 12 }]}>
            Bangladesh customs may charge import duties on certain categories of goods. Common rates:
          </Text>
          <View style={{ gap: 8 }}>
            {CUSTOMS.map((item) => (
              <View key={item} style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={[TS.sm, { color: RED }]}>•</Text>
                <Text style={[TS.sm, { color: C.gray600, flex: 1 }]}>{item}</Text>
              </View>
            ))}
          </View>
          <Text style={[TS.xs, { color: C.gray400, marginTop: 16 }]}>
            Note: Customs rates are approximate and may change. Paicart is not responsible for customs charges imposed by Bangladesh authorities.
          </Text>
        </Card>

        <Card title="Service Fees">
          <Text style={[relaxed(14), { color: C.gray600 }]}>
            Our service fee for Buy & Ship For Me orders is typically{' '}
            <Text style={{ fontWeight: '700' }}>7–10%</Text> of the product price, with a minimum of ৳50. This covers product procurement, quality check, and packaging at our China warehouse.
          </Text>
        </Card>
      </ContentPage.Body>
    </ContentPage>
  );
}
