import React, { useState, useEffect, useMemo } from 'react';
import { View, Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import InvoiceShell, {
  InvoiceRow, InvoiceDivider, InvoiceSection, InvoiceBadge,
} from '@/components/InvoiceShell';
import { getSingleOrderApi, getSingleProductRequest } from '@/lib/firebaseUtils';
import {
  getGoodsTotal, getTotalPaid, getTotalDue, getOfferDiscount,
} from '@/lib/orderMath';

const money = (n) => `৳${Math.round(n).toLocaleString()}`;

/* Dual-mode, as on the web: the same id can name an order or a product
   request, so the caller says which via `kind`. The web read a query-string
   flag for this; here it is a navigation param, and it falls back to trying
   the order first then the request — a deep link from an email may not carry
   the flag. */
export default function OrderInvoice() {
  const route = useRoute();
  const { bookingId, kind } = route.params || {};

  const [record, setRecord] = useState(null);
  const [isRequest, setIsRequest] = useState(kind === 'productRequest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (kind === 'productRequest') {
          const r = await getSingleProductRequest(bookingId);
          if (alive) {
            setRecord(r || null);
            setIsRequest(true);
          }
        } else {
          const o = await getSingleOrderApi(bookingId);
          if (o) {
            if (alive) {
              setRecord(o);
              setIsRequest(false);
            }
          } else {
            const r = await getSingleProductRequest(bookingId);
            if (alive) {
              setRecord(r || null);
              setIsRequest(true);
            }
          }
        }
      } catch {
        /* handled by notFound */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [bookingId, kind]);

  const rows = useMemo(() => {
    if (!record) return [];
    if (isRequest) {
      const total = parseInt(record.totalAmount ?? record.amount ?? 0, 10) || 0;
      const paid = (record.payments || []).reduce(
        (a, p) => a + (parseInt(p.amount, 10) || 0),
        0,
      );
      return [
        { label: 'Request total', value: total, bold: true },
        ...(paid > 0 ? [{ label: 'Paid', value: -paid, tone: 'green' }] : []),
        {
          label: total - paid > 0 ? 'Balance due' : 'Fully paid',
          value: total - paid > 0 ? total - paid : paid,
          bold: true,
          tone: total - paid > 0 ? 'due' : 'green',
        },
      ];
    }

    const goods = getGoodsTotal(record);
    const paid = getTotalPaid(record);
    const due = Math.max(0, getTotalDue(record));
    const offer = getOfferDiscount(record);
    return [
      { label: 'Goods', value: goods },
      ...(record.shippingChargeCustomer > 0
        ? [{ label: 'International freight', value: parseInt(record.shippingChargeCustomer, 10) }]
        : []),
      ...(record.localShipping > 0
        ? [{ label: 'China local courier', value: parseInt(record.localShipping, 10) }]
        : []),
      ...(record.otherCost > 0 ? [{ label: 'Other cost', value: parseInt(record.otherCost, 10) }] : []),
      ...(record.discount > 0
        ? [{ label: 'Discount', value: -parseInt(record.discount, 10), tone: 'green' }]
        : []),
      ...(record.couponAmount > 0
        ? [{ label: 'Coupon', value: -Math.round(record.couponAmount), tone: 'green' }]
        : []),
      ...(offer > 0 ? [{ label: 'Pay-now offer', value: -offer, tone: 'green' }] : []),
      ...(paid > 0 ? [{ label: 'Paid', value: -paid, tone: 'green' }] : []),
      {
        label: due > 0 ? 'Balance due' : 'Fully paid',
        value: due > 0 ? due : paid,
        bold: true,
        tone: due > 0 ? 'due' : 'green',
      },
    ];
  }, [record, isRequest]);

  const toHtml = () => {
    if (!record) return '';
    const row = (r) =>
      `<tr><td>${r.bold ? `<b>${r.label}</b>` : r.label}</td><td style="text-align:right">${
        r.bold ? `<b>${r.value < 0 ? '-' : ''}${money(Math.abs(r.value))}</b>` : `${r.value < 0 ? '-' : ''}${money(Math.abs(r.value))}`
      }</td></tr>`;
    return `<h2 style="color:#FF6A00;margin:0">Paicart</h2>
<p style="color:#64748b;margin:4px 0 16px">${isRequest ? 'Product Request' : 'Order'} Invoice #${bookingId} · ${record.orderedDate || record.date || ''}</p>
<table style="width:100%;border-collapse:collapse;font-size:13px">${rows.map(row).join('')}</table>
<p style="color:#94a3b8;font-size:11px;margin-top:24px">support@paicart.com</p>`;
  };

  return (
    <InvoiceShell
      docType={isRequest ? 'Product Request Invoice' : 'Order Invoice'}
      docId={bookingId}
      docDate={record?.orderedDate || record?.date}
      loading={loading}
      notFound={!record}
      toHtml={toHtml}
    >
      {record && (
        <>
          <View className="flex-row gap-2 mb-4">
            <InvoiceBadge
              color={
                record.paymentStatus === 'Paid'
                  ? 'emerald'
                  : record.paymentStatus === 'Partially Paid'
                    ? 'orange'
                    : 'gray'
              }
            >
              {record.paymentStatus || 'Not Paid'}
            </InvoiceBadge>
            <InvoiceBadge
              color={(record.orderStatus || record.status) === 'reject' ? 'red' : 'gray'}
            >
              {record.orderStatus || record.status || 'Pending'}
            </InvoiceBadge>
          </View>

          {!isRequest && (record.items || []).length > 0 && (
            <InvoiceSection title="Items">
              {record.items.map((item, i) =>
                (item.skus || []).map((sku, n) => (
                  <InvoiceRow
                    key={`${i}-${n}`}
                    label={`${item.name}`}
                    hint={`${[sku.color, sku.size].filter(Boolean).join(' / ') || 'Default'} × ${sku.totalQuantity}`}
                    value={money(parseInt(sku.price, 10) * parseInt(sku.totalQuantity, 10))}
                  />
                )),
              )}
            </InvoiceSection>
          )}

          {isRequest && (
            <InvoiceSection title="Request">
              <InvoiceRow label="Product" value={record.productName || record.productType || '—'} />
              <InvoiceRow label="Quantity" value={String(record.quantity || 1)} />
              {!!record.variant && <InvoiceRow label="Variant" value={record.variant} />}
            </InvoiceSection>
          )}

          <InvoiceSection title="Payment Breakdown">
            {rows.map((r, i) => (
              <React.Fragment key={r.label}>
                {r.bold && i === rows.length - 1 && <InvoiceDivider />}
                <InvoiceRow
                  label={r.label}
                  bold={r.bold}
                  tone={r.tone}
                  value={`${r.value < 0 ? '−' : ''}${money(Math.abs(r.value))}`}
                />
              </React.Fragment>
            ))}
          </InvoiceSection>

          {(record.payments || []).length > 0 && (
            <InvoiceSection title="Payment History">
              {record.payments.map((p, i) => (
                <InvoiceRow
                  key={i}
                  label={`${p.method || 'Payment'} — ${p.date || '—'}`}
                  value={`+${money(parseInt(p.amount, 10) || 0)}`}
                  tone="green"
                />
              ))}
            </InvoiceSection>
          )}

          {!!record.deliveryAddress && (
            <InvoiceSection title="Deliver To">
              <Text className="text-smd text-foreground">
                {record.deliveryAddress.name} · {record.deliveryAddress.phone}
              </Text>
              <Text className="text-2xs text-gray-500 mt-0.5">
                {[
                  record.deliveryAddress.address,
                  record.deliveryAddress.area?.name,
                  record.deliveryAddress.district,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            </InvoiceSection>
          )}
        </>
      )}
    </InvoiceShell>
  );
}
