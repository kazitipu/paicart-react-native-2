import React from 'react';
import { View, Text } from 'react-native';
import { INVOICE_COLORS as C } from '@/components/invoice/InvoiceParts';

/* ─────────────────────────────────────────────────────────────────────────
 * The invoice blocks only the Ship For Me invoice uses — InvoiceGrid,
 * InvoiceField, InvoiceChip(Row) and InvoiceCartonTable from the web's
 * components/invoice/InvoiceParts.jsx — ported beside the shared native
 * InvoiceParts (same hex palette, same px sizes, body line-height 1.5).
 * ───────────────────────────────────────────────────────────────────────── */

const lh = (size, ratio = 1.5) => ({ fontSize: size, lineHeight: Math.round(size * ratio * 100) / 100 });
const LABEL = [lh(10), { color: C.subtle, textTransform: 'uppercase', letterSpacing: 0.6 }];

/* `display: grid; grid-template-columns: repeat(n, minmax(0,1fr)); gap: 12px 18px` */
export function InvoiceGrid({ children, columns = 2 }) {
  const cells = React.Children.toArray(children);
  const rows = [];
  for (let i = 0; i < cells.length; i += columns) rows.push(cells.slice(i, i + columns));
  return (
    <View style={{ gap: 12 }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 18 }}>
          {Array.from({ length: columns }, (_, c) => (
            <View key={c} style={{ flex: 1, minWidth: 0 }}>
              {row[c] || null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

export function InvoiceField({ label, value, capitalize }) {
  return (
    <View style={{ minWidth: 0 }}>
      <Text style={[LABEL, { marginBottom: 3 }]}>{label}</Text>
      <Text style={[lh(13), { fontWeight: '700', color: C.ink, textTransform: capitalize ? 'capitalize' : 'none' }]}>{value || '—'}</Text>
    </View>
  );
}

export function InvoiceChip({ children }) {
  return (
    <View
      style={{
        backgroundColor: C.soft,
        borderWidth: 1,
        borderColor: C.line,
        borderRadius: 6,
        paddingVertical: 3,
        paddingHorizontal: 9,
        marginRight: 6,
        marginBottom: 6,
      }}
    >
      <Text style={[lh(12), { fontWeight: '700', color: C.ink }]}>{children}</Text>
    </View>
  );
}

export function InvoiceChipRow({ label, items }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[LABEL, { marginBottom: 5 }]}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {items.map((item, i) => (
          <InvoiceChip key={i}>{item}</InvoiceChip>
        ))}
      </View>
    </View>
  );
}

/* One row per carton — marks and carton numbers pair up positionally. */
export function InvoiceCartonTable({ cartons, marks }) {
  const cell = { paddingVertical: 8, paddingHorizontal: 10 };
  const TH = [lh(10), { fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 }];
  const cols = [{ width: 28 }, { flex: 1, minWidth: 0 }, { flex: 1.4, minWidth: 0 }];
  return (
    <View style={{ borderWidth: 1, borderColor: C.line }}>
      <View style={{ flexDirection: 'row', backgroundColor: C.soft, borderBottomWidth: 1, borderBottomColor: C.line }}>
        {['#', 'Carton No', 'Shipping Mark'].map((h, i) => (
          <View key={h} style={[cell, cols[i], i === 0 && { paddingHorizontal: 0, paddingLeft: 10 }]}>
            <Text style={TH}>{h}</Text>
          </View>
        ))}
      </View>
      {cartons.map((carton, i) => (
        <View key={i} style={{ flexDirection: 'row', borderBottomWidth: i === cartons.length - 1 ? 0 : 1, borderBottomColor: C.line }}>
          <View style={[cell, cols[0], { paddingHorizontal: 0, paddingLeft: 10 }]}>
            <Text style={[lh(12), { color: C.subtle }]}>{i + 1}</Text>
          </View>
          <View style={[cell, cols[1]]}>
            <Text style={[lh(12), { fontWeight: '700', color: C.ink }]} numberOfLines={1}>
              {carton}
            </Text>
          </View>
          <View style={[cell, cols[2]]}>
            <Text style={[lh(12), { color: C.text }]}>{marks[i] || '—'}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
