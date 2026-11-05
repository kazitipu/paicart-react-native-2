import React, { useState, useEffect, useCallback } from 'react';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import InvoicePage from '@/components/invoice/InvoicePage';
import {
  InvoiceSummary, InvoiceParties, InvoiceSection, InvoiceItemsTable, InvoiceTotals, InvoiceRow, InvoiceDivider,
  InvoiceDueRow, InvoicePayments, InvoiceNotes, INVOICE_TERMS, invoiceStatusOf, billToFromAddress, billToFromUser, tk,
} from '@/components/invoice/InvoiceParts';
import { getSingleOrderApi, getSingleProductRequest } from '@/lib/firebaseUtils';
import { getTotalPaid, getTotalDue, getGoodsTotal, getSingleShopTotal, getOfferDiscount } from '@/lib/orderMath';
import { enBDDate } from '@/components/orders/OrderBits';
import { statusDisplay } from '@/lib/shipment';

/* ═══════════════════════════════════════════════════════════════════════
   Web pages/dashboard/buy-and-ship-for/invoice/[bookingId]/page.jsx — one
   page for both a 1688 order and a product request. The web picks the body
   from `?productRequest=true`; here it is the `kind: 'productRequest'`
   param (a deep link's `productRequest=true` query works too). With neither,
   the id is read as an order, and — beyond the web, for links that lost the
   flag — as a product request if no order has it.
   ═══════════════════════════════════════════════════════════════════════ */

/* toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) → "04 Nov 2026" */
const fmtDate = (ms) => (ms ? enBDDate(ms) : '');

/* ── 1688 order — one line per SKU ── */
function OrderInvoiceBody({ order }) {
  const totalPaid = getTotalPaid(order);
  const totalDue = getTotalDue(order);
  const goodsTotal = getGoodsTotal(order);
  const hasShipping = parseInt(order.shippingChargeCustomer, 10) > 0;
  const totalBill = totalDue + totalPaid;

  const items = [];
  order.items?.forEach((item) => {
    item.skus?.forEach((sku) => {
      const qty = parseInt(sku.totalQuantity || 0, 10);
      const unitPrice = parseInt(parseFloat(sku.price || 0), 10);
      items.push({ name: item.name, meta: [sku.color, sku.size].filter(Boolean).join(' / '), qty, unitPrice, amount: qty * unitPrice });
    });
  });
  const totalQty = items.reduce((a, l) => a + l.qty, 0);
  const offer = getOfferDiscount(order);

  return (
    <>
      <InvoiceSummary total={totalBill} paid={totalPaid} due={totalDue} />
      <InvoiceParties
        billTo={billToFromAddress(order.deliveryAddress)}
        details={[
          { label: 'Order ID', value: `#${order.orderId}` },
          { label: 'Order Date', value: fmtDate(order.time) },
          { label: 'Seller', value: order.shopName },
          { label: 'Shipment', value: order.shipmentMethod || 'Air' },
          { label: 'Status', value: statusDisplay(order.orderStatus) },
          { label: 'Tracking No', value: order.trackingNo && order.trackingNo !== '0' ? order.trackingNo : '' },
        ]}
      />

      <InvoiceSection title={`Items (${totalQty} pcs)`}>
        <InvoiceItemsTable items={items} />
        <InvoiceTotals>
          <InvoiceRow label="Product Subtotal" value={tk(goodsTotal)} />
          <InvoiceRow label="China Local Delivery" value={parseInt(order.localShipping, 10) > 0 ? tk(order.localShipping) : '—'} />
          <InvoiceRow label="Shipping (CN → BD)" value={hasShipping ? tk(order.shippingChargeCustomer) : 'On actual weight'} />
          {parseInt(order.otherCost, 10) > 0 && <InvoiceRow label="Packaging & Other" value={`+${tk(order.otherCost)}`} />}
          {parseInt(order.siteDiscountAmount, 10) > 0 && (
            <InvoiceRow label={`Site Discount (${order.siteDiscountPercent}%)`} value={`-${tk(order.siteDiscountAmount)}`} tone="green" />
          )}
          {parseInt(order.couponAmount, 10) > 0 && <InvoiceRow label="Coupon" value={`-${tk(order.couponAmount)}`} tone="green" />}
          {parseInt(order.discount, 10) > 0 && <InvoiceRow label="Discount (on shipping)" value={`-${tk(order.discount)}`} tone="green" />}
          {offer > 0 && (
            <InvoiceRow
              label={`Pay-now Discount${order.offerPayNowPercent ? ` (${parseFloat(order.offerPayNowPercent)}%)` : ''}`}
              value={`-${tk(offer)}`}
              tone="green"
            />
          )}
          <InvoiceDivider />
          <InvoiceRow bold label="Total Bill" value={tk(totalBill)} />
          {totalPaid > 0 && <InvoiceRow label="Paid" value={`-${tk(totalPaid)}`} tone="green" />}
          {parseFloat(order.refund) > 0 && <InvoiceRow label="Refunded" value={tk(order.refund)} hint="(returned to you)" />}
          <InvoiceDueRow due={totalDue} />
        </InvoiceTotals>
      </InvoiceSection>

      <InvoicePayments payments={order.payments} />
      <InvoiceNotes notes={[order.additionalNotes && `Note: ${order.additionalNotes}`]} terms={INVOICE_TERMS} />
    </>
  );
}

