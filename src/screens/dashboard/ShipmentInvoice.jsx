import React, { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import InvoicePage from '@/components/invoice/InvoicePage';
import {
  InvoiceSummary, InvoiceParties, InvoiceSection, InvoiceItemsTable, InvoiceTotals, InvoiceRow, InvoiceDivider, InvoiceDueRow,
  InvoicePayments, InvoiceNotes, INVOICE_TERMS, invoiceStatusOf, billToFromUser, toInvoiceList, tk,
} from '@/components/invoice/InvoiceParts';
import { InvoiceGrid, InvoiceField, InvoiceChipRow, InvoiceCartonTable } from '@/components/shipping/ShipmentInvoiceParts';
import { STATUS_BADGE, toIsoDate } from '@/components/shipping/ShipBits';
import { getSingleShipForMe } from '@/lib/firebaseUtils';
import { getTotal } from '@/lib/shipForMe';

/* ═══════════════════════════════════════════════════════════════════════
   Web pages/dashboard/ship-for/invoice/[bookingId]/page.jsx: one read of
   shipForMe/{bookingId} rendered into the shared invoice shell (A4 sheet,
   Print / Download PDF). The bill is whatever the admin set on
   shippingChargeCustomer; weight × rate is an informational line.
   ═══════════════════════════════════════════════════════════════════════ */

export default function ShipmentInvoice() {
  const route = useRoute();
  const { bookingId } = route.params || {};
  const currentUser = useSelector((s) => s.user?.currentUser);
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const read = useCallback(
    () =>
      getSingleShipForMe(String(bookingId))
        .then((d) => setReq(d || null))
        .catch(() => setReq(null)),
    [bookingId],
  );

  useEffect(() => {
    if (bookingId) read().finally(() => setLoading(false));
  }, [bookingId, read]);

  const onRefresh = () => {
    setRefreshing(true);
    read().finally(() => setRefreshing(false));
  };

  const totalPaid = req ? getTotal(req) : 0;
  const weightRateCharge = req?.receivedWeight && req?.customerRate ? Math.round(req.receivedWeight * req.customerRate) : null;
  const otherCost = parseFloat(req?.otherCost) || 0;
  const discount = parseFloat(req?.discount) || 0;
  const refund = parseFloat(req?.refund) || 0;
  const totalBill = parseInt(req?.shippingChargeCustomer, 10) || 0;
  const totalDue = totalBill - totalPaid;
  const statusLabel = req ? STATUS_BADGE[req.status]?.label || req.status || 'Pending' : '';
  const tracking = req ? (req.trackingNumbers?.length ? req.trackingNumbers : toInvoiceList(req.trackingNo)).filter((t) => t !== '0') : [];
  const cartons = req ? toInvoiceList(req.ctnNo) : [];
  const marks = req ? toInvoiceList(req.shippingMark) : [];
  const method = String(req?.shipBy || req?.method || 'air');
  const isSea = method.toLowerCase() === 'sea';
  const pairCartons = cartons.length > 0 && cartons.length === marks.length;

  return (
    <InvoicePage
      backRoute="ShipMyRequests"
      docType="Ship For Me Invoice"
      docId={bookingId}
      docDate={toIsoDate(req?.date, false)}
      status={req ? invoiceStatusOf(req) : null}
      paid={totalBill > 0 && totalDue <= 0}
      loading={loading}
      notFound={!req}
      onRefresh={onRefresh}
      refreshing={refreshing}
    >
      {req && (
        <>
          <InvoiceSummary total={totalBill} paid={totalPaid} due={totalBill > 0 ? totalDue : null} totalLabel="Shipping Bill" />
          <InvoiceParties
            billTo={billToFromUser(currentUser)}
            details={[
              { label: 'Booking ID', value: `#${req.bookingId}` },
              { label: 'Booked On', value: toIsoDate(req.date, false) },
              { label: 'Ship From', value: req.shipFrom },
              { label: 'Method', value: isSea ? 'By Sea' : 'By Air' },
              { label: 'Status', value: statusLabel },
            ]}
          />

          <InvoiceSection title="Shipment Details">
            <InvoiceGrid columns={3}>
              <InvoiceField label="Product" value={req.othersProductName} />
              <InvoiceField label="Quantity" value={req.productQuantity ? `${req.productQuantity} pcs` : ''} />
              <InvoiceField
                label="Contains"
                value={req.productContains && req.productContains !== 'none' ? req.productContains : 'None'}
                capitalize
              />
              <InvoiceField label="Cartons" value={req.ctnQuantity} />
              <InvoiceField label="Total CBM" value={req.totalCbm ? `${req.totalCbm} cbm` : ''} />
              <InvoiceField
                label="Actual Weight"
                value={req.receivedWeight ? `${req.receivedWeight} kg` : req.weight ? `${req.weight} kg (booked)` : 'Pending'}
              />
            </InvoiceGrid>
            {tracking.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <InvoiceChipRow label="Tracking No" items={tracking} />
              </View>
            )}
          </InvoiceSection>

          {(cartons.length > 0 || marks.length > 0) && (
            <InvoiceSection title={pairCartons ? 'Cartons & Shipping Marks' : 'Cartons'}>
              {pairCartons ? (
                <InvoiceCartonTable cartons={cartons} marks={marks} />
              ) : (
                <>
                  {cartons.length > 0 && <InvoiceChipRow label="Carton No" items={cartons} />}
                  {marks.length > 0 && <InvoiceChipRow label="Shipping Mark" items={marks} />}
                </>
              )}
            </InvoiceSection>
          )}

          <InvoiceSection title="Charges">
            <InvoiceItemsTable
              items={[
                {
                  name: `Shipping — ${isSea ? 'Sea' : 'Air'} freight`,
                  meta: weightRateCharge !== null ? `${req.receivedWeight} kg × ৳${req.customerRate}/kg` : 'Billed on actual weight',
                  qty: req.receivedWeight ? `${req.receivedWeight} kg` : null,
                  unitPrice: req.customerRate ? Number(req.customerRate) : null,
                  amount: weightRateCharge,
                },
              ]}
            />
            <InvoiceTotals>
              {weightRateCharge !== null && <InvoiceRow label="Shipping (weight × rate)" value={tk(weightRateCharge)} />}
              {otherCost > 0 && <InvoiceRow label="Repacking Charge" value={`+${tk(otherCost)}`} />}
              {discount > 0 && <InvoiceRow label="Discount" value={`-${tk(discount)}`} tone="green" />}
              <InvoiceDivider />
              <InvoiceRow bold label="Total Bill" value={totalBill > 0 ? tk(totalBill) : 'Pending'} />
              {totalPaid > 0 && <InvoiceRow label="Paid" value={`-${tk(totalPaid)}`} tone="green" />}
              {refund > 0 && <InvoiceRow label="Refunded" value={tk(refund)} hint="(returned to you)" />}
              <InvoiceDueRow due={totalBill > 0 ? totalDue : null} />
            </InvoiceTotals>
          </InvoiceSection>

          <InvoicePayments payments={req.payments} />
          <InvoiceNotes terms={INVOICE_TERMS} />
        </>
      )}
    </InvoicePage>
  );
}
