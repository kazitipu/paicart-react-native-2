import React, { useState, useEffect, useCallback } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import {
  ArrowLeft, Package, Plane, Ship, MapPin, Calendar, Hash, Weight, Box, Layers, Pencil, Check, Truck, Navigation2,
  CreditCard, FileText,
} from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import CopyIdButton from '@/components/CopyIdButton';
import ProductImage from '@/components/ui/ProductImage';
import ShipmentPaymentModal from '@/components/shipping/ShipmentPaymentModal';
import ShipmentEditModal from '@/components/shipping/ShipmentEditModal';
import StartShippingModal from '@/components/shipping/StartShippingModal';
import { ShippingInfoCard, DocxPreviewModal, ImagePreview, openExternal } from '@/components/shipping/ShipmentDocs';
import { sf, SC, StatusBadge, PaymentBadge, ShipmentProgressVertical } from '@/components/shipping/ShipBits';
import { fs } from '@/components/orders/OrderBits';
import { C, ORANGE, Press, ScalePress, Spinner } from '@/components/product/ui';
import { getAllShipForMeOfSingleUserRedux, updateShipForMeRedux, updateShipmentRequestRedux } from '@/store/actions';
import { canPayShipment, getTotal } from '@/lib/shipForMe';
import { readyStepLabel } from '@/lib/shipment';
import { toast } from '@/lib/toast';
import { TABS } from '@/navigation/routes';

/* ═══════════════════════════════════════════════════════════════════════
   Web pages/dashboard/ship-for-me/my-request/[bookingId]/page.jsx, < 640px.
   DashboardLayout `webChrome` ("Request Detail", no back arrow — the page's
   own "← My Requests" link is the way back), then `.sfm-detail-root` (type
   shrunk — `sf`): back/invoice row, the summary card, the vertical
   progress, and the three detail tables stacked (grid-cols-1 below sm).
   Reads the user's Ship For Me list exactly as the web does and picks the
   booking out of it.
   ═══════════════════════════════════════════════════════════════════════ */

const CARD_SHADOW = '0 4px 16px -4px rgba(28,28,28,0.08), 0 2px 6px -2px rgba(28,28,28,0.04)';
const isDocFile = (url) => /\.docx?($|\?)/i.test(url || '');
const isImageFile = (url) => /\.(png|jpe?g|gif|webp|bmp)($|\?)/i.test(url || '');

function Dash() {
  return <Text style={{ color: C.gray300 }}>—</Text>;
}

/* `bg-white rounded-2xl border border-gray-100 overflow-hidden`, tinted
   header `px-3 py-2 border-b`, rows `divide-y divide-gray-50 px-3 py-1.5`. */
function InfoTable({ title, tint, color, rows, capitalize, footer }) {
  return (
    <View style={{ backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: C.gray100, overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: tint, borderBottomWidth: 1, borderBottomColor: C.gray100 }}>
        <Text style={[sf(10), { fontWeight: '800', color, textTransform: 'uppercase', letterSpacing: 0.9 }]}>{title}</Text>
      </View>
      <View>
        {rows.map(([k, v], i) => (
          <View
            key={k}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderTopWidth: i > 0 ? 1 : 0,
              borderTopColor: C.gray50,
            }}
          >
            <Text style={[sf(11), { color: C.gray500, flexShrink: 0 }]}>{k}:</Text>
            <Text
              style={[
                sf(11),
                { fontWeight: '600', color: C.gray800, textAlign: 'right', flexShrink: 1, textTransform: capitalize ? 'capitalize' : 'none' },
              ]}
            >
              {v || <Dash />}
            </Text>
          </View>
        ))}
        {footer}
      </View>
    </View>
  );
}

function FileRow({ label, children }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: C.gray50,
      }}
    >
      <Text style={[sf(11), { color: C.gray500 }]}>{label}</Text>
      {children}
    </View>
  );
}

function Thumb({ uri, onPress }) {
  return (
    <Press onPress={onPress} accessibilityLabel="Enlarge image" style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
      <View style={{ width: 48, height: 48, borderRadius: 8, borderWidth: 1, borderColor: C.gray100, overflow: 'hidden' }}>
        <ProductImage uri={uri} style={{ width: '100%', height: '100%' }} />
      </View>
    </Press>
  );
}

