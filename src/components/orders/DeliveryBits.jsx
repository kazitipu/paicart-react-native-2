import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Lock, MapPin, AlertTriangle } from 'lucide-react-native';
import { C, ORANGE, Press } from '@/components/product/ui';
import { money } from '@/components/dashboard/ui';
import { TABS } from '@/navigation/routes';
import { addrLine } from '../../lib/address';

/* Shared pieces of the single (DeliveryRequestPanel) and bulk
   (BulkDeliveryRequestModal) Request Delivery forms. */

export const NOTE_MAX = 500;

const NOUN = { order: 'order', request: 'product request', ship: 'shipment' };

/* Why a full-payment method is locked for one record, from paymentBlockers. */
export const blockerHint = (blocker) => {
  if (!blocker) return 'Pay the full due to unlock';
  if (blocker.reason === 'not_billed') return 'Bill not issued yet — available once it is issued and paid';
  return `This ${NOUN[blocker.kind] || 'item'} still has ${money(blocker.due)} due — pay it in full to unlock`;
};

export function Radio({ checked, disabled }) {
  return (
    <View
      style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: !disabled && checked ? ORANGE : C.gray300,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
      }}
    >
      {checked ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ORANGE }} /> : null}
    </View>
  );
}

export function MethodRow({ method, selected, locked, lockHint, onPress }) {
  return (
    <Press
      onPress={onPress}
      disabled={locked}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled: locked }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: selected ? ORANGE : C.gray200,
        backgroundColor: locked ? C.gray50 : selected ? '#fff7f0' : pressed ? C.gray50 : '#ffffff',
        opacity: locked ? 0.75 : 1,
      })}
    >
      <Radio checked={selected} disabled={locked} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 12.5, fontWeight: '800', color: locked ? C.gray400 : C.gray800 }}>{method.label}</Text>
        <Text style={{ fontSize: 10.5, color: locked ? C.gray400 : C.gray500, marginTop: 2 }}>{method.hint}</Text>
        {locked && lockHint ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 }}>
            <View style={{ marginTop: 1 }}>
              <Lock size={10} color={C.amber600} />
            </View>
            <Text style={{ fontSize: 10, fontWeight: '700', color: C.amber600, flexShrink: 1 }}>{lockHint}</Text>
          </View>
        ) : null}
      </View>
    </Press>
  );
}

/* "Deliver to: …" from defaultShippingAddress(currentUser), with a link to
   the profile's address book. `onBeforeNavigate` lets a modal close first. */
export function AddressBlock({ address, onBeforeNavigate }) {
  const navigation = useNavigation();
  const goEdit = () => {
    if (onBeforeNavigate) onBeforeNavigate();
    navigation.navigate(TABS.ORDERS, { screen: 'UserInformation' });
  };

  if (!address) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: C.amber200, backgroundColor: C.amber50, paddingHorizontal: 12, paddingVertical: 10 }}>
        <View style={{ marginTop: 1 }}>
          <AlertTriangle size={14} color={C.amber600} />
        </View>
        <Text style={{ flex: 1, fontSize: 11, color: '#92400e' }}>Add a default shipping address in your profile</Text>
        <Press onPress={goEdit} hitSlop={8} accessibilityRole="link">
          {({ pressed }) => (
            <Text style={{ fontSize: 11, fontWeight: '800', color: ORANGE, textDecorationLine: 'underline', opacity: pressed ? 0.6 : 1 }}>Add</Text>
          )}
        </Press>
      </View>
    );
  }

  const parts = [address.name, address.mobileNo, addrLine(address)].filter(Boolean);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: C.gray200, backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 10 }}>
      <View style={{ marginTop: 1 }}>
        <MapPin size={14} color={ORANGE} />
      </View>
      <Text style={{ flex: 1, fontSize: 11, lineHeight: 16, color: C.gray600 }}>
        <Text style={{ fontWeight: '800', color: C.gray800 }}>Deliver to: </Text>
        {parts.join(', ')}
      </Text>
      <Press onPress={goEdit} hitSlop={8} accessibilityRole="link" accessibilityLabel="Change delivery address">
        {({ pressed }) => (
          <Text style={{ fontSize: 11, fontWeight: '800', color: ORANGE, textDecorationLine: 'underline', opacity: pressed ? 0.6 : 1 }}>Change</Text>
        )}
      </Press>
    </View>
  );
}

export function NoteBox({ value, onChange, inputRef, onFocus, onBlur }) {
  return (
    <View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.slice(0, NOTE_MAX))}
        maxLength={NOTE_MAX}
        multiline
        placeholder="Note for Paicart — address, phone or preferred time"
        placeholderTextColor={C.gray400}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          minHeight: 64,
          maxHeight: 140,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: C.gray200,
          backgroundColor: '#ffffff',
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 10,
          fontSize: 12.5,
          color: C.gray800,
          textAlignVertical: 'top',
        }}
      />
      <Text style={{ fontSize: 9.5, color: C.gray400, textAlign: 'right', marginTop: 3 }}>
        {value.length}/{NOTE_MAX}
      </Text>
    </View>
  );
}
