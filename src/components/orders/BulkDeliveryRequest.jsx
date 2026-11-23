import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, ScrollView, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Truck, ChevronRight, Check, X, ShoppingBag, Package, Ship } from 'lucide-react-native';
import { C, ORANGE, Press, ScalePress } from '@/components/product/ui';
import { money } from '@/components/dashboard/ui';
import { MethodRow, AddressBlock, NoteBox } from '@/components/orders/DeliveryBits';
import { toast } from '@/lib/toast';
import { submitDeliveryRequests } from '@/lib/firebaseUtils';
import {
  DELIVERY_METHODS,
  DELIVERY_STATUS_LABEL,
  KIND_SHORT,
  canRequestDelivery,
  canChangeDeliveryRequest,
  isPathaoBooked,
  deliveryPaymentState,
  isMethodAllowed,
  deliveryDue,
  paymentBlockers,
  describeBlockers,
  buildDeliveryRequests,
  defaultShippingAddress,
  recordIdOf,
} from '@/lib/deliveryRequest';
import {
  getAllOrdersApiRedux, getAllBookingsOfSingleUserRedux, getAllShipForMeOfSingleUserRedux,
} from '@/store/actions';

/* ═══════════════════════════════════════════════════════════════════════
   Bulk "Request Delivery": every To Receive record of the customer —
   website orders, product requests and Ship For Me — in one sheet, one
   method for all of them (rules in lib/deliveryRequest.js; the records get
   a shared groupId). Reads the same Redux lists the dashboard and the three
   list screens use, refreshes them on open and again after a submit so every
   card shows the new status.

   <BulkDeliveryButton /> is the entry point (button + the modal).
   ═══════════════════════════════════════════════════════════════════════ */

const EMPTY = [];
const GROUPS = [
  { kind: 'order', title: 'Buy & Ship for me', sub: 'Website orders', Icon: ShoppingBag },
  { kind: 'request', title: 'Requested Product', sub: 'Product requests', Icon: Package },
  { kind: 'ship', title: 'Ship for me', sub: 'Only shipment', Icon: Ship },
];
const keyOf = (kind, rec) => `${kind}-${recordIdOf(kind, rec)}`;

const titleOf = (kind, rec) => {
  if (kind === 'order') return (rec.items && rec.items[0] && rec.items[0].name) || rec.shopName || '';
  if (kind === 'request') return rec.productType || rec.othersProductName || '';
  return rec.othersProductName || rec.productType || '';
};

/* All of the customer's To Receive records, as [{ key, kind, record }]. */
function useToReceiveItems() {
  const uid = useSelector((s) => s.user?.currentUser?.id);
  const orders = useSelector((s) => s.orders?.ordersApi || EMPTY);
  const requests = useSelector((s) => s.bookingRequests?.bookingsArrayOfSingleUser || EMPTY);
  const shipments = useSelector((s) => s.bookingRequests?.shipForMeOfSingleUser || EMPTY);
  return useMemo(() => {
    if (!uid) return EMPTY;
    const pick = (kind, list) =>
      list.filter((r) => canRequestDelivery(kind, r)).map((record) => ({ key: keyOf(kind, record), kind, record }));
    return [...pick('order', orders), ...pick('request', requests), ...pick('ship', shipments)];
  }, [uid, orders, requests, shipments]);
}

function useReloadLists() {
  const dispatch = useDispatch();
  const uid = useSelector((s) => s.user?.currentUser?.id);
  return useCallback(() => {
    if (!uid) return Promise.resolve();
    return Promise.allSettled([
      dispatch(getAllOrdersApiRedux(uid)),
      dispatch(getAllBookingsOfSingleUserRedux(uid)),
      dispatch(getAllShipForMeOfSingleUserRedux(uid)),
    ]);
  }, [dispatch, uid]);
}

function Pill({ label, tone }) {
  return (
    <View style={{ paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 999, borderWidth: 1, borderColor: tone.border, backgroundColor: tone.bg }}>
      <Text style={{ fontSize: 8.5, fontWeight: '800', color: tone.fg }} numberOfLines={1}>{label}</Text>
    </View>
  );
}
/* Item tint by payment: fully paid green, part paid yellow, nothing paid or
   not billed yet red. A ticked item gets a stronger border in the same hue. */
