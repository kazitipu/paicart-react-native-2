import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  getAllOrdersApiRedux, getAllBookingsOfSingleUserRedux, getAllShipForMeOfSingleUserRedux,
} from '@/store/actions';
import { Truck, ChevronDown, ChevronUp, CheckCircle2, PackageCheck, XCircle } from 'lucide-react-native';
import { C, ORANGE, Press, ScalePress } from '@/components/product/ui';
import { MethodRow, AddressBlock, NoteBox, blockerHint } from '@/components/orders/DeliveryBits';
import { useDashboardKeyboard } from '@/components/DashboardLayout';
import { toast } from '@/lib/toast';
import { submitDeliveryRequest } from '@/lib/firebaseUtils';
import {
  DELIVERY_METHODS,
  DELIVERY_STATUS_LABEL,
  canRequestDelivery,
  isFullyPaid,
  isMethodAllowed,
  isPathaoBooked,
  canChangeDeliveryRequest,
  buildDeliveryRequest,
  recordIdOf,
  paymentBlockers,
  defaultShippingAddress,
} from '@/lib/deliveryRequest';

/* ═══════════════════════════════════════════════════════════════════════
   "Request Delivery" for a To Receive record — website order ('order'),
   product request ('request') or Ship For Me parcel ('ship'). All rules
   live in lib/deliveryRequest.js (shared verbatim with the website).

   States:
   - no request yet → light-orange "Request Delivery" button that expands
     the method picker inline;
   - request on the record → status strip (+ "Change" while Paicart has not
     acted on it, which reopens the picker preselected; a cancelled request
     shows grey with "Choose again");
   - Pathao booked → orange strip with the tracking ID, no change.

   After a successful submit the request is kept locally so the strip shows
   at once; a refetched record carrying the same or a later request wins.
   ═══════════════════════════════════════════════════════════════════════ */

const STRIP_TONE = {
  requested: { bg: '#eff6ff', border: '#bfdbfe', fg: '#1d4ed8', Icon: CheckCircle2 },
  arranged: { bg: '#ecfdf5', border: '#a7f3d0', fg: '#047857', Icon: CheckCircle2 },
  delivered: { bg: '#ecfdf5', border: '#a7f3d0', fg: '#047857', Icon: PackageCheck },
  cancelled: { bg: '#fff3f2', border: '#f8d3d0', fg: '#b4271d', Icon: XCircle },
};

