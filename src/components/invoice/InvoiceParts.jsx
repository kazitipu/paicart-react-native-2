import React, { useState } from 'react';
import { View, Text, Image } from 'react-native';

/* ─────────────────────────────────────────────────────────────────────────
 * Native port of the web's components/invoice/InvoiceParts.jsx (shared there
 * byte-for-byte with the admin panel's printed copy). Same hex palette, same
 * px sizes; the web's body line-height (1.5) is spelled out wherever the
 * original inherits it. Used by components/invoice/InvoicePage.jsx.
 * ───────────────────────────────────────────────────────────────────────── */

export const INVOICE_COLORS = {
  brand: '#FF6A00',
  brandSoft: '#FFF4EC',
  ink: '#111827',
  text: '#374151',
  muted: '#6B7280',
  subtle: '#9CA3AF',
  line: '#EEF0F3',
  soft: '#F9FAFB',
  green: '#16A34A',
  greenSoft: '#ECFDF3',
  red: '#DC2626',
  redSoft: '#FEF2F2',
};
const C = INVOICE_COLORS;

export const INVOICE_COMPANY = {
  name: 'Paicart',
  tagline: 'China Cross-Border Sourcing & Shipping',
  address: ['Suite#F2, (2nd floor) Tropical Razia Shopping Complex', '26/1 Chamelibagh, Shantinagar, Dhaka 1217'],
  phone: '+88-01629773885',
  email: 'support@paicart.com',
  web: 'www.paicart.com',
};