function LinkText({ children, onPress }) {
  return (
    <Press onPress={onPress} hitSlop={6}>
      {({ pressed }) => (
        <Text style={[sf(11), { fontWeight: '600', color: SC.blue500, textDecorationLine: pressed ? 'underline' : 'none' }]}>{children}</Text>
      )}
    </Press>
  );
}

export default function ShipRequestDetail() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { bookingId } = route.params || {};

  const currentUser = useSelector((s) => s.user?.currentUser);
  const requests = useSelector((s) => s.bookingRequests?.shipForMeOfSingleUser || []);

  const [editingReq, setEditingReq] = useState(null);
  const [saving, setSaving] = useState(false);
  const [startShipReq, setStartShipReq] = useState(null);
  const [startSubmitting, setStartSubmitting] = useState(false);
  const [paymentReq, setPaymentReq] = useState(null);
  const [docxPreviewUrl, setDocxPreviewUrl] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [fetched, setFetched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    () => (currentUser?.id ? Promise.resolve(dispatch(getAllShipForMeOfSingleUserRedux(currentUser.id))) : Promise.resolve()),
    [currentUser?.id, dispatch],
  );

  useEffect(() => {
    if (currentUser?.id) load().finally(() => setFetched(true));
  }, [currentUser?.id, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  };

  /* bookingId from the route may be number or string */
  const req = requests.find((r) => String(r.bookingId) === String(bookingId));

  const backToList = () => {
    const routes = navigation.getState?.()?.routes || [];
    const prev = routes[routes.length - 2];
    if (prev?.name === 'ShipMyRequests') navigation.goBack();
    else navigation.navigate('ShipMyRequests');
  };
  const openInvoice = () => navigation.navigate('ShipmentInvoice', { bookingId: req.bookingId });

  const handleSave = async (updated) => {
    setSaving(true);
    try {
      await dispatch(updateShipForMeRedux(updated));
      toast.success('Request updated successfully!');
      setEditingReq(null);
    } catch {
      toast.error('Failed to update. Please try again.');
    }
    setSaving(false);
  };

  const handleStartShipping = async () => {
    setStartSubmitting(true);
    try {
      await dispatch(updateShipmentRequestRedux({ ...startShipReq, shipping: true, readTermsAndConditions: true }));
      toast.success('Shipping started! Please send your parcel to the warehouse.');
      setStartShipReq(null);
      load();
    } catch {
      toast.error('Failed to start shipping. Please try again.');
    }
    setStartSubmitting(false);
  };

  if (!req) {
    const busy = !fetched || !currentUser;
    /* Outside `.sfm-detail-root` on the web, so this copy is full size. */
    return (
      <DashboardLayout webChrome title="Request Detail" onRefresh={currentUser ? onRefresh : null} refreshing={refreshing}>
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
          <View style={{ marginBottom: 16 }}>{busy ? <Spinner size={32} color={ORANGE} /> : <Package size={40} color={C.gray200} />}</View>
          <Text style={[fs('sm'), { fontWeight: '600', color: C.gray400, marginBottom: 4 }]}>{busy ? 'Loading…' : 'Request not found'}</Text>
          {fetched && (
            <Press onPress={backToList} style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {({ pressed }) => (
                <>
                  <ArrowLeft size={14} color={ORANGE} />
                  <Text style={[fs('sm'), { fontWeight: '700', color: ORANGE, textDecorationLine: pressed ? 'underline' : 'none' }]}>
                    Back to My Requests
                  </Text>
                </>
              )}
            </Press>
          )}
        </View>
      </DashboardLayout>
    );
  }

  const method = req.shipBy || req.method || '';
  const canEdit = !req.status || req.status === 'Pending';
  const canStartShip = req.status === 'Rates Provided' && !req.shipping;
  const hasCharge = !!req.shippingChargeCustomer;
  const canPayNow = canPayShipment(req);
  const trackingChips = req.trackingNo
    ? String(req.trackingNo)
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  const stats = [
    { Icon: Weight, label: 'Weight', value: req.receivedWeight ? `${req.receivedWeight} kg` : req.weight ? `${req.weight} kg` : '—' },
    { Icon: Box, label: 'Qty', value: req.productQuantity || '—' },
    { Icon: Layers, label: 'CBM', value: req.totalCbm || '—' },
    { Icon: Hash, label: 'Rate/kg', value: req.customerRate ? `৳${req.customerRate}` : req.result?.perKg ? `৳${req.result.perKg}` : '—' },
  ];

  const bannerTone = canPayNow
    ? { borderColor: '#fde68a', backgroundColor: '#fef6e0' }
    : req.paymentStatus === 'Paid'
      ? { borderColor: '#bbf7d0', backgroundColor: '#e5f9e9' }
      : { borderColor: '#e2e8f0', backgroundColor: '#f8fafc' };

  const meta = [sf(11), { color: C.gray400 }];

  return (
    <View style={{ flex: 1 }}>
      <DashboardLayout
        webChrome
        title="Request Detail"
        onRefresh={onRefresh}
        refreshing={refreshing}
        overlays={
          <>
            <ShipmentEditModal booking={editingReq} onClose={() => setEditingReq(null)} onSave={handleSave} saving={saving} />
            <StartShippingModal
              booking={startShipReq}
              onClose={() => setStartShipReq(null)}
              onSubmit={handleStartShipping}
              submitting={startSubmitting}
              onTerms={() => navigation.navigate(TABS.MORE, { screen: 'Terms' })}
            />
            <DocxPreviewModal url={docxPreviewUrl} onClose={() => setDocxPreviewUrl(null)} />
            <ImagePreview uri={imagePreview} onClose={() => setImagePreview(null)} />
          </>
        }
      >
        <Animated.View entering={FadeIn.duration(220)} style={{ gap: 16 }}>
          {/* Back link */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Press onPress={backToList} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {({ pressed }) => (
                <>
                  <ArrowLeft size={15} color={pressed ? ORANGE : C.gray500} />
                  <Text style={[sf('sm'), { fontWeight: '600', color: pressed ? ORANGE : C.gray500 }]}>My Requests</Text>
                </>
              )}
            </Press>
            {hasCharge && (
              <ScalePress
                onPress={openInvoice}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: '#a3422b',
                }}
              >
                <FileText size={12} color="#ffffff" />
                <Text style={[sf('xs'), { fontWeight: '700', color: '#ffffff' }]}>Invoice</Text>
              </ScalePress>
            )}
          </View>

          {/* ── Summary card ── */}
          <View
            style={{ backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: C.gray100, overflow: 'hidden', boxShadow: CARD_SHADOW }}
          >
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <Press
                  onPress={req.imageUrl ? () => setImagePreview(req.imageUrl) : undefined}
                  disabled={!req.imageUrl}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.gray100,
                    backgroundColor: C.gray50,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {req.imageUrl ? (
                    <ProductImage uri={req.imageUrl} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Package size={22} color={C.gray200} />
                  )}
                </Press>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[sf('base'), { fontWeight: '700', color: C.gray800 }]}>{req.othersProductName || '—'}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <StatusBadge status={req.status} req={req} />
                    <PaymentBadge status={req.paymentStatus} />
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Hash size={10} color={C.gray400} />
                      <Text style={meta}>{req.bookingId}</Text>
                      <CopyIdButton value={req.bookingId} />
                    </View>
                    {!!method && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: C.gray50,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        {method === 'air' ? <Plane size={10} color={SC.blue500} /> : <Ship size={10} color={SC.teal500} />}
                        <Text style={[sf(11), { color: C.gray500, textTransform: 'capitalize' }]}>{method}</Text>
                      </View>
                    )}
                    {!!req.shipFrom && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MapPin size={10} color={C.gray400} />
                        <Text style={[meta, { textTransform: 'capitalize' }]}>{req.shipFrom}</Text>
                      </View>
                    )}
                    {!!req.date && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Calendar size={10} color={C.gray400} />
                        <Text style={meta}>{req.date}</Text>
                      </View>
                    )}
                  </View>

                  {trackingChips.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {trackingChips.map((t, i) => (
                        <View
                          key={i}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 8,
                            backgroundColor: SC.TEAL,
                            boxShadow: '0 1px 6px rgba(13,148,136,0.267)',
                          }}
                        >
                          <Navigation2 size={9} color="#ffffff" />
                          <Text style={[sf(11), { fontWeight: '700', color: '#ffffff' }]}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Stats */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                {stats.map(({ Icon, label, value }) => (
                  <View
                    key={label}
                    style={{ flex: 1, minWidth: 0, backgroundColor: C.gray50, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center' }}
                  >
                    <View style={{ marginBottom: 2 }}>
                      <Icon size={11} color={C.gray400} />
                    </View>
                    <Text style={[sf(9), { color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.2 }]}>{label}</Text>
                    <Text style={[sf('xs'), { fontWeight: '700', color: C.gray700 }]} numberOfLines={1}>
                      {value}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Charge banner */}
              {hasCharge && (
                <View style={[{ marginTop: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1 }, bannerTone]}>
                  <View
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <View style={{ flexShrink: 1 }}>
                      <Text style={[sf(10), { fontWeight: '600', color: C.gray500, textTransform: 'uppercase', letterSpacing: 0.225 }]}>
                        Shipping Charge
                      </Text>
                      <Text style={[sf('lg'), { fontWeight: '800', color: C.gray800 }]}>
                        ৳{req.shippingChargeCustomer} <Text style={[sf('xs'), { fontWeight: '500', color: C.gray400 }]}>Tk</Text>
                      </Text>
                      {!!(req.receivedWeight && req.customerRate) && (
                        <Text style={[sf(10), { color: C.gray400 }]}>
                          {req.receivedWeight} kg × ৳{req.customerRate}/kg
                        </Text>
                      )}
                    </View>
                    <View>
                      {req.paymentStatus === 'Paid' ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 12,
                            backgroundColor: '#00B42A',
                            boxShadow: '0 2px 8px rgba(34,197,94,0.267)',
                          }}
                        >
                          <Check size={11} color="#ffffff" />
                          <Text style={[sf('xs'), { fontWeight: '800', color: '#ffffff' }]}>Paid</Text>
                        </View>
                      ) : req.paymentRequested ? (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 12,
                            backgroundColor: '#FABC16',
                            boxShadow: '0 2px 8px rgba(245,158,11,0.267)',
                          }}
                        >
                          <Spinner size={11} color="#ffffff" />
                          <Text style={[sf('xs'), { fontWeight: '800', color: '#ffffff' }]}>Payment Pending</Text>
                        </View>
                      ) : canPayNow ? (
                        <ScalePress
                          onPress={() => setPaymentReq(req)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 12,
                            backgroundColor: ORANGE,
                            boxShadow: '0 4px 14px rgba(255,106,0,0.333)',
                          }}
                        >
                          <CreditCard size={13} color="#ffffff" />
                          <Text style={[sf('sm'), { fontWeight: '800', color: '#ffffff' }]}>Pay Now</Text>
                        </ScalePress>
                      ) : null}
                    </View>
                  </View>
                </View>
              )}

              {/* Action buttons */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12 }}>
                {canStartShip && (
                  <Press
                    onPress={() => setStartShipReq(req)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: SC.TEAL,
                      boxShadow: '0 2px 8px rgba(13,148,136,0.333)',
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Truck size={11} color="#ffffff" />
                    <Text style={[sf('xs'), { fontWeight: '700', color: '#ffffff' }]}>Start Shipping</Text>
                  </Press>
                )}
                {canEdit && (
                  <Press
                    onPress={() => setEditingReq(req)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: ORANGE,
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Pencil size={11} color="#ffffff" />
                    <Text style={[sf('xs'), { fontWeight: '700', color: '#ffffff' }]}>Edit</Text>
                  </Press>
                )}
              </View>
            </View>

            {req.status === 'Rates Provided' && !!(req.warehouse || req.shippingMark) && (
              <ShippingInfoCard booking={req} currentUser={currentUser} />
            )}
          </View>

          {/* ── Shipment Progress (the mobile vertical stepper) ── */}
          <View style={{ backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: C.gray100, padding: 16 }}>
            <ShipmentProgressVertical score={req.shipmentStatusScore || 1} req={req} />
          </View>

          {/* ── Detail tables (one column below sm) ── */}
          <InfoTable
            title="Product Information"
            tint="rgba(255,106,0,0.06)"
            color={ORANGE}
            capitalize
            rows={[
              ['Product Category', req.productType],
              ['Total Price', req.productsTotalCost ? `${req.productsTotalCost}Tk` : null],
              ['Origin Country', req.shipFrom],
              ['Ship By', req.shipBy || req.method],
              ['Ship to', req.shipTo],
              ['Valid to', req.validTo],
              ['Brand/Non-brand', req.productBrand],
              ['Product Contains', req.productContains],
              ['Carton Quantity', req.ctnQuantity],
              ['Total CBM', req.totalCbm],
              ['Product details', req.productVariant],
              ['Status', req.status || 'Pending'],
              ['Payment Status', req.paymentStatus || 'Not Paid'],
              ['Received weight', req.receivedWeight ? `${req.receivedWeight}Kg` : null],
              ['Rate/kg', req.customerRate ? `${req.customerRate}Tk` : null],
              ['Packaging & other cost', req.otherCost ? `${req.otherCost}Tk` : null],
              ['Discount', req.discount ? `${req.discount}Tk` : null],
              ['Refund amount', req.refund ? `${req.refund}Tk` : null],
              ['Total shipping charge', req.shippingChargeCustomer ? `${req.shippingChargeCustomer}Tk` : null],
              ['Total Paid', `${getTotal(req)}Tk`],
              ['Refund note', req.refundNote],
            ]}
            footer={
              <>
                <FileRow label="Waybill Image:">
                  {req.waybillImage ? <Thumb uri={req.waybillImage} onPress={() => setImagePreview(req.waybillImage)} /> : <Text style={[sf(11), { color: C.gray300 }]}>—</Text>}
                </FileRow>
                <FileRow label="Packing List:">
                  {req.packingListUrl ? (
                    isImageFile(req.packingListUrl) ? (
                      <Thumb uri={req.packingListUrl} onPress={() => setImagePreview(req.packingListUrl)} />
                    ) : isDocFile(req.packingListUrl) ? (
                      <LinkText onPress={() => setDocxPreviewUrl(req.packingListUrl)}>Preview File</LinkText>
                    ) : (
                      <LinkText onPress={() => openExternal(req.packingListUrl)}>View File</LinkText>
                    )
                  ) : (
                    <Text style={[sf(11), { color: C.gray300 }]}>—</Text>
                  )}
                </FileRow>
              </>
            }
          />

          <InfoTable
            title="Shipping Status"
            tint="rgba(22,119,255,0.06)"
            color={SC.blue600}
            rows={[
              ['Booking Date', req.date],
              ['Rates Provided', req['Rates ProvidedDate']],
              ['Abroad Warehouse', req['Received in WarehouseDate']],
              /* Label follows the freight mode; the stored key does not. */
              [readyStepLabel(req), req['Ready for flyDate']],
              ['🇧🇩 Bangladesh customs', req['Bangladesh customsDate'] || req['Bangladesh warehouseDate']],
              ['Custom Released', req['Bangladesh warehouseDate']],
              ['Paicart Warehouse', req['Paicart warehouseDate']],
              ['Delivered', req.DeliveredDate],
              ['Delivered by', req.deliveredBy],
            ]}
          />

          <InfoTable
            title="Shipping Information"
            tint="rgba(0,184,169,0.06)"
            color={SC.teal600}
            rows={[
              ['Customer Name', req.displayName],
              ['Shipping mark', req.shippingMark],
              [
                'Tracking No',
                (req.trackingNumbers?.length ? req.trackingNumbers : req.trackingNo?.split?.(',').filter(Boolean))?.join(', ') || req.trackingNo,
              ],
              ['Cargo company', 'AR shipper'],
              ['Lot Number', req.lotNo ? req.lotNo.toString().replace('CB', 'AR') : null],
              ['Carton number', req.ctnNo ? req.ctnNo.toString().replace('CB', 'AR') : null],
            ]}
          />
        </Animated.View>
      </DashboardLayout>

      {/* Web: onSuccess refetches the user's Ship For Me list; the sheet closes itself. */}
      <ShipmentPaymentModal
        visible={!!paymentReq && !!currentUser}
        bookings={paymentReq ? [paymentReq] : []}
        currentUser={currentUser}
        onClose={() => setPaymentReq(null)}
        onSuccess={() => {
          load();
        }}
      />
    </View>
  );
}