/* ── Product request — one quoted line ── */
function ProductRequestInvoiceBody({ booking, user }) {
  const totalPaid = getTotalPaid(booking);
  const totalDue = getTotalDue(booking);
  const hasShipping = parseInt(booking.shippingChargeCustomer, 10) > 0;
  const base = booking.actualTotal ? parseInt(booking.actualTotal, 10) : getSingleShopTotal(booking);
  const grandTotal = totalDue + totalPaid;
  const qty = parseInt(booking.productQuantity, 10) || null;
  const offer = getOfferDiscount(booking);

  return (
    <>
      <InvoiceSummary total={grandTotal} paid={totalPaid} due={totalDue} />
      <InvoiceParties
        billTo={billToFromUser(user)}
        details={[
          { label: 'Request ID', value: `#${booking.bookingId}` },
          { label: 'Request Date', value: booking.date || fmtDate(booking.time) },
          { label: 'Store', value: [booking.store, booking.country].filter(Boolean).join(' · ') },
          { label: 'Shipment', value: (booking.shipmentMethod || 'Air') === 'Sea' ? 'By Sea' : 'By Air' },
          { label: 'Status', value: statusDisplay(booking.orderStatus || booking.status) },
          { label: 'Tracking No', value: booking.trackingNo && booking.trackingNo !== '0' ? booking.trackingNo : '' },
        ]}
      />

      <InvoiceSection title="Items">
        <InvoiceItemsTable
          items={[
            {
              name: booking.productType || 'Requested product',
              meta: booking.productVariant,
              qty,
              unitPrice: qty && base ? Math.round(base / qty) : null,
              amount: base || null,
            },
          ]}
        />
        <InvoiceTotals>
          <InvoiceRow label="Product Price" value={base > 0 ? tk(base) : '—'} />
          <InvoiceRow label="China Local Courier" value={parseInt(booking.localShipping, 10) > 0 ? tk(booking.localShipping) : '—'} />
          {hasShipping ? (
            <InvoiceRow
              label="Shipping (CN → BD)"
              hint={booking.receivedWeight && booking.customerRate ? `(${booking.receivedWeight} kg × ৳${booking.customerRate})` : ''}
              value={tk(booking.shippingChargeCustomer)}
            />
          ) : (
            <InvoiceRow label="Shipping (CN → BD)" value="On actual weight" />
          )}
          {parseInt(booking.otherCost, 10) > 0 && <InvoiceRow label="Packaging & Other" value={`+${tk(booking.otherCost)}`} />}
          {parseInt(booking.discount, 10) > 0 && <InvoiceRow label="Discount" value={`-${tk(booking.discount)}`} tone="green" />}
          {offer > 0 && <InvoiceRow label="Pay-now Discount" value={`-${tk(offer)}`} tone="green" />}
          <InvoiceDivider />
          <InvoiceRow bold label="Total Bill" value={tk(grandTotal)} />
          {totalPaid > 0 && <InvoiceRow label="Paid" value={`-${tk(totalPaid)}`} tone="green" />}
          {parseFloat(booking.refund) > 0 && <InvoiceRow label="Refunded" value={tk(booking.refund)} hint="(returned to you)" />}
          <InvoiceDueRow due={totalDue} />
        </InvoiceTotals>
      </InvoiceSection>

      <InvoicePayments payments={booking.payments} />
      <InvoiceNotes notes={[booking.note && `Note: ${booking.note}`]} terms={INVOICE_TERMS} />
    </>
  );
}

export default function OrderInvoice() {
  const route = useRoute();
  const { bookingId, kind, productRequest } = route.params || {};
  const currentUser = useSelector((s) => s.user?.currentUser);
  const flaggedRequest = kind === 'productRequest' || productRequest === true || productRequest === 'true';

  const [isProductRequest, setIsProductRequest] = useState(flaggedRequest);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRecord = useCallback(async () => {
    const id = String(bookingId);
    if (flaggedRequest) return { record: (await getSingleProductRequest(id)) || null, request: true };
    const order = await getSingleOrderApi(id);
    if (order) return { record: order, request: false };
    if (kind === 'order') return { record: null, request: false };
    const req = await getSingleProductRequest(id);
    return req ? { record: req, request: true } : { record: null, request: false };
  }, [bookingId, kind, flaggedRequest]);

  useEffect(() => {
    if (!bookingId) return undefined;
    let alive = true;
    setLoading(true);
    fetchRecord()
      .then(({ record, request }) => {
        if (!alive) return;
        setData(record);
        setIsProductRequest(request);
      })
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [bookingId, fetchRecord]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRecord()
      .then(({ record, request }) => {
        setData(record);
        setIsProductRequest(request);
      })
      .catch(() => {})
      .finally(() => setRefreshing(false));
  };

  const settled = data ? getTotalDue(data) <= 0 && getTotalPaid(data) > 0 : false;

  return (
    <InvoicePage
      backRoute={isProductRequest ? 'BuyShipMyRequests' : 'BuyShipMyOrders'}
      docType={isProductRequest ? 'Product Request Invoice' : 'Order Invoice'}
      docId={bookingId}
      docDate={fmtDate(data?.time)}
      status={data ? invoiceStatusOf(data) : null}
      paid={settled}
      loading={loading}
      notFound={!data}
      onRefresh={onRefresh}
      refreshing={refreshing}
    >
      {!!data &&
        (isProductRequest ? <ProductRequestInvoiceBody booking={data} user={currentUser} /> : <OrderInvoiceBody order={data} />)}
    </InvoicePage>
  );
}
