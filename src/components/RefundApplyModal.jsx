import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, Modal, Keyboard, Platform, Dimensions } from 'react-native';
import { useDispatch } from 'react-redux';
import { RotateCcw, X, Check, AlertCircle, Minus, Plus, ChevronDown } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import { PickerSheet } from '@/components/profile/ProfileBits';
import { C, SHADOW, Press, ScalePress, Spinner, Overlay } from '@/components/product/ui';
import { fs } from '@/components/orders/OrderBits';
import { toast } from '@/lib/toast';
import { cdn } from '@/lib/cdn';
import { uploadRefundApplyRedux } from '@/store/actions';

/* Refund application — the customer-facing half of the admin's two refund
 * queues at /payment-request/refund-request-order ("Quick Refund Request") and
 * /after-sale-service/pending ("After sale service").
 *
 * Those two screens are Firestore queries on the SAME `refundRequest`
 * collection, split by a single boolean:
 *     quickRefund == true   -> Quick Refund Request
 *     quickRefund == false  -> After sale service
 * `==` never matches a missing field, so a request written WITHOUT
 * `quickRefund` lands in neither queue and no admin ever sees it. The flag is
 * therefore always written explicitly, never left to a default.
 *
 * `mode` picks which queue and which form:
 *   'quick'     - parcel has not shipped. Whole order, one reason from a list.
 *   'afterSale' - parcel delivered. Free-text reason, and (orders only) a
 *                 per-SKU picker so the customer claims just the bad pieces.
 *
 * Port of web components/RefundApplyModal.jsx as it renders below 640px: a
 * bottom sheet (rounded-t-3xl, max-h-[92vh]) with the red header.
 *   - `inline`: render as an in-screen overlay (the caller mounts it at the
 *     root of its screen). Without it the sheet goes in an RN <Modal>, which
 *     is what the not-yet-ported screens that mount it inside a ScrollView
 *     need.
 *   - `shrink`: the My Orders list mounts this inside `.myorders-root`, so
 *     the web shrinks its type there too.
 *   - `visible` defaults to "open whenever there is a target".
 */

const QUICK_REASONS = ['Out of stock', 'Forbidden product', 'Fake product/price', 'I don’t want to buy'];

const PAYMENT_METHODS = ['Bkash', 'Bank'];

/* After-sale claim types — they decide what the admin refunds: missing
   pieces get the product price back (shipping was only charged on what
   arrived); a wrong or damaged item gets product + its shipping. */
export const CLAIM_TYPES = [
  { value: 'missing', label: 'Missing pieces' },
  { value: 'wrong', label: 'Wrong item' },
  { value: 'damaged', label: 'Damaged item' },
];

/* Flattens an order's items/skus into one claimable list. Product requests
   have no SKU array — a booking is a single product with a quantity — so the
   picker is simply not rendered for them. */
const collectSkus = (order) =>
  (order?.items || []).flatMap((item, itemIdx) =>
    (item.skus || []).map((sku, skuIdx) => ({
      key: `${itemIdx}-${skuIdx}`,
      itemName: item.name || item.productName || 'Item',
      image: cdn(sku.image || item.imgUrl || item.picture || ''),
      variant: [sku.colorName, sku.sizeName].filter(Boolean).join(' / '),
      price: parseFloat(sku.price) || 0,
      maxQty: parseInt(sku.totalQuantity, 10) || 0,
      raw: sku,
    })),
  );

const ACCENT = '#e62222';
const BODY = '#1e293b';
const PLACEHOLDER = 'rgba(30,41,59,0.5)';

