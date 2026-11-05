import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2, AlertTriangle, Clock, X } from 'lucide-react-native';
import { C, Press, Spinner, Overlay, SHADOW } from '@/components/product/ui';
import { TS, tpx } from '@/components/cart/CartBits';
import { CARD } from '@/components/profile/ProfileBits';

/* ─── Account deletion (Google Play's in-app requirement) ───
 * Not on the web site, which instead links to paicart.com/delete-account.
 * The request flags the profile and the team deletes the account within 30
 * days — the same promise that page makes — so the copy here mirrors it. */

const DANGER = '#dc2626';
const DANGER_BG = '#fef2f2';
const DANGER_LINE = '#fecaca';

const fmtDate = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
};

/* The card at the bottom of My Profile. Once a request exists (the user
   signed back in before it was processed) it shows the pending state instead
   of offering a second request. */
export function DeleteAccountCard({ currentUser, onPress }) {
  if (!currentUser?.id) return null;

  if (currentUser.deletionRequested) {
    const when = fmtDate(currentUser.deletionRequestedAt);
    return (
      <View style={{ ...CARD, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: DANGER_BG, alignItems: 'center', justifyContent: 'center' }}>
          <Clock size={15} color={DANGER} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[TS.sm, { fontWeight: '800', color: C.gray800 }]}>Account deletion requested</Text>
          <Text style={[TS.xs, { color: C.gray500, marginTop: 2, lineHeight: 18 }]}>
            {when ? `Requested on ${when}. ` : ''}Your account will be deleted within 30 days. To cancel, contact
            support@paicart.com.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ ...CARD, padding: 16, gap: 12 }}>
      <View>
        <Text style={[TS.sm, { fontWeight: '800', color: C.gray800 }]}>Delete account</Text>
        <Text style={[TS.xs, { color: C.gray500, marginTop: 2, lineHeight: 18 }]}>
          Permanently delete your Paicart account and personal data.
        </Text>
      </View>
      <Press
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => ({
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: DANGER_LINE,
          backgroundColor: pressed ? '#fee2e2' : DANGER_BG,
        })}
      >
        <Trash2 size={14} color={DANGER} />
        <Text style={[TS.sm, { fontWeight: '700', color: DANGER }]}>Delete my account</Text>
      </Press>
    </View>
  );
}

function Bullet({ children }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Text style={[TS.xs, { color: C.gray400, lineHeight: 18 }]}>•</Text>
      <Text style={[TS.xs, { color: C.gray600, lineHeight: 18, flex: 1 }]}>{children}</Text>
    </View>
  );
}

/* Bottom-sheet confirmation. Deliberately plain: a destructive action should
   read clearly, with Cancel as the easy, first choice. */
export function DeleteAccountSheet({ visible, loading, onClose, onConfirm }) {
  const insets = useSafeAreaInsets();
  const close = loading ? () => {} : onClose;
  return (
    <Overlay visible={visible} onClose={close} zIndex={80}>
      <View
        style={{
          backgroundColor: '#ffffff',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: 20 + insets.bottom,
          gap: 16,
          boxShadow: SHADOW['2xl'],
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: DANGER_BG, alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={18} color={DANGER} />
          </View>
          <Text style={[tpx(17), { flex: 1, fontWeight: '800', color: C.gray900 }]}>Delete your account?</Text>
          <Press
            onPress={close}
            accessibilityLabel="Close"
            hitSlop={8}
            style={({ pressed }) => ({
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? C.gray200 : C.gray100,
            })}
          >
            <X size={16} color={C.gray500} />
          </Press>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={[TS.xs, { fontWeight: '700', color: C.gray700 }]}>This will delete:</Text>
          <Bullet>Your account and sign-in details</Bullet>
          <Bullet>Your profile, saved addresses, cart and wishlist</Bullet>
        </View>

        <View style={{ gap: 6 }}>
          <Text style={[TS.xs, { fontWeight: '700', color: C.gray700 }]}>Please note:</Text>
          <Bullet>Your account is deleted within 30 days. You will be signed out now.</Bullet>
          <Bullet>Order, payment and refund records may be kept where the law requires.</Bullet>
          <Bullet>Finish or cancel any orders, shipments and refunds in progress first.</Bullet>
          <Bullet>This cannot be undone once processed.</Bullet>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, paddingTop: 4 }}>
          <Press
            onPress={close}
            disabled={loading}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 13,
              borderRadius: 12,
              backgroundColor: pressed ? C.gray200 : C.gray100,
            })}
          >
            <Text style={[TS.sm, { fontWeight: '700', color: C.gray700 }]}>Cancel</Text>
          </Press>
          <Press
            onPress={onConfirm}
            disabled={loading}
            style={({ pressed }) => ({
              flex: 1,
              flexDirection: 'row',
              gap: 8,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 13,
              borderRadius: 12,
              backgroundColor: DANGER,
              opacity: loading ? 0.7 : pressed ? 0.85 : 1,
            })}
          >
            {loading ? <Spinner size={14} /> : <Trash2 size={14} color="#ffffff" />}
            <Text style={[TS.sm, { fontWeight: '800', color: '#ffffff' }]}>{loading ? 'Deleting…' : 'Delete account'}</Text>
          </Press>
        </View>
      </View>
    </Overlay>
  );
}