const PAY_TONE = {
  paid: { bg: '#f7fcf9', border: '#ddf0e4', on: '#7cc79a', pill: { bg: '#eaf6ee', border: '#d6ecdf', fg: '#2f7a4d' } },
  partial: { bg: '#fffcf3', border: '#f3e6c2', on: '#e2bc5c', pill: { bg: '#fbf1d6', border: '#f1e1b4', fg: '#8a6414' } },
  unpaid: { bg: '#fff8f7', border: '#f5dedb', on: '#e9958d', pill: { bg: '#fcebe9', border: '#f5d6d2', fg: '#b04a40' } },
};
PAY_TONE.not_billed = PAY_TONE.unpaid;
const TONE = {
  stage: { bg: '#f2edff', border: '#e3daf9', fg: '#7350c0' },
  paid: { bg: '#ecf9f1', border: '#d3eedd', fg: '#22814f' },
  due: { bg: '#fff1e6', border: '#fbdcc4', fg: '#d95b07' },
};

function ItemRow({ item, checked, onToggle }) {
  const { kind, record } = item;
  const locked = !canChangeDeliveryRequest(record);
  const req = record.deliveryRequest;
  const pay = deliveryPaymentState(kind, record);
  const tone = PAY_TONE[pay];
  const status = isPathaoBooked(record)
    ? `Pathao Booked · ${record.pathaoBooking.consignmentId}`
    : req
      ? `${DELIVERY_STATUS_LABEL[req.status] || DELIVERY_STATUS_LABEL.requested}${req.label ? ` · ${req.label}` : ''}`
      : '';

  return (
    <Press
      onPress={() => onToggle(item.key)}
      disabled={locked}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled: locked }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingHorizontal: 10,
        paddingVertical: 9,
        borderRadius: 12,
        borderWidth: checked && !locked ? 1.5 : 1,
        borderColor: locked ? C.gray200 : checked ? tone.on : tone.border,
        backgroundColor: locked ? C.gray50 : tone.bg,
        opacity: locked ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 20, height: 20, marginTop: 1, borderRadius: 6, borderWidth: 2,
          borderColor: locked ? C.gray300 : checked ? tone.on : C.gray300,
          backgroundColor: checked && !locked ? tone.on : '#ffffff',
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        {checked && !locked ? <Check size={12} color="#ffffff" strokeWidth={3} /> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 11.5, fontWeight: '800', color: C.gray800 }} numberOfLines={1}>#{recordIdOf(kind, record)}</Text>
        {titleOf(kind, record) ? (
          <Text style={{ fontSize: 10, color: C.gray500, marginTop: 1 }} numberOfLines={1}>{titleOf(kind, record)}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
          <Pill label="To Receive" tone={TONE.stage} />
          <Pill
            tone={tone.pill}
            label={pay === 'paid' ? 'Fully paid'
              : pay === 'not_billed' ? 'Not billed yet'
                : `${money(deliveryDue(kind, record))} due${pay === 'partial' ? ' · part paid' : ''}`}
          />
        </View>
        {status ? (
          <Text style={{ fontSize: 9.5, fontWeight: '700', color: locked ? C.gray500 : '#1d4ed8', marginTop: 5 }} numberOfLines={2}>
            {status}{locked ? ' — already requested; you can request again only if Paicart rejects it' : ''}
          </Text>
        ) : null}
      </View>
    </Press>
  );
}

