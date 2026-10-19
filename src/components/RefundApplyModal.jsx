import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useDispatch } from 'react-redux';
import { AlertCircle, Minus, Plus } from 'lucide-react-native';
import Sheet from '@/components/ui/Sheet';
import Button from '@/components/ui/Button';
import ProductImage from '@/components/ui/ProductImage';
import { toast } from '@/lib/toast';
import { uploadRefundApplyRedux } from '@/store/actions';
import colors from '@/theme/colors';

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
 */

const QUICK_REASONS = [
  'Out of stock',
  'Forbidden product',
  'Fake product/price',
  'I don’t want to buy',
];

const PAYMENT_METHODS = ['Bkash', 'Bank'];

/* After-sale claim types — they decide what the admin refunds: missing
   pieces get the product price back (shipping was only charged on what
   arrived); a wrong or damaged item gets product + its shipping. */
const CLAIM_TYPES = [
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
      image: sku.image || item.imgUrl || item.picture || '',
      variant: [sku.colorName, sku.sizeName].filter(Boolean).join(' / '),
      price: parseFloat(sku.price) || 0,
      maxQty: parseInt(sku.totalQuantity, 10) || 0,
      raw: sku,
    })),
  );

export default function RefundApplyModal({
  visible,
  target,
  kind = 'order',
  mode = 'quick',
  onClose,
  onSuccess,
}) {
  const dispatch = useDispatch();
  const isQuick = mode === 'quick';
  const isProductRequest = kind === 'productRequest';

  const [reason, setReason] = useState('');
  const [claimType, setClaimType] = useState('');
  /* Product requests have no SKU list — the customer says how many pieces */
  const [claimQuantity, setClaimQuantity] = useState('');
  const requestQty = parseInt(target?.productQuantity) || 0;
  const [paymentMethod, setPaymentMethod] = useState('Bkash');
  const [bankInfo, setBankInfo] = useState('');
  const [qty, setQty] = useState({});
  const [submitting, setSubmitting] = useState(false);

  /* The per-SKU picker is after-sale only: before a parcel ships there is
     nothing to inspect, so the whole order is claimed. */
  const skuRows = useMemo(
    () => (!isQuick && !isProductRequest ? collectSkus(target) : []),
    [isQuick, isProductRequest, target],
  );

  const claimedSkus = useMemo(
    () =>
      skuRows
        .filter((row) => (qty[row.key] || 0) > 0)
        .map((row) => ({ ...row.raw, claimedQuantity: qty[row.key] })),
    [skuRows, qty],
  );

  const claimTotal = useMemo(
    () => skuRows.reduce((sum, row) => sum + (qty[row.key] || 0) * row.price, 0),
    [skuRows, qty],
  );
  const claimPieces = useMemo(
    () => skuRows.reduce((sum, row) => sum + (qty[row.key] || 0), 0),
    [skuRows, qty],
  );

  const bump = (row, delta) =>
    setQty((prev) => {
      const next = Math.min(row.maxQty, Math.max(0, (prev[row.key] || 0) + delta));
      return { ...prev, [row.key]: next };
    });

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
      const q = parseInt(claimQuantity) || 0;
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
      toast.error(
        paymentMethod === 'Bank'
          ? 'Please enter your bank account details.'
          : 'Please enter your Bkash number.',
      );
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
          /* The admin reads this back as the document id AND as `time` for its
             sort, exactly as the order flow has always written it. */
          refundId: `${new Date().getTime()}`,
          order: target,
          /* Always explicit — see the note at the top of this file. */
          quickRefund: isQuick,
          ...(isProductRequest ? { productRequest: true } : {}),
          ...(claimedSkus.length > 0 ? { skus: claimedSkus } : {}),
          ...(!isQuick ? { claimType } : {}),
          ...(!isQuick && isProductRequest ? { claimQuantity: parseInt(claimQuantity, 10) } : {}),
        }),
      );
      toast.success('Refund request submitted. Our team will review it and get back to you.');
      onSuccess?.();
      onClose?.();
    } catch {
      toast.error('Failed to submit the refund request. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={isQuick ? 'Quick Refund' : 'After Sale Service'}
      subtitle={isQuick ? 'Before the parcel ships' : 'Claim the items that were wrong'}
      headerColor={colors.brand}
      footer={<Button title="Submit Request" variant="brand" loading={submitting} onPress={handleSubmit} />}
    >
      <View className="flex-row items-start gap-2 rounded-xl bg-amber-soft px-3 py-2.5 mb-4">
        <AlertCircle size={15} color="#8a5a06" />
        <Text className="flex-1 text-3xs text-amber-900">
          {isQuick
            ? 'Refunds are reviewed by our team before any money is returned.'
            : 'Please include photos or details in your description — it speeds up the review.'}
        </Text>
      </View>

      <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
        Reason
      </Text>
      {isQuick ? (
        <View className="flex-row flex-wrap gap-2 mb-4">
          {QUICK_REASONS.map((r) => {
            const active = r === reason;
            return (
              <Pressable
                key={r}
                onPress={() => setReason(r)}
                className={`rounded-full px-3 py-1.5 border ${active ? 'bg-brand border-brand' : 'bg-white border-gray-200'}`}
              >
                <Text className={`text-3xs font-semibold ${active ? 'text-white' : 'text-gray-600'}`}>
                  {r}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <>
        <View className="flex-row gap-2 mb-2">
          {CLAIM_TYPES.map((t) => {
            const active = claimType === t.value;
            return (
              <Pressable
                key={t.value}
                onPress={() => setClaimType(t.value)}
                className={`flex-1 items-center rounded-xl px-2 py-2 border ${active ? 'bg-brand border-brand' : 'bg-white border-gray-200'}`}
              >
                <Text className={`text-3xs font-semibold ${active ? 'text-white' : 'text-gray-600'}`}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {isProductRequest && (
          <TextInput
            value={claimQuantity}
            onChangeText={setClaimQuantity}
            keyboardType="number-pad"
            placeholder={`How many pieces?${requestQty ? ` (ordered ${requestQty})` : ''}`}
            placeholderTextColor="#9ca3af"
            className="border border-gray-300 rounded-xl px-3 py-2.5 text-smd text-foreground mb-2"
          />
        )}
        <TextInput
          value={reason}
          onChangeText={setReason}
          multiline
          textAlignVertical="top"
          placeholder="What was wrong with the order?"
          placeholderTextColor="#9ca3af"
          className="border border-gray-300 rounded-xl px-3 py-2.5 text-smd text-foreground min-h-[90px] mb-4"
        />
        </>
      )}

      {skuRows.length > 0 && (
        <View className="mb-4">
          <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
            Items to claim
          </Text>
          {skuRows.map((row) => {
            const n = qty[row.key] || 0;
            return (
              <View key={row.key} className="flex-row items-center gap-3 py-2 border-b border-gray-100">
                <ProductImage uri={row.image} thumb className="w-12 h-12 rounded-lg" />
                <View className="flex-1">
                  <Text className="text-3xs text-gray-700" numberOfLines={1}>
                    {row.itemName}
                  </Text>
                  {!!row.variant && (
                    <Text className="text-xxs text-gray-400">{row.variant}</Text>
                  )}
                  <Text className="text-xxs text-gray-500">
                    ৳{row.price.toLocaleString()} · {row.maxQty} ordered
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Pressable onPress={() => bump(row, -1)} hitSlop={6} className="w-7 h-7 rounded-full border border-gray-200 items-center justify-center">
                    <Minus size={12} color={colors.muted} />
                  </Pressable>
                  <Text className="text-smd font-bold text-foreground w-5 text-center">{n}</Text>
                  <Pressable onPress={() => bump(row, 1)} hitSlop={6} className="w-7 h-7 rounded-full border border-gray-200 items-center justify-center">
                    <Plus size={12} color={colors.muted} />
                  </Pressable>
                </View>
              </View>
            );
          })}
          {claimPieces > 0 && (
            <Text className="text-3xs text-gray-500 mt-2">
              {claimPieces} piece{claimPieces === 1 ? '' : 's'} claimed · ~৳
              {Math.round(claimTotal).toLocaleString()}
            </Text>
          )}
        </View>
      )}

      <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
        Refund to
      </Text>
      <View className="flex-row gap-2 mb-3">
        {PAYMENT_METHODS.map((m) => {
          const active = m === paymentMethod;
          return (
            <Pressable
              key={m}
              onPress={() => setPaymentMethod(m)}
              className={`flex-1 rounded-xl py-2.5 border-2 items-center ${active ? 'border-brand bg-red-50' : 'border-gray-200 bg-white'}`}
            >
              <Text className={`text-smd font-bold ${active ? 'text-brand' : 'text-gray-500'}`}>
                {m}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        value={bankInfo}
        onChangeText={setBankInfo}
        multiline
        textAlignVertical="top"
        placeholder={
          paymentMethod === 'Bank'
            ? 'Bank name, account name, account number, branch'
            : 'Your Bkash number'
        }
        placeholderTextColor="#9ca3af"
        keyboardType={paymentMethod === 'Bkash' ? 'phone-pad' : 'default'}
        className="border border-gray-300 rounded-xl px-3 py-2.5 text-smd text-foreground min-h-[70px]"
      />
    </Sheet>
  );
}