/* ৳ amounts, whole taka */
export const tk = (n) => `৳${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

/* Payment state of an order / request / shipment, as one status pill */
export const invoiceStatusOf = (record) => {
  const s = String(record?.paymentStatus || '').toLowerCase();
  if (s === 'paid') return { label: 'Paid', tone: 'green' };
  if (s === 'partially paid') return { label: 'Partially Paid', tone: 'brand' };
  if (s === 'pending') return { label: 'Payment Under Review', tone: 'amber' };
  return { label: 'Unpaid', tone: 'gray' };
};

export const toInvoiceList = (value) => {
  const parts = Array.isArray(value) ? value : String(value || '').split(',');
  return parts.map((p) => String(p || '').trim()).filter(Boolean);
};

export const isInvoicePlaceholder = (value) => value === '0';

const TONES = {
  gray: { bg: '#F3F4F6', fg: '#4B5563' },
  brand: { bg: C.brandSoft, fg: C.brand },
  green: { bg: C.greenSoft, fg: C.green },
  emerald: { bg: C.greenSoft, fg: C.green },
  orange: { bg: C.brandSoft, fg: C.brand },
  amber: { bg: '#FFFBEB', fg: '#B45309' },
  red: { bg: C.redSoft, fg: C.red },
};

const lh = (size, ratio = 1.5) => ({ fontSize: size, lineHeight: Math.round(size * ratio * 100) / 100 });

export function InvoiceBadge({ children, color = 'gray' }) {
  const t = TONES[color] || TONES.gray;
  return (
    <View style={{ alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: t.bg }}>
      <Text style={[lh(11), { fontWeight: '700', color: t.fg, letterSpacing: 0.22 }]}>{children}</Text>
    </View>
  );
}

/* ── Sheet chrome ── */

const LOGO = require('@/assets/paicart_transparent.png');
const LOGO_SRC = Image.resolveAssetSource(LOGO);
const LOGO_W = LOGO_SRC?.width && LOGO_SRC?.height ? (34 * LOGO_SRC.width) / LOGO_SRC.height : 120;

export function InvoiceHeader({ docType, docId, docDate, status }) {
  const meta = [lh(12), { color: C.subtle, paddingVertical: 2, paddingRight: 12, textAlign: 'right' }];
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 24,
        alignItems: 'flex-start',
        paddingBottom: 22,
        borderBottomWidth: 1,
        borderBottomColor: C.line,
      }}
    >
      <View style={{ flexShrink: 1, minWidth: 0 }}>
        <Image source={LOGO} style={{ height: 34, width: LOGO_W, marginBottom: 10 }} resizeMode="contain" />
        {INVOICE_COMPANY.address.map((l) => (
          <Text key={l} style={[lh(11, 1.6), { color: C.muted }]}>
            {l}
          </Text>
        ))}
        <Text style={[lh(11, 1.6), { color: C.muted }]}>
          {INVOICE_COMPANY.phone} · {INVOICE_COMPANY.email}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
        <Text style={{ fontSize: 30, lineHeight: 30, fontWeight: '800', letterSpacing: 4.2, color: C.ink }}>INVOICE</Text>
        <Text style={[lh(12), { color: C.brand, fontWeight: '700', marginTop: 6 }]}>{docType}</Text>
        <View style={{ marginTop: 12, flexDirection: 'row' }}>
          <View>
            <Text style={meta}>Invoice No</Text>
            {!!docDate && <Text style={meta}>Date</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[lh(12), { color: C.ink, fontWeight: '700', paddingVertical: 2 }]}>#{docId}</Text>
            {!!docDate && <Text style={[lh(12), { color: C.ink, fontWeight: '600', paddingVertical: 2 }]}>{docDate}</Text>}
          </View>
        </View>
        {!!status && (
          <View style={{ marginTop: 10 }}>
            <InvoiceBadge color={status.tone}>{status.label}</InvoiceBadge>
          </View>
        )}
      </View>
    </View>
  );
}

export function InvoiceFooter() {
  const t = [lh(11, 1.7), { color: C.subtle, textAlign: 'center' }];
  return (
    <View style={{ marginTop: 36, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.line }}>
      <Text style={[lh(12, 1.7), { color: C.text, fontWeight: '700', textAlign: 'center' }]}>Thank you for choosing Paicart!</Text>
      <Text style={t}>
        {INVOICE_COMPANY.phone} · {INVOICE_COMPANY.email} · {INVOICE_COMPANY.web}
      </Text>
      <Text style={t}>This is a computer-generated invoice and needs no signature.</Text>
    </View>
  );
}

/* Faint rotated stamp once nothing is owed (decorative, not tappable) */
export function InvoicePaidStamp() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 150,
        right: 40,
        transform: [{ rotate: '-14deg' }],
        borderWidth: 3,
        borderColor: C.green,
        opacity: 0.18,
        paddingVertical: 4,
        paddingHorizontal: 18,
        borderRadius: 10,
      }}
    >
      <Text style={{ fontSize: 34, lineHeight: 51, fontWeight: '800', letterSpacing: 6.8, color: C.green }}>PAID</Text>
    </View>
  );
}

/* 1mm at the CSS 96dpi the web sizes the sheet with */
export const MM = 96 / 25.4;

/* The white A4 sheet: 6px brand strip, 12mm × 14mm padding, min 297mm tall. */
export const InvoiceSheet = React.forwardRef(function InvoiceSheet({ width, paid, children }, ref) {
  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        position: 'relative',
        backgroundColor: '#FFFFFF',
        width,
        minHeight: 297 * MM,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(17,24,39,0.08), 0 8px 24px rgba(17,24,39,0.04)',
      }}
    >
      <View style={{ height: 6, backgroundColor: C.brand }} />
      <View style={{ paddingVertical: 12 * MM, paddingHorizontal: 14 * MM }}>{children}</View>
      {paid && <InvoicePaidStamp />}
    </View>
  );
});

/* ── Content blocks ── */

export function InvoiceSection({ title, children, style }) {
  return (
    <View style={[{ marginTop: 26 }, style]}>
      {!!title && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <View style={{ width: 3, height: 12, borderRadius: 2, backgroundColor: C.brand }} />
          <Text style={[lh(11), { fontWeight: '800', color: C.ink, textTransform: 'uppercase', letterSpacing: 1.1 }]}>{title}</Text>
        </View>
      )}
      {children}
    </View>
  );
}

/* Total / Paid / Balance Due at a glance. due == null → bill not set yet. */
export function InvoiceSummary({ total, paid, due, totalLabel = 'Total Bill' }) {
  const pending = due == null;
  const settled = !pending && due <= 0;
  const card = (label, value, highlight) => {
    const hl = highlight && !pending;
    return (
      <View
        key={label}
        style={{
          flex: 1,
          minWidth: 0,
          borderRadius: 10,
          paddingVertical: 12,
          paddingHorizontal: 14,
          backgroundColor: hl ? (settled ? C.greenSoft : C.brandSoft) : C.soft,
          borderWidth: 1,
          borderColor: hl ? (settled ? '#BBF7D0' : '#FFD8BF') : C.line,
        }}
      >
        <Text
          style={[
            lh(10),
            { fontWeight: '700', color: hl ? (settled ? C.green : C.brand) : C.subtle, textTransform: 'uppercase', letterSpacing: 0.8 },
          ]}
        >
          {label}
        </Text>
        <Text style={[lh(19), { fontWeight: '800', marginTop: 4, color: hl ? (settled ? C.green : C.brand) : C.ink }]}>{value}</Text>
      </View>
    );
  };
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
      {card(totalLabel, pending ? 'Pending' : tk(total))}
      {card('Paid', tk(paid))}
      {card(settled ? 'Paid in Full' : 'Balance Due', pending ? 'Pending' : tk(settled ? 0 : due), true)}
    </View>
  );
}

/* Billed To  |  Invoice Details. The details table's label column is as wide
   as its widest label (an auto-layout table with nowrap labels), measured
   from an invisible copy. */
export function InvoiceParties({ billTo, details = [], detailsTitle = 'Invoice Details' }) {
  const [labelW, setLabelW] = useState(0);
  const heading = (t) => (
    <Text style={[lh(10), { fontWeight: '800', color: C.subtle, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }]}>{t}</Text>
  );
  const rows = details.filter((d) => d && (d.value || d.value === 0));
  const body = [lh(12, 1.65), { color: C.muted }];
  return (
    <View style={{ flexDirection: 'row', gap: 24, marginTop: 26 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {heading('Billed To')}
        {billTo ? (
          <View>
            <Text style={[{ fontSize: 14, lineHeight: 23.1 }, { fontWeight: '700', color: C.ink }]}>{billTo.name || '—'}</Text>
            {(billTo.lines || []).filter(Boolean).map((l, i) => (
              <Text key={i} style={body}>
                {l}
              </Text>
            ))}
            {!!billTo.phone && <Text style={body}>{billTo.phone}</Text>}
            {!!billTo.email && <Text style={body}>{billTo.email}</Text>}
          </View>
        ) : (
          <Text style={[lh(12), { color: C.subtle }]}>—</Text>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        {heading(detailsTitle)}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', opacity: 0, alignSelf: 'flex-start' }}
          onLayout={(e) => setLabelW(Math.ceil(e.nativeEvent.layout.width))}
        >
          {rows.map((d) => (
            <Text key={d.label} numberOfLines={1} style={[lh(12), { paddingRight: 12 }]}>
              {d.label}
            </Text>
          ))}
        </View>
        {rows.map((d) => (
          <View key={d.label} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 3 }}>
            <Text numberOfLines={1} style={[lh(12), { color: C.muted, paddingRight: 12, width: labelW || undefined, flexShrink: 0 }]}>
              {d.label}
            </Text>
            <Text style={[lh(12), { color: C.ink, fontWeight: '600', textAlign: 'right', flex: 1 }]}>{String(d.value)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* # | Item | Qty | Unit Price | Amount (border-box widths 28 / auto / 50 / 90 / 100) */
const COLS = [28, null, 50, 90, 100];
const ALIGN = ['left', 'left', 'right', 'right', 'right'];

function Cell({ i, children, style }) {
  const w = COLS[i];
  return (
    <View style={[{ padding: 10 }, w ? { width: w } : { flex: 1, minWidth: 0 }, style]}>
      {typeof children === 'string' || typeof children === 'number' ? (
        <Text style={[lh(12), { color: C.text, textAlign: ALIGN[i] }]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

const TH = [lh(10), { fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 }];

export function InvoiceItemsTable({ items }) {
  return (
    <View style={{ borderWidth: 1, borderColor: C.line }}>
      <View style={{ flexDirection: 'row', backgroundColor: C.soft, borderBottomWidth: 1, borderBottomColor: C.line }}>
        {['#', 'Item', 'Qty', 'Unit Price', 'Amount'].map((h, i) => (
          <View key={h} style={[{ paddingVertical: 9, paddingHorizontal: 10 }, COLS[i] ? { width: COLS[i] } : { flex: 1, minWidth: 0 }]}>
            <Text numberOfLines={1} style={[TH, { textAlign: ALIGN[i] }]}>
              {h}
            </Text>
          </View>
        ))}
      </View>
      {items.map((it, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            borderBottomWidth: i === items.length - 1 ? 0 : 1,
            borderBottomColor: C.line,
          }}
        >
          <Cell i={0}>
            <Text style={[lh(12), { color: C.subtle }]}>{i + 1}</Text>
          </Cell>
          <Cell i={1}>
            <Text style={[lh(12), { fontWeight: '700', color: C.ink }]}>{it.name || '—'}</Text>
            {!!it.meta && <Text style={[lh(11), { color: C.subtle, marginTop: 2 }]}>{it.meta}</Text>}
          </Cell>
          <Cell i={2}>{it.qty ?? '—'}</Cell>
          <Cell i={3}>{it.unitPrice != null ? tk(it.unitPrice) : '—'}</Cell>
          <Cell i={4}>
            <Text style={[lh(12), { textAlign: 'right', fontWeight: '700', color: C.ink }]}>{it.amount != null ? tk(it.amount) : '—'}</Text>
          </Cell>
        </View>
      ))}
    </View>
  );
}

/* Totals column, right-aligned under the items */
export function InvoiceTotals({ children }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
      <View style={{ width: 320, maxWidth: '100%' }}>{children}</View>
    </View>
  );
}

export function InvoiceRow({ label, value, bold, tone, hint }) {
  const color = tone === 'green' ? C.green : tone === 'due' ? C.brand : C.ink;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingVertical: 5 }}>
      <Text style={[lh(12), { flexShrink: 1, color: bold ? C.ink : C.muted, fontWeight: bold ? '700' : '400' }]}>
        {label}
        {!!hint && <Text style={{ fontSize: 10, color: C.subtle, fontWeight: '400' }}>{`  ${hint}`}</Text>}
      </Text>
      <Text style={[lh(12), { fontWeight: '700', color, flexShrink: 0 }]}>{value}</Text>
    </View>
  );
}

export function InvoiceDivider() {
  return <View style={{ height: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.line, marginVertical: 6 }} />;
}

/* The bottom line: Balance Due (or Paid in Full) in its own band. */
export function InvoiceDueRow({ due }) {
  const pending = due == null;
  const settled = !pending && due <= 0;
  const fg = pending ? C.muted : settled ? C.green : '#FFFFFF';
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingVertical: 11,
        paddingHorizontal: 14,
        borderRadius: 10,
        backgroundColor: pending ? C.soft : settled ? C.greenSoft : C.brand,
        borderWidth: pending ? 1 : 0,
        borderColor: C.line,
      }}
    >
      <Text style={[lh(13), { fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.78, color: fg }]}>
        {settled ? 'Paid in Full' : 'Balance Due'}
      </Text>
      <Text style={[lh(17), { fontWeight: '800', color: fg }]}>{pending ? 'Pending' : tk(settled ? 0 : due)}</Text>
    </View>
  );
}

/* Date | Method | Amount */
export function InvoicePayments({ payments }) {
  if (!payments || !payments.length) return null;
  const cell = { paddingVertical: 8, paddingHorizontal: 10, flex: 1, minWidth: 0 };
  return (
    <InvoiceSection title="Payment History">
      <View style={{ borderWidth: 1, borderColor: C.line }}>
        <View style={{ flexDirection: 'row', backgroundColor: C.soft, borderBottomWidth: 1, borderBottomColor: C.line }}>
          {['Date', 'Method', 'Amount'].map((h, i) => (
            <View key={h} style={cell}>
              <Text style={[TH, { textAlign: i === 2 ? 'right' : 'left' }]}>{h}</Text>
            </View>
          ))}
        </View>
        {payments.map((p, i) => (
          <View
            key={i}
            style={{ flexDirection: 'row', borderBottomWidth: i === payments.length - 1 ? 0 : 1, borderBottomColor: C.line }}
          >
            <View style={cell}>
              <Text style={[lh(12), { color: C.text }]}>{p.date || '—'}</Text>
            </View>
            <View style={cell}>
              <Text style={[lh(12), { color: C.text }]}>{p.method || 'Payment'}</Text>
            </View>
            <View style={cell}>
              <Text style={[lh(12), { color: C.green, fontWeight: '700', textAlign: 'right' }]}>+{tk(p.amount)}</Text>
            </View>
          </View>
        ))}
      </View>
    </InvoiceSection>
  );
}

/* Notes from the record + the standing terms */
export function InvoiceNotes({ notes = [], terms = [] }) {
  const n = notes.filter(Boolean);
  if (!n.length && !terms.length) return null;
  const t = lh(11, 1.7);
  return (
    <InvoiceSection title="Notes & Terms">
      <View style={{ backgroundColor: C.soft, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14 }}>
        {n.map((x, i) => (
          <Text key={`n${i}`} style={[t, { color: C.text, marginBottom: 4 }]}>
            {x}
          </Text>
        ))}
        {terms.map((x, i) => (
          <Text key={`t${i}`} style={[t, { color: C.muted }]}>
            • {x}
          </Text>
        ))}
      </View>
    </InvoiceSection>
  );
}

/* Standing terms printed on every invoice */
export const INVOICE_TERMS = [
  'China-to-Bangladesh shipping is charged on the actual weight measured when the parcel arrives.',
  'Refunds follow the Paicart Return & Refund Policy (www.paicart.com/pages/refund-policy).',
];

/* Billed-To block from a delivery address or a user profile */
export const billToFromAddress = (a) =>
  a
    ? {
        name: a.name,
        lines: [a.address, [a.thana, a.district, a.division].filter(Boolean).join(', ')],
        phone: a.mobileNo,
      }
    : null;

export const billToFromUser = (u) => {
  if (!u) return null;
  const book = Array.isArray(u.addressBook) ? u.addressBook : [];
  const a = book.find((x) => x && x.defaultShipping) || book[0];
  return {
    name: (a && a.name) || u.displayName,
    lines: a ? [a.address, [a.thana, a.district, a.division].filter(Boolean).join(', ')] : [],
    phone: (a && a.mobileNo) || u.mobileNo,
    email: u.email,
  };
};
