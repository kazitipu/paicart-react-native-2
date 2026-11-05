import React from 'react';
import { View, Text, Image } from 'react-native';
import { C, Press, ScalePress, Spinner } from '@/components/product/ui';
import { TS, tpx } from '@/components/cart/CartBits';
import { gatewayBkashFee } from '@/lib/payments';
import { PAY } from './PaymentSheet';

const bkashLogo = require('@/assets/bkash.png');
const bkashWhite = require('@/assets/bkash-wt.png');
/* h-8 object-contain: 32px tall at the logo's own aspect ratio. */
const BKASH_WT_W = (() => {
  const a = Image.resolveAssetSource(bkashWhite);
  return a?.width && a?.height ? Math.round((32 * a.width) / a.height) : 120;
})();

/* The Mobile Banking tab, identical in all four web sheets:

     "Choose payment method:" + the 56px bKash logo tile (tap selects
     method 'Bkash'; teal-600 border + label when selected)
     fee table — {amountLabel} / Fee (1.5%) / Amount to Pay (pink-50 row)
     the #d62267 pay button with the white bKash logo (disabled until bKash
     is selected; "{busyLabel}" with a spinner while the gateway is opening)
     "Please select Bkash above to proceed." until it is.

   Fee maths is the web's: fee = (payable × 1.5 / 100).toFixed(2),
   total = (payable + fee).toFixed(2). Pre-payment's busy label is
   "Processing…", the other three say "Redirecting to Bkash…". */
export default function BkashPanel({
  method,
  onSelect,
  payable,
  amountLabel = 'Amount',
  onPay,
  submitting,
  busyLabel = 'Redirecting to Bkash…',
}) {
  const bkashFee = gatewayBkashFee(payable);
  const bkashTotal = parseFloat((payable + bkashFee).toFixed(2));
  const selected = method === 'Bkash';

  return (
    <>
      <View>
        <Text style={[TS.xs, { fontWeight: '700', color: C.gray500, marginBottom: 12 }]}>Choose payment method:</Text>
        <Press onPress={() => onSelect('Bkash')} accessibilityLabel="Bkash" style={{ alignSelf: 'flex-start', alignItems: 'center', gap: 4 }}>
          {({ pressed }) => (
            <>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: selected ? PAY.TEAL_DEEP : C.gray200,
                  padding: 4,
                  backgroundColor: '#ffffff',
                  opacity: pressed && !selected ? 0.8 : 1,
                }}
              >
                <Image source={bkashLogo} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              </View>
              <Text style={[tpx(10), { fontWeight: '700', color: selected ? PAY.TEAL_DEEP : C.gray500 }]}>Bkash</Text>
            </>
          )}
        </Press>
      </View>

      <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.gray100 }}>
        {[
          { label: amountLabel, value: `${payable} Tk` },
          { label: 'Fee (1.5%)', value: `${bkashFee} Tk`, muted: true },
          { label: 'Amount to Pay', value: `${bkashTotal} Tk`, bold: true },
        ].map(({ label, value, muted, bold }, i, arr) => (
          <View
            key={label}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: i === arr.length - 1 ? 0 : 1,
              borderBottomColor: C.gray50,
              backgroundColor: bold ? PAY.PINK50 : 'transparent',
            }}
          >
            <Text style={[TS.sm, muted ? { color: C.gray400 } : bold ? { fontWeight: '800', color: C.gray800 } : { color: C.gray600 }]}>
              {label}
            </Text>
            <Text style={[TS.sm, { fontWeight: '700', color: bold ? PAY.BKASH_BTN : C.gray700 }]}>{value}</Text>
          </View>
        ))}
      </View>

      <ScalePress
        onPress={onPay}
        disabled={submitting || !selected}
        accessibilityLabel="Pay with Bkash"
        style={{
          width: '100%',
          borderRadius: 16,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 16,
          backgroundColor: PAY.BKASH_BTN,
          boxShadow: '0 4px 18px rgba(214,34,103,0.333)',
          opacity: submitting || !selected ? 0.5 : 1,
        }}
      >
        {submitting ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Spinner size={16} />
            <Text style={[TS.sm, { fontWeight: '700', color: '#ffffff' }]}>{busyLabel}</Text>
          </View>
        ) : (
          <Image source={bkashWhite} style={{ height: 32, width: BKASH_WT_W }} resizeMode="contain" />
        )}
      </ScalePress>
      {!selected && (
        <Text style={[TS.xs, { textAlign: 'center', color: C.amber600, fontWeight: '600' }]}>Please select Bkash above to proceed.</Text>
      )}
    </>
  );
}
