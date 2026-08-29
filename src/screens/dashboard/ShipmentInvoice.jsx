import React, { useState, useEffect, useMemo } from 'react';
import { View, Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import InvoiceShell, {
  InvoiceRow, InvoiceDivider, InvoiceSection, InvoiceBadge,
} from '@/components/InvoiceShell';
import { getSingleShipForMe } from '@/lib/firebaseUtils';
import { getTotal } from '@/lib/shipForMe';
import { STATUS_BADGE } from '@/components/ui/StatusBadge';

const money = (n) => `৳${Math.round(n).toLocaleString()}`;

function Grid({ rows }) {
  return (
    <View className="flex-row flex-wrap">
      {rows.map((r) => (
        <View key={r.label} className="w-1/2 py-1.5 pr-2">
          <Text className="text-xxs text-gray-400">{r.label}</Text>
          <Text className="text-smd font-bold text-foreground">{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ShipmentInvoice() {
  const route = useRoute();
  const { bookingId } = route.params || {};
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getSingleShipForMe(bookingId)
      .then((r) => alive && setReq(r || null))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [bookingId]);

  const totals = useMemo(() => {
    if (!req) return null;
    const totalPaid = getTotal(req);
    const weightRateCharge =
      req.receivedWeight && req.customerRate
        ? Math.round(parseFloat(req.receivedWeight) * parseFloat(req.customerRate))
        : null;
    const otherCost = parseFloat(req.otherCost) || 0;
    const discount = parseFloat(req.discount) || 0;
    const refund = parseFloat(req.refund) || 0;
    const totalBill = parseInt(req.shippingChargeCustomer, 10) || 0;
    return { totalPaid, weightRateCharge, otherCost, discount, refund, totalBill, totalDue: totalBill - totalPaid };
  }, [req]);

  const trackingList = req?.trackingNumbers?.length
    ? req.trackingNumbers
    : String(req?.trackingNo || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

  /* The PDF is rendered from this same data, so the document and the screen
     cannot disagree on the figures. */
  const toHtml = () => {
    if (!req || !totals) return '';
    const row = (l, v) => `<tr><td>${l}</td><td style="text-align:right">${v}</td></tr>`;
    return `<h2 style="color:#FF6A00;margin:0">Paicart</h2>
<p style="color:#64748b;margin:4px 0 16px">Shipment Invoice #${bookingId} · ${req.date || ''}</p>
<table style="width:100%;border-collapse:collapse;font-size:13px">
${row('Product', req.othersProductName || '—')}
${row('Quantity', req.productQuantity ? `${req.productQuantity} Pcs` : '—')}
${row('Method', req.shipBy || req.method || 'Air')}
${row('Actual weight', req.receivedWeight ? `${req.receivedWeight} Kg` : 'Pending')}
${trackingList.length ? row('Tracking', trackingList.join(', ')) : ''}
</table>
<hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb">
<table style="width:100%;border-collapse:collapse;font-size:13px">
${totals.weightRateCharge !== null ? row(`Shipping charge (${req.receivedWeight} Kg × ৳${req.customerRate})`, money(totals.weightRateCharge)) : ''}
${totals.otherCost > 0 ? row('Repacking charge', `+${money(totals.otherCost)}`) : ''}
${totals.refund > 0 ? row('Refund', `-${money(totals.refund)}`) : ''}
${totals.discount > 0 ? row('Discount', `-${money(totals.discount)}`) : ''}
${row('<b>Total bill</b>', `<b>${money(totals.totalBill)}</b>`)}
${totals.totalPaid > 0 ? row('Advance paid', `-${money(totals.totalPaid)}`) : ''}
${row(`<b>${totals.totalDue > 0 ? 'Balance due' : 'Fully paid'}</b>`, `<b>${money(totals.totalDue > 0 ? totals.totalDue : totals.totalPaid)}</b>`)}
</table>
<p style="color:#94a3b8;font-size:11px;margin-top:24px">support@paicart.com</p>`;
  };

  return (
    <InvoiceShell
      docType="Shipment Invoice"
      docId={bookingId}
      docDate={req?.date}
      loading={loading}
      notFound={!req}
      toHtml={toHtml}
    >
      {req && totals && (
        <>
          <View className="flex-row gap-2 mb-4">
            <InvoiceBadge
              color={
                req.paymentStatus === 'Paid'
                  ? 'emerald'
                  : req.paymentStatus === 'Partially Paid'
                    ? 'orange'
                    : 'gray'
              }
            >
              {req.paymentStatus === 'Paid'
                ? 'Paid'
                : req.paymentStatus === 'Partially Paid'
                  ? 'Partially Paid'
                  : 'Not Paid'}
            </InvoiceBadge>
            <InvoiceBadge color={req.status === 'Reject' ? 'red' : 'gray'}>
              {STATUS_BADGE[req.status]?.label || req.status || 'Pending'}
            </InvoiceBadge>
          </View>

          <InvoiceSection title="Shipment Details">
            <Grid
              rows={[
                { label: 'Product', value: req.othersProductName || '—' },
                { label: 'Quantity', value: req.productQuantity ? `${req.productQuantity} Pcs` : '—' },
                {
                  label: 'Contains',
                  value:
                    req.productContains && req.productContains !== 'none'
                      ? req.productContains
                      : 'None',
                },
                { label: 'Method', value: req.shipBy || req.method || 'Air' },
                { label: 'Ship from', value: req.shipFrom || '—' },
                { label: 'Booked', value: req.date || '—' },
                { label: 'Total box', value: req.ctnQuantity || '—' },
                { label: 'Total CBM', value: req.totalCbm ? `${req.totalCbm} cbm` : '—' },
                {
                  label: 'Actual weight',
                  value: req.receivedWeight
                    ? `${req.receivedWeight} Kg`
                    : req.weight
                      ? `${req.weight} Kg (booked)`
                      : 'Pending',
                },
                ...(trackingList.length ? [{ label: 'Tracking', value: trackingList.join(', ') }] : []),
                ...(req.shippingMark ? [{ label: 'Shipping mark', value: req.shippingMark }] : []),
              ]}
            />
          </InvoiceSection>

          <InvoiceSection title="Payment Breakdown">
            {totals.weightRateCharge !== null && (
              <InvoiceRow
                label="Shipping charge"
                hint={`${req.receivedWeight} Kg × ৳${req.customerRate}`}
                value={money(totals.weightRateCharge)}
              />
            )}
            {totals.otherCost > 0 && (
              <InvoiceRow label="Repacking charge" value={`+${money(totals.otherCost)}`} />
            )}
            {totals.refund > 0 && (
              <InvoiceRow label="Refund" value={`-${money(totals.refund)}`} tone="green" />
            )}
            {totals.discount > 0 && (
              <InvoiceRow label="Discount" value={`-${money(totals.discount)}`} tone="green" />
            )}
            <InvoiceDivider />
            <InvoiceRow bold label="Total due bill" value={money(totals.totalBill)} />
            {totals.totalPaid > 0 && (
              <InvoiceRow label="Advance paid" value={`-${money(totals.totalPaid)}`} tone="green" />
            )}
            <InvoiceDivider />
            <InvoiceRow
              bold
              label={totals.totalDue > 0 ? 'Balance due' : 'Fully paid'}
              value={money(totals.totalDue > 0 ? totals.totalDue : totals.totalPaid)}
              tone={totals.totalDue > 0 ? 'due' : 'green'}
            />
          </InvoiceSection>

          {req.payments?.length > 0 && (
            <InvoiceSection title="Payment History">
              {req.payments.map((p, i) => (
                <InvoiceRow
                  key={i}
                  label={`${p.method || 'Payment'} — ${p.date || '—'}`}
                  value={`+${money(parseInt(p.amount, 10) || 0)}`}
                  tone="green"
                />
              ))}
            </InvoiceSection>
          )}
        </>
      )}
    </InvoiceShell>
  );
}