export function BulkDeliveryRequestModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const currentUser = useSelector((s) => s.user?.currentUser);
  const items = useToReceiveItems();
  const reload = useReloadLists();

  const [loading, setLoading] = useState(false);
  const [preselected, setPreselected] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [methodKey, setMethodKey] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* Fresh state + fresh data on every open. */
  useEffect(() => {
    if (!visible) return;
    setPreselected(false);
    setSelected(new Set());
    setMethodKey(null);
    setNote('');
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [visible, reload]);

  /* Preselect, once the lists are in. */
  useEffect(() => {
    if (!visible || loading || preselected) return;
    /* preselect only the fully paid items that can be requested */
    setSelected(new Set(items.filter((it) => canChangeDeliveryRequest(it.record) && deliveryPaymentState(it.kind, it.record) === 'paid').map((it) => it.key)));
    setPreselected(true);
  }, [visible, loading, preselected, items]);

  const chosen = useMemo(
    () => items.filter((it) => selected.has(it.key) && canChangeDeliveryRequest(it.record)),
    [items, selected],
  );
  const blockers = useMemo(() => paymentBlockers(chosen.map(({ kind, record }) => ({ kind, record }))), [chosen]);
  const allPaid = blockers.length === 0;

  /* A full-payment method stops being valid once an unpaid item is ticked. */
  useEffect(() => {
    const m = DELIVERY_METHODS.find((x) => x.key === methodKey);
    if (m && !isMethodAllowed(m, allPaid)) setMethodKey(null);
  }, [allPaid, methodKey]);

  const toggle = useCallback((key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const unselectUnpaid = () => {
    const bad = new Set(blockers.map((b) => `${b.kind}-${b.id}`));
    setSelected((prev) => new Set([...prev].filter((k) => !bad.has(k))));
  };

  const address = defaultShippingAddress(currentUser);
  const changeable = items.filter((it) => canChangeDeliveryRequest(it.record));

  const submit = async () => {
    if (submitting) return;
    let list;
    try {
      list = buildDeliveryRequests(
        chosen.map(({ kind, record }) => ({ kind, record })),
        methodKey,
        { note, userId: currentUser?.id, address, source: 'customer' },
      );
    } catch (e) {
      toast.error(e.message || 'Could not prepare the delivery request.');
      return;
    }
    setSubmitting(true);
    try {
      await submitDeliveryRequests(list);
      toast.success(`Delivery requested for ${list.length} item${list.length === 1 ? '' : 's'}`);
      onClose();
      reload();
    } catch (e) {
      console.error('submitDeliveryRequests', e);
      toast.error('Could not submit the delivery request. Please try again.');
    }
    setSubmitting(false);
  };

  const lockedHint = allPaid
    ? ''
    : `Not fully paid: ${describeBlockers(blockers)}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 10, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}>
          <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,27,36,0.48)' }} />
          <View style={{ maxHeight: '100%', borderRadius: 20, borderWidth: 1, borderColor: '#e9edf1', backgroundColor: '#ffffff', overflow: 'hidden', boxShadow: '0 22px 60px rgba(15,23,32,0.25)' }}>
            {/* header */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingHorizontal: 15, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f0f2f4' }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 9.5, fontWeight: '800', letterSpacing: 1.1, color: '#e66a1b', marginBottom: 5 }}>PAICART · TO RECEIVE</Text>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#222b35' }}>Request Delivery</Text>
                <Text style={{ fontSize: 11, color: '#87919c', marginTop: 4 }}>Pick the items to deliver together and one delivery method.</Text>
              </View>
              <Press
                onPress={onClose}
                accessibilityLabel="Close"
                style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 11, borderWidth: 1, borderColor: '#edf0f3', alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? '#f6f7f9' : '#ffffff' })}
              >
                <X size={17} color="#687482" />
              </Press>
            </View>

            <ScrollView contentContainerStyle={{ padding: 12, gap: 14 }} keyboardShouldPersistTaps="handled">
              {loading && !items.length ? (
                <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                  <ActivityIndicator color={ORANGE} />
                </View>
              ) : !items.length ? (
                <Text style={{ fontSize: 12, color: C.gray500, textAlign: 'center', paddingVertical: 24 }}>
                  Nothing is waiting in To Receive right now.
                </Text>
              ) : (
                <>
                  {/* items, grouped by kind */}
                  {GROUPS.map((g) => {
                    const list = items.filter((it) => it.kind === g.kind);
                    if (!list.length) return null;
                    const GIcon = g.Icon;
                    return (
                      <View key={g.kind} style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginLeft: 2 }}>
                          <GIcon size={14} color={ORANGE} />
                          <Text style={{ fontSize: 12, fontWeight: '800', color: C.gray800 }}>{g.title}</Text>
                          <Text style={{ fontSize: 10, color: C.gray400 }}>· {g.sub} ({list.length})</Text>
                        </View>
                        {list.map((it) => (
                          <ItemRow key={it.key} item={it} checked={selected.has(it.key)} onToggle={toggle} />
                        ))}
                      </View>
                    );
                  })}
                  {loading ? <Text style={{ fontSize: 10, color: C.gray400, textAlign: 'center' }}>Refreshing…</Text> : null}

                  {changeable.length ? (
                    <>
                      {/* methods */}
                      <View style={{ gap: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: C.gray700, marginLeft: 2 }}>
                          Select delivery method{chosen.length ? ` · ${chosen.length} item${chosen.length === 1 ? '' : 's'}` : ''}
                        </Text>
                        {DELIVERY_METHODS.map((m) => (
                          <MethodRow
                            key={m.key}
                            method={m}
                            selected={methodKey === m.key}
                            locked={!isMethodAllowed(m, allPaid)}
                            onPress={() => setMethodKey(m.key)}
                          />
                        ))}
                        {!allPaid && chosen.length ? (
                          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: C.amber200, backgroundColor: C.amber50, paddingHorizontal: 12, paddingVertical: 10 }}>
                            <Text style={{ fontSize: 10.5, lineHeight: 15, color: '#92400e' }}>
                              <Text style={{ fontWeight: '800' }}>Van / Truck and Sundorbon need every selected item fully paid. </Text>
                              {lockedHint}
                            </Text>
                            <Press onPress={unselectUnpaid} hitSlop={6} style={{ alignSelf: 'flex-start', marginTop: 6 }}>
                              {({ pressed }) => (
                                <Text style={{ fontSize: 11, fontWeight: '800', color: ORANGE, textDecorationLine: 'underline', opacity: pressed ? 0.6 : 1 }}>
                                  Unselect unpaid
                                </Text>
                              )}
                            </Press>
                          </View>
                        ) : null}
                      </View>

                      <AddressBlock address={address} onBeforeNavigate={onClose} />
                      <NoteBox value={note} onChange={setNote} />

                      <ScalePress
                        onPress={submit}
                        disabled={submitting || !methodKey || !chosen.length}
                        style={{
                          paddingVertical: 12, borderRadius: 12, backgroundColor: ORANGE,
                          opacity: submitting || !methodKey || !chosen.length ? 0.55 : 1,
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                      >
                        {submitting ? <ActivityIndicator size="small" color="#ffffff" /> : <Truck size={14} color="#ffffff" />}
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
                          {submitting
                            ? 'Submitting…'
                            : chosen.length
                              ? `Submit Request (${chosen.length})`
                              : 'Select items to deliver'}
                        </Text>
                      </ScalePress>
                    </>
                  ) : (
                    <Text style={{ fontSize: 11, color: C.gray500, textAlign: 'center' }}>
                      Every To Receive item already has a delivery Paicart is handling.
                    </Text>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* Entry point: "Request delivery for several items" + the modal.
   hideWhenEmpty: render nothing unless a To Receive item can still be
   requested (the dashboard uses it; the list screens show it on their
   To Receive tab regardless, since the other kinds may not be loaded yet). */
export function BulkDeliveryButton({ style, hideWhenEmpty = false }) {
  const [open, setOpen] = useState(false);
  const items = useToReceiveItems();
  const openable = items.filter((it) => canChangeDeliveryRequest(it.record));
  const pending = openable.filter((it) => !it.record.deliveryRequest).length;
  const close = useCallback(() => setOpen(false), []);
  if (hideWhenEmpty && !openable.length) return null;

  return (
    <>
      <Press
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={({ pressed }) => [
          {
            flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11,
            borderRadius: 14, borderWidth: 1, borderColor: C.orange200, backgroundColor: pressed ? C.orange100 : C.orange50,
          },
          style,
        ]}
      >
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
          <Truck size={16} color={ORANGE} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#c2410c' }}>Request delivery for several items</Text>
          <Text style={{ fontSize: 10, color: '#9a6a4c', marginTop: 2 }} numberOfLines={1}>
            {pending
              ? `${pending} To Receive item${pending === 1 ? '' : 's'} without a delivery request`
              : `${KIND_SHORT.order}s, product requests and Ship for me together`}
          </Text>
        </View>
        <ChevronRight size={16} color={ORANGE} />
      </Press>
      <BulkDeliveryRequestModal visible={open} onClose={close} />
    </>
  );
}