export default function RefundApplyModal({ visible, target, inline = false, onClose, ...rest }) {
  const open = visible === undefined ? !!target : !!visible && !!target;
  /* Keep the record through the close so the panel never renders empty. */
  const last = useRef(target);
  if (target) last.current = target;

  /* The <select> option list opens over the whole screen, not inside the
     panel (which clips), so it lives out here: { title, options, value, onSelect }. */
  const [picker, setPicker] = useState(null);
  useEffect(() => {
    if (!open) setPicker(null);
  }, [open]);

  const body = (
    <>
      <Overlay visible={open} onClose={onClose} zIndex={50} scrim="rgba(0,0,0,0.55)">
        {open ? (
          <RefundPanel
            key={String(target?.orderId || target?.bookingId)}
            target={last.current}
            onClose={onClose}
            picker={picker}
            setPicker={setPicker}
            {...rest}
          />
        ) : null}
      </Overlay>
      <PickerSheet
        visible={!!picker}
        title={picker?.title}
        options={picker?.options || []}
        value={picker?.value}
        onSelect={(v) => {
          picker?.onSelect(v);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </>
  );

  if (inline) return body;
  return (
    <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1 }}>{body}</View>
    </Modal>
  );
}

/* How far the keyboard reaches up into the bottom-anchored panel. With
   Android edge-to-edge the window does not shrink, so the panel lifts itself. */
function useKeyboardOverlap(viewRef) {
  const [pad, setPad] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      const kbTop = e.endCoordinates?.screenY || Dimensions.get('window').height - (e.endCoordinates?.height || 0);
      viewRef.current?.measureInWindow?.((_x, y, _w, h) => setPad(Math.max(0, y + h - kbTop)));
    });
    const hide = Keyboard.addListener(hideEvt, () => setPad(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [viewRef]);
  return pad;
}

