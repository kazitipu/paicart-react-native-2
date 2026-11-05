import React from 'react';
import { View, Text, Image } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Check, Copy } from 'lucide-react-native';
import { C, Press } from '@/components/product/ui';
import { TS, tpx } from '@/components/cart/CartBits';
import { BANK_ACCOUNTS } from '@/lib/payments';
import { toast } from '@/lib/toast';
import { PAY } from './PaymentSheet';

/* The Direct Deposit account list (web: BANK_ACCOUNTS.map … inside a
   space-y-2 div). Each row: p-3 rounded-2xl border-2, teal-600 border +
   teal-50 fill when chosen, 48px logo tile, name / account name / account no
   (font-mono) / routing · branch, and a 20px radio.

   Native addition: a copy button beside the account number — on the web
   people selected the text; on a phone that is fiddly and mistyping an
   account number loses a payment.

   `children` render after the rows inside the same gap-8 list (the web puts
   <ManualBkashTotal> there in three of the four sheets). */
export default function BankPicker({ method, onSelect, children }) {
  return (
    <View style={{ gap: 8 }}>
      {BANK_ACCOUNTS.map((b) => {
        const on = method === b.key;
        return (
          <Press
            key={b.key}
            onPress={() => onSelect(b.key)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: on ? PAY.TEAL_DEEP : PAY.SLATE200,
              backgroundColor: on ? '#f0fdfa' : pressed ? PAY.SLATE100 : '#f8fafc',
            })}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                overflow: 'hidden',
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: C.gray100,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
              }}
            >
              <Image source={b.logo} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[TS.xs, { fontWeight: '800', color: C.gray800 }]}>{b.name}</Text>
              <Text style={[tpx(10), { color: C.gray500 }]}>{b.acName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[tpx(11), { fontFamily: 'monospace', fontWeight: '700', color: C.gray700 }]}>{b.acNo}</Text>
                <Press
                  hitSlop={8}
                  accessibilityLabel="Copy account number"
                  onPress={() => {
                    Clipboard.setString(b.acNo);
                    toast.success('Account number copied');
                  }}
                >
                  {({ pressed }) => <Copy size={11} color={pressed ? PAY.TEAL_DEEP : C.gray400} />}
                </Press>
              </View>
              <Text style={[tpx(10), { color: C.gray400 }]}>
                {b.routing}
                {b.branch ? ` · ${b.branch}` : ''}
              </Text>
            </View>
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                borderWidth: 2,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: on ? PAY.TEAL500 : C.gray300,
                backgroundColor: on ? PAY.TEAL500 : 'transparent',
              }}
            >
              {on && (
                <Animated.View entering={ZoomIn.duration(140)}>
                  <Check size={10} color="#ffffff" strokeWidth={3} />
                </Animated.View>
              )}
            </View>
          </Press>
        );
      })}
      {children}
    </View>
  );
}
