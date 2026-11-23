import React from 'react';
import { View, Text } from 'react-native';

/* Explains a Ship For Me booking that was rejected automatically because the
   parcel never reached the abroad warehouse by its Valid To date (rule:
   isShipBookingExpired in lib/buckets.js). Mirrors the web card's note. */
export default function AutoRejectedNotice({ req, style }) {
  if (!req?.autoRejected) return null;
  return (
    <View style={[{ marginTop: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fdeaea', borderWidth: 1, borderColor: '#f7cccc' }, style]}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#F5222D' }}>
        ভ্যালিড তারিখের মধ্যে পার্সেল আমাদের ওয়্যারহাউসে পৌঁছায়নি
      </Text>
      <Text style={{ fontSize: 11, lineHeight: 15, color: '#6b7280', marginTop: 2 }}>
        Rejected automatically — the parcel wasn&apos;t received at the warehouse by {req.validTo}. Please book again when it&apos;s ready to send.
      </Text>
    </View>
  );
}
