import React from 'react';
import { View, Text, Image, Pressable, Linking } from 'react-native';
import { Loader2, Receipt } from 'lucide-react-native';

/* Shown while a submitted payment (with its transaction screenshot) waits
   for the admin to approve it, so the card doesn't just read "Unpaid".
   Port of the web's components/PendingPaymentNotice.jsx. `request` is the
   `pendingPaymentRequest` firebaseUtils attaches to orders / bookings
   ({ paymentId, imageUrl, amount, method, date }); it may be missing if the
   payment-request read failed, in which case a generic line is shown. */
export default function PendingPaymentNotice({ request, style }) {
  const amount = parseInt(request?.amount, 10) || 0;
  return (
    <View
      style={[
        {
          flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12,
          backgroundColor: 'rgba(239,246,255,0.8)', borderWidth: 1, borderColor: '#dbeafe',
        },
        style,
      ]}
    >
      {request?.imageUrl ? (
        <Pressable
          onPress={() => Linking.openURL(request.imageUrl).catch(() => {})}
          accessibilityRole="imagebutton"
          accessibilityLabel="View transaction screenshot"
          style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#fff' }}
        >
          <Image source={{ uri: request.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </Pressable>
      ) : (
        <View style={{ width: 56, height: 56, borderRadius: 8, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' }}>
          <Receipt size={20} color="#3b82f6" />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Loader2 size={12} color="#1e40af" />
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#1e40af' }}>Payment under review</Text>
        </View>
        <Text style={{ fontSize: 11, lineHeight: 15, color: 'rgba(29,78,216,0.85)', marginTop: 2 }}>
          {request ? (
            <>
              <Text style={{ fontWeight: '800' }}>৳{amount.toLocaleString()}</Text>
              {request.method ? <> via <Text style={{ fontWeight: '800' }}>{request.method}</Text></> : null}
              {request.date ? ` on ${request.date}` : ''}
            </>
          ) : (
            'Your payment request was submitted.'
          )}
          {' '}We&apos;ll update the balance once it&apos;s approved.
        </Text>
        {request?.paymentId ? (
          <Text style={{ fontSize: 10, color: 'rgba(37,99,235,0.7)', marginTop: 2 }}>Payment ID: {request.paymentId}</Text>
        ) : null}
      </View>
    </View>
  );
}