export default function DeliveryRequestPanel({ kind, record, style }) {
  const dispatch = useDispatch();
  const currentUser = useSelector((s) => s.user?.currentUser);
  const uid = currentUser?.id;
  const kb = useDashboardKeyboard();
  const panelRef = useRef(null);
  const noteRef = useRef(null);

  const [localReq, setLocalReq] = useState(null);
  const [open, setOpen] = useState(false);
  const [methodKey, setMethodKey] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  /* A newer request from the server (or one Paicart has acted on) replaces
     the local copy; equal timestamps mean the same submission — take the
     server's, it may carry an updated status. */
  const serverReq = record?.deliveryRequest || null;
  const current =
    localReq && (!serverReq || (Number(localReq.requestedAt) || 0) > (Number(serverReq.requestedAt) || 0))
      ? localReq
      : serverReq;
  const rec = current === serverReq ? record : { ...record, deliveryRequest: current };

  useEffect(() => {
    if (open && kb?.reveal) setTimeout(() => kb.reveal(panelRef), 80);
  }, [open, kb]);

  if (!record || !canRequestDelivery(kind, record)) return null;

  const fullyPaid = isFullyPaid(kind, rec);
  const lockHint = fullyPaid ? '' : blockerHint(paymentBlockers([{ kind, record: rec }])[0]);
  const address = defaultShippingAddress(currentUser);

  /* ── Pathao booked: tracking only ── */
  if (isPathaoBooked(rec)) {
    return (
      <View
        style={[
          { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: C.orange200, backgroundColor: C.orange50, paddingHorizontal: 12, paddingVertical: 10 },
          style,
        ]}
      >
        <Truck size={15} color={ORANGE} />
        <Text style={{ flex: 1, fontSize: 11.5, color: '#9a3412' }}>
          <Text style={{ fontWeight: '800' }}>Pathao Booked</Text> · Tracking ID:{' '}
          <Text style={{ fontWeight: '800' }} selectable>{rec.pathaoBooking.consignmentId}</Text>
        </Text>
      </View>
    );
  }

  const changeable = canChangeDeliveryRequest(rec);
  const req = rec.deliveryRequest;

  const startEdit = () => {
    /* Change → previous choice preselected; after a cancel, start fresh. */
    const preset = req?.status !== 'cancelled' && req?.method && DELIVERY_METHODS.find((m) => m.key === req.method);
    setMethodKey(preset && isMethodAllowed(preset, fullyPaid) ? preset.key : null);
    setNote(req?.note || '');
    setOpen(true);
  };

  const submit = async () => {
    if (submitting) return;
    if (!methodKey) {
      toast.error('Please select a delivery method.');
      return;
    }
    let payload;
    try {
      payload = buildDeliveryRequest(kind, rec, methodKey, { note, userId: uid, address });
    } catch (e) {
      toast.error(e.message || 'This option is not available.');
      return;
    }
    setSubmitting(true);
    try {
      await submitDeliveryRequest(kind, recordIdOf(kind, rec), payload);
      setLocalReq(payload);
      setOpen(false);
      toast.success(methodKey === 'pathao'
        ? 'Home delivery requested — find it under My Home Delivery Request'
        : 'Delivery request submitted');
      /* reload this record's list so the card moves to the right tab at once
         (a Pathao request leaves To Receive) */
      const reload = { order: getAllOrdersApiRedux, request: getAllBookingsOfSingleUserRedux, ship: getAllShipForMeOfSingleUserRedux }[kind];
      if (uid && reload) Promise.resolve(dispatch(reload(uid))).catch((e) => console.error('reload after delivery request', e));
    } catch (e) {
      console.error('submitDeliveryRequest', e);
      toast.error('Could not submit the delivery request. Please try again.');
    }
    setSubmitting(false);
  };

  /* ── Status strip (request on record, picker closed) ── */
  if (req && !open) {
    const tone = STRIP_TONE[req.status] || STRIP_TONE.requested;
    const StripIcon = tone.Icon;
    const info = DELIVERY_METHODS.find((m) => m.key === req.method);
    /* requests made before addresses were saved with them fall back to the
       customer's current default — same as the admin's Delivery Requests */
    const savedAddr = req.address;
    const addr = savedAddr || address;
    const addrText = addr ? [addr.name, addr.mobileNo, addr.address, addr.thana, addr.district, addr.division].filter(Boolean).join(', ') : '';
    const Row = ({ label, children }) => (
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 5 }}>
        <Text style={{ width: 72, fontSize: 10.5, color: C.gray400 }}>{label}</Text>
        <Text style={{ flex: 1, fontSize: 10.5, color: C.gray700 }}>{children}</Text>
      </View>
    );
    return (
      <View style={[{ borderRadius: 12, borderWidth: 1, borderColor: tone.border, backgroundColor: tone.bg }, style]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 }}>
          <Press
            onPress={() => setShowInfo((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showInfo }}
            accessibilityLabel="Show delivery request details"
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <StripIcon size={15} color={tone.fg} />
            <Text style={{ flex: 1, fontSize: 11.5, color: tone.fg }} numberOfLines={1}>
              <Text style={{ fontWeight: '800' }}>{DELIVERY_STATUS_LABEL[req.status] || DELIVERY_STATUS_LABEL.requested}</Text>
              {req.label ? ` · ${req.label}` : ''}
            </Text>
            {showInfo ? <ChevronUp size={14} color={tone.fg} /> : <ChevronDown size={14} color={tone.fg} />}
          </Press>
          {changeable ? (
            <Press onPress={startEdit} hitSlop={8} accessibilityRole="button" accessibilityLabel="Choose delivery again">
              {({ pressed }) => (
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: ORANGE, textDecorationLine: 'underline', opacity: pressed ? 0.6 : 1 }}>
                  Choose again
                </Text>
              )}
            </Press>
          ) : null}
        </View>
        {showInfo ? (
          <View style={{ marginHorizontal: 10, marginBottom: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 10, paddingBottom: 8, paddingTop: 3 }}>
            <Row label="Method">
              <Text style={{ fontWeight: '800' }}>{req.label}</Text>
              {info ? ` — ${info.hint}` : ''}
            </Row>
            <Row label={req.method === 'office_pickup' ? 'Pickup' : 'Deliver to'}>
              {req.method === 'office_pickup'
                ? 'Collect from the Paicart warehouse'
                : addrText || 'No address on your profile — Paicart will contact you.'}
              {req.method !== 'office_pickup' && addrText && !savedAddr
                ? '\n(Your current default address — this request was sent before addresses were saved with it.)'
                : ''}
            </Row>
            {req.method === 'office_pickup' && addrText ? (
              <Row label="Contact">{[addr.name, addr.mobileNo].filter(Boolean).join(', ')}</Row>
            ) : null}
            <Row label="Requested">
              {req.requestedDate || '—'}
              {req.source === 'admin' ? ` · set by Paicart${req.enteredBy ? ` (${req.enteredBy})` : ''}` : ' · by you'}
              {req.groupSize > 1 ? ` · together with ${req.groupSize - 1} other item${req.groupSize > 2 ? 's' : ''}` : ''}
            </Row>
            {req.note ? <Row label="Note">{req.note}</Row> : null}
            {req.handledDate && req.status !== 'requested' ? <Row label="Updated">{req.handledDate}</Row> : null}
          </View>
        ) : null}
      </View>
    );
  }

  /* ── Button + inline picker ── */
  return (
    <View ref={panelRef} collapsable={false} style={[{ borderRadius: 12, borderWidth: 1, borderColor: C.orange200, backgroundColor: C.orange50, overflow: 'hidden' }, style]}>
      <Press
        onPress={() => (open ? setOpen(false) : startEdit())}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 11,
          paddingHorizontal: 12,
          backgroundColor: pressed ? C.orange100 : 'transparent',
        })}
      >
        <Truck size={15} color={ORANGE} />
        <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '800', color: '#c2410c' }}>
          {req && req.status !== 'cancelled' ? 'Change Delivery Request' : 'Request Delivery'}
        </Text>
        {open ? <ChevronUp size={16} color={ORANGE} /> : <ChevronDown size={16} color={ORANGE} />}
      </Press>

      {open ? (
        <View style={{ paddingHorizontal: 10, paddingBottom: 12, gap: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: C.gray700, marginTop: 2, marginLeft: 2 }}>Select delivery method</Text>
          {DELIVERY_METHODS.map((m) => {
            const locked = !isMethodAllowed(m, fullyPaid);
            return (
              <MethodRow
                key={m.key}
                method={m}
                selected={methodKey === m.key}
                locked={locked}
                lockHint={lockHint}
                onPress={() => setMethodKey(m.key)}
              />
            );
          })}

          <AddressBlock address={address} />

          <NoteBox
            value={note}
            onChange={setNote}
            inputRef={noteRef}
            onFocus={() => kb?.focus(noteRef)}
            onBlur={() => kb?.blur(noteRef)}
          />

          <ScalePress
            onPress={submit}
            disabled={submitting || !methodKey}
            style={{
              paddingVertical: 11,
              borderRadius: 12,
              backgroundColor: ORANGE,
              opacity: submitting || !methodKey ? 0.55 : 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {submitting ? <ActivityIndicator size="small" color="#ffffff" /> : null}
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: '#ffffff' }}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </Text>
          </ScalePress>
        </View>
      ) : null}
    </View>
  );
}