function RefundPanel({ target, kind = 'order', mode = 'quick', onClose, onSuccess, shrink = false, picker, setPicker }) {
  const dispatch = useDispatch();
  const isProductRequest = kind === 'productRequest';
  /* Ship For Me after-sale claims land in the same After sale queue,
     flagged `shipmentRequest`. */
  const isShipment = kind === 'shipment';
  const isQuick = mode === 'quick';

  const [reason, setReason] = useState('');
  const [claimType, setClaimType] = useState('');
  const [claimQuantity, setClaimQuantity] = useState('');
  const requestQty = parseInt(target?.productQuantity, 10) || 0;
  const [paymentMethod, setPaymentMethod] = useState('');
  const [bankInfo, setBankInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(null);

  const rootRef = useRef(null);
  const kbPad = useKeyboardOverlap(rootRef);

  const skuRows = isQuick || isProductRequest || isShipment ? [] : collectSkus(target);
  const [claimQty, setClaimQty] = useState({});

  const handleClose = () => {
    if (submitting) return;
    onClose?.();
  };

  const setQty = (key, next, max) => setClaimQty((cur) => ({ ...cur, [key]: Math.max(0, Math.min(max, next)) }));

  const claimedSkus = skuRows
    .filter((r) => (claimQty[r.key] || 0) > 0)
    .map((r) => ({ ...r.raw, totalQuantity: claimQty[r.key] }));
  const claimedPieces = claimedSkus.reduce((a, s) => a + (parseInt(s.totalQuantity, 10) || 0), 0);
  const claimedTaka = skuRows.reduce((a, r) => a + r.price * (claimQty[r.key] || 0), 0);

  const refId = isProductRequest || isShipment ? target?.bookingId : target?.orderId;

  const handleSubmit = async () => {
    if (submitting) return;
    if (isQuick && !reason) {
      toast.error('Please select a reason for the refund.');
      return;
    }
    if (!isQuick && !claimType) {
      toast.error('Please choose what happened — missing, wrong or damaged.');
      return;
    }
    if (!isQuick && isProductRequest) {
      const q = parseInt(claimQuantity, 10) || 0;
      if (q <= 0 || (requestQty && q > requestQty)) {
        toast.error(`Enter how many pieces (1–${requestQty || 'the ordered quantity'}).`);
        return;
      }
    }
    if (!isQuick && !reason.trim()) {
      toast.error('Please describe the problem.');
      return;
    }
    if (!paymentMethod) {
      toast.error('Please select how you want to receive the refund.');
      return;
    }
    if (!bankInfo.trim()) {
      toast.error(paymentMethod === 'Bank' ? 'Please enter your bank account details.' : 'Please enter your Bkash number.');
      return;
    }
    if (skuRows.length > 0 && claimedSkus.length === 0) {
      toast.error('Please select at least one item to claim.');
      return;
    }

    setSubmitting(true);
    try {
      await dispatch(
        uploadRefundApplyRedux({
          reason: isQuick ? reason : reason.trim(),
          paymentMethod,
          bankInfo: bankInfo.trim(),
          /* The admin reads this back as the document id AND as `time` for
             its sort, exactly as the order flow has always written it. */
          refundId: `${new Date().getTime()}`,
          order: target,
          /* Always explicit — see the note at the top of this file. */
          quickRefund: isQuick,
          ...(isProductRequest ? { productRequest: true } : {}),
          ...(isShipment ? { shipmentRequest: true, refundTarget: 'shipmentRequest' } : {}),
          ...(claimedSkus.length > 0 ? { skus: claimedSkus } : {}),
          ...(!isQuick ? { claimType } : {}),
          ...(!isQuick && isProductRequest ? { claimQuantity: parseInt(claimQuantity, 10) } : {}),
        }),
      );
      toast.success('Refund request submitted. Our team will review it and get back to you.');
      onSuccess?.();
      setSubmitting(false);
      onClose?.();
    } catch {
      toast.error('Failed to submit the refund request. Please try again.');
      setSubmitting(false);
    }
  };

  const T = (size, leading) => fs(size, shrink, leading);
  const smLine = T('sm').lineHeight;
  /* `w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50`,
     focus:border-[#e62222] focus:ring-1 focus:ring-[#e62222]/20 */
  const box = (isFocused) => ({
    borderWidth: 1,
    borderColor: isFocused ? ACCENT : C.gray200,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: C.gray50,
    boxShadow: isFocused ? '0 0 0 1px rgba(230,34,34,0.2)' : undefined,
  });
  const label = (children) => (
    <Text style={[T('xs'), { fontWeight: '700', color: C.gray700, marginBottom: 6 }]}>
      {children} <Text style={{ color: C.red500 }}>*</Text>
    </Text>
  );
  const select = ({ value, placeholder, onPress, isOpen }) => (
    <Press
      onPress={onPress}
      style={[box(isOpen), { height: smLine + 22, justifyContent: 'center', paddingRight: 36 }]}
    >
      <Text style={[T('sm'), { color: BODY }]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <View pointerEvents="none" style={{ position: 'absolute', right: 12 }}>
        <ChevronDown size={16} color={C.gray700} />
      </View>
    </Press>
  );
  const textArea = (rows, name, props) => (
    <TextInput
      multiline
      textAlignVertical="top"
      placeholderTextColor={PLACEHOLDER}
      onFocus={() => setFocused(name)}
      onBlur={() => setFocused((f) => (f === name ? null : f))}
      style={[
        box(focused === name),
        T('sm'),
        { color: BODY, height: rows * smLine + 22, paddingTop: 10, paddingBottom: 10, includeFontPadding: false },
      ]}
      {...props}
    />
  );

  const maxH = Dimensions.get('window').height * 0.92;

  return (
    <View
      ref={rootRef}
      collapsable={false}
      style={{
        backgroundColor: '#ffffff',
        width: '100%',
        maxHeight: maxH,
        overflow: 'hidden',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        boxShadow: SHADOW['2xl'],
        marginBottom: kbPad,
      }}
    >
      {/* drag handle on the accent */}
      <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4, backgroundColor: ACCENT }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' }} />
      </View>

      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: ACCENT,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <RotateCcw size={16} color="#ffffff" />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={[T('sm'), { fontWeight: '700', color: '#ffffff' }]}>
              {isQuick ? 'Quick Refund' : 'After Sale Refund'}
            </Text>
            <Text style={[T('xs'), { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>
              {isShipment ? 'Ship For Me' : isProductRequest ? 'Product Request' : 'Order'} #{refId}
            </Text>
          </View>
        </View>
        <Press
          onPress={handleClose}
          accessibilityLabel="Close"
          style={({ pressed }) => ({
            width: 32,
            height: 32,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
          })}
        >
          <X size={15} color="#ffffff" />
        </Press>
      </View>

      {/* Body */}
      <ScrollView
        style={{ flexShrink: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={{
            backgroundColor: C.amber50,
            borderWidth: 1,
            borderColor: C.amber200,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            gap: 8,
          }}
        >
          <View style={{ marginTop: 2 }}>
            <AlertCircle size={13} color={C.amber500} />
          </View>
          <Text style={[T(11, 'relaxed'), { color: C.amber800, flex: 1 }]}>
            {isQuick
              ? 'Your request goes to our refund team for review. The refunded amount is confirmed after they check the order.'
              : isShipment
                ? 'Describe what arrived damaged or missing. Keep your unboxing video and photos — our team may ask for them while reviewing the claim.'
                : 'Claim only the pieces that arrived damaged, wrong or missing. Our team reviews the claim after you submit it.'}
          </Text>
        </View>

        {/* Reason */}
        <View>
          {label(isQuick ? 'Reason for refund' : 'What went wrong?')}
          {isQuick ? (
            select({
              value: reason,
              placeholder: 'Select a reason',
              isOpen: picker?.key === 'reason',
              onPress: () =>
                setPicker({
                  key: 'reason',
                  title: 'Reason for refund',
                  value: reason,
                  options: [{ value: '', label: 'Select a reason' }, ...QUICK_REASONS.map((r) => ({ value: r, label: r }))],
                  onSelect: setReason,
                }),
            })
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                {CLAIM_TYPES.map((t) => {
                  const on = claimType === t.value;
                  return (
                    <Press
                      key={t.value}
                      onPress={() => setClaimType(t.value)}
                      style={({ pressed }) => ({
                        flex: 1,
                        alignItems: 'center',
                        borderRadius: 12,
                        borderWidth: 1,
                        paddingHorizontal: 8,
                        paddingVertical: 8,
                        borderColor: on ? ACCENT : C.gray200,
                        backgroundColor: on ? C.red50 : pressed ? C.gray50 : '#ffffff',
                      })}
                    >
                      <Text style={[T('xs'), { fontWeight: '700', color: on ? ACCENT : C.gray600, textAlign: 'center' }]}>
                        {t.label}
                      </Text>
                    </Press>
                  );
                })}
              </View>
              {isProductRequest && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={[T('xs'), { fontWeight: '700', color: C.gray700, marginBottom: 6 }]}>
                    How many pieces? <Text style={{ color: C.red500 }}>*</Text>
                    {requestQty > 0 && <Text style={{ fontWeight: '400', color: C.gray400 }}> (ordered {requestQty})</Text>}
                  </Text>
                  <TextInput
                    keyboardType="number-pad"
                    onChangeText={setClaimQuantity}
                    onFocus={() => setFocused('qty')}
                    onBlur={() => setFocused((f) => (f === 'qty' ? null : f))}
                    style={[
                      box(focused === 'qty'),
                      T('sm'),
                      { color: BODY, height: smLine + 22, paddingVertical: 0, includeFontPadding: false },
                    ]}
                  />
                </View>
              )}
              {textArea(3, 'reason', {
                onChangeText: setReason,
                placeholder: 'e.g. 2 pieces arrived broken, colour does not match the order',
              })}
            </>
          )}
        </View>

        {/* SKU picker — after-sale on an order that actually has SKUs */}
        {skuRows.length > 0 && (
          <View>
            {label('Which items?')}
            <View style={{ gap: 8 }}>
              {skuRows.map((r) => {
                const qty = claimQty[r.key] || 0;
                return (
                  <View
                    key={r.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderColor: qty > 0 ? ACCENT : C.gray200,
                      backgroundColor: qty > 0 ? 'rgba(254,242,242,0.4)' : '#ffffff',
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        backgroundColor: C.gray50,
                        borderWidth: 1,
                        borderColor: C.gray100,
                        overflow: 'hidden',
                      }}
                    >
                      {!!r.image && <ProductImage uri={r.image} thumb style={{ width: '100%', height: '100%' }} />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[T(11), { fontWeight: '700', color: C.gray800 }]} numberOfLines={1}>
                        {r.itemName}
                      </Text>
                      {!!r.variant && (
                        <Text style={[T(10), { color: C.gray400 }]} numberOfLines={1}>
                          {r.variant}
                        </Text>
                      )}
                      <Text style={[T(10), { color: C.gray500 }]}>
                        ৳{r.price.toLocaleString()} · {r.maxQty} ordered
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <Stepper Icon={Minus} disabled={qty === 0} onPress={() => setQty(r.key, qty - 1, r.maxQty)} />
                      <Text style={{ width: 24, textAlign: 'center', fontSize: 12, lineHeight: 18, fontWeight: '700', color: C.gray800 }}>
                        {qty}
                      </Text>
                      <Stepper Icon={Plus} disabled={qty >= r.maxQty} onPress={() => setQty(r.key, qty + 1, r.maxQty)} />
                    </View>
                  </View>
                );
              })}
            </View>

            {claimedPieces > 0 && (
              <View
                style={{
                  marginTop: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 12,
                  backgroundColor: C.gray50,
                  borderWidth: 1,
                  borderColor: C.gray100,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={[T(11), { fontWeight: '700', color: C.gray500 }]}>
                  {claimedPieces} piece{claimedPieces === 1 ? '' : 's'} claimed
                </Text>
                <Text style={[T(13), { fontWeight: '800', color: ACCENT }]}>~৳{Math.round(claimedTaka).toLocaleString()}</Text>
              </View>
            )}
            <Text style={[T(10), { marginTop: 4, color: C.gray400 }]}>
              Estimated only — the final refunded amount is set by our team.
            </Text>
          </View>
        )}

        {/* Payout method */}
        <View>
          {label('How should we send the refund?')}
          {select({
            value: paymentMethod,
            placeholder: 'Select a method',
            isOpen: picker?.key === 'method',
            onPress: () =>
              setPicker({
                key: 'method',
                title: 'How should we send the refund?',
                value: paymentMethod,
                options: [{ value: '', label: 'Select a method' }, ...PAYMENT_METHODS.map((m) => ({ value: m, label: m }))],
                onSelect: setPaymentMethod,
              }),
          })}
        </View>

        <View>
          {label(paymentMethod === 'Bank' ? 'Bank account details' : 'Bkash number / bank details')}
          {textArea(2, 'bank', {
            onChangeText: setBankInfo,
            placeholder: paymentMethod === 'Bank' ? 'Account name, account number, bank and branch' : 'e.g. 01XXXXXXXXX (personal)',
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={{ borderTopWidth: 1, borderTopColor: C.gray100, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', gap: 12 }}>
        <ScalePress
          onPress={handleClose}
          disabled={submitting}
          containerStyle={{ flex: 1 }}
          style={{
            paddingVertical: 10,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.gray200,
            alignItems: 'center',
            opacity: submitting ? 0.5 : 1,
          }}
        >
          <Text style={[T('sm'), { fontWeight: '600', color: C.gray600 }]}>Cancel</Text>
        </ScalePress>
        <ScalePress
          onPress={handleSubmit}
          disabled={submitting}
          scaleTo={submitting ? 1 : 0.95}
          containerStyle={{ flex: 1 }}
          style={{
            paddingVertical: 10,
            borderRadius: 16,
            backgroundColor: ACCENT,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: submitting ? 0.5 : 1,
            boxShadow: submitting ? undefined : '0 4px 14px rgba(230,34,34,0.267)',
          }}
        >
          {submitting ? <Spinner size={14} color="#ffffff" /> : <Check size={14} color="#ffffff" />}
          <Text style={[T('sm'), { fontWeight: '700', color: '#ffffff' }]}>{submitting ? 'Submitting…' : 'Submit Request'}</Text>
        </ScalePress>
      </View>

    </View>
  );
}

/* `w-6 h-6 rounded-md border border-gray-200 text-gray-500 disabled:opacity-40` */
function Stepper({ Icon, disabled, onPress }) {
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: C.gray200,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
        backgroundColor: pressed ? C.gray50 : '#ffffff',
      })}
    >
      <Icon size={11} color={C.gray500} />
    </Press>
  );
}
