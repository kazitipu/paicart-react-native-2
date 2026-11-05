import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, Keyboard, Platform, Dimensions } from 'react-native';
import { AlertCircle, X, Check, ChevronDown } from 'lucide-react-native';
import { C, SHADOW, Press, ScalePress, Spinner, Overlay } from '@/components/product/ui';
import { TS, RED, BODY } from '@/components/cart/CartBits';
import { PickerSheet } from '@/components/profile/ProfileBits';
import { submitComplaint } from '@/lib/firebaseUtils';
import { toast } from '@/lib/toast';

/* ═══════════════════════════════════════════════════════════════════════
   Port of the web's components/ComplaintModal.jsx at < 640px: a bottom
   sheet (`rounded-t-3xl max-h-[92vh] shadow-2xl`) with a red handle strip +
   header, Subject select and Complaint textarea, Cancel / Submit footer.
   Rendered as an in-screen Overlay (no RN <Modal>); the native <select>
   opens a PickerSheet over it.

   Writes exactly what the web writes, via submitComplaint → complain/{ms}:
   { subject, message, userId, displayName, email, phone, complaintId,
     status: 'pending', time, date }.
   ═══════════════════════════════════════════════════════════════════════ */

const SUBJECTS = [
  'Order Issue', 'Payment Issue', 'Shipping Delay', 'Damaged / Wrong Product',
  'Refund Issue', 'Customer Service', 'Other',
];
const SUBJECT_OPTIONS = [
  { value: '', label: 'Select a subject' },
  ...SUBJECTS.map((s) => ({ value: s, label: s })),
];

const GRAY50 = '#f9fafb';
/* v4 preflight: placeholder = currentColor (body #1e293b) at 50%. */
const PLACEHOLDER = 'rgba(30,41,59,0.5)';
/* focus:border-[#e62222] focus:ring-1 focus:ring-[#e62222]/20 */
const FOCUS_RING = '0 0 0 1px rgba(230,34,34,0.2)';
const FIELD = {
  borderWidth: 1,
  borderRadius: 12,
  paddingHorizontal: 14,
  backgroundColor: GRAY50,
};

/* How far the keyboard reaches up into the bottom-anchored sheet (Android
   edge-to-edge does not shrink the window). */
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

function Label({ children }) {
  return (
    <Text style={[TS.xs, { fontWeight: '700', color: C.gray700, marginBottom: 6 }]}>
      {children} <Text style={{ color: C.red500 }}>*</Text>
    </Text>
  );
}

function ComplaintPanel({ currentUser, onClose, subject, pickerOpen, onOpenPicker }) {
  const rootRef = useRef(null);
  const kbPad = useKeyboardOverlap(rootRef);
  /* Uncontrolled: the text lives in a ref, so typing never re-renders. */
  const messageRef = useRef('');
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    if (!subject) {
      toast.error('Please select a subject.');
      return;
    }
    const message = messageRef.current.trim();
    if (!message) {
      toast.error('Please describe your complaint.');
      return;
    }
    Keyboard.dismiss();
    setSubmitting(true);
    try {
      await submitComplaint({
        subject,
        message,
        userId: currentUser?.id || '',
        displayName: currentUser?.displayName || '',
        email: currentUser?.email || '',
        phone: currentUser?.phone || '',
      });
      toast.success('Your complaint has been submitted. Our team will review it shortly.');
      setSubmitting(false);
      onClose();
      return;
    } catch {
      toast.error('Failed to submit complaint. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <View
      ref={rootRef}
      collapsable={false}
      style={{
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        boxShadow: SHADOW['2xl'],
        flexShrink: 1,
        paddingBottom: kbPad,
      }}
    >
      {/* drag handle — in the header's colour */}
      <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4, backgroundColor: RED }}>
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' }} />
      </View>

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: RED,
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
            <AlertCircle size={16} color="#ffffff" />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={[TS.sm, { fontWeight: '700', color: '#ffffff' }]}>File a Complaint</Text>
            <Text style={[TS.xs, { color: 'rgba(255,255,255,0.7)' }]}>We&apos;ll get back to you as soon as possible</Text>
          </View>
        </View>
        <Press
          onPress={onClose}
          accessibilityLabel="Close"
          hitSlop={6}
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
        style={{ flexGrow: 0, flexShrink: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Label>Subject</Label>
          <Press
            onPress={() => {
              Keyboard.dismiss();
              onOpenPicker();
            }}
            style={[
              FIELD,
              {
                height: 42,
                justifyContent: 'center',
                paddingRight: 34,
                borderColor: pickerOpen ? RED : C.gray200,
              },
              pickerOpen && { boxShadow: FOCUS_RING },
            ]}
          >
            <Text style={[TS.sm, { color: BODY }]} numberOfLines={1}>
              {subject || 'Select a subject'}
            </Text>
            <View pointerEvents="none" style={{ position: 'absolute', right: 12 }}>
              <ChevronDown size={14} color={C.gray500} />
            </View>
          </Press>
        </View>

        <View>
          <Label>Complaint</Label>
          <TextInput
            multiline
            defaultValue=""
            onChangeText={(v) => {
              messageRef.current = v;
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Describe your issue in detail — order ID, tracking number, or any other relevant info helps us resolve it faster."
            placeholderTextColor={PLACEHOLDER}
            textAlignVertical="top"
            style={[
              FIELD,
              TS.sm,
              {
                /* rows={5}: five 20px lines + py-2.5 + border */
                height: 122,
                paddingTop: 10,
                paddingBottom: 10,
                color: BODY,
                includeFontPadding: false,
                borderColor: focused ? RED : C.gray200,
              },
              focused && { boxShadow: FOCUS_RING },
            ]}
          />
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderTopWidth: 1,
          borderTopColor: C.gray100,
          backgroundColor: 'rgba(255,255,255,0.8)',
        }}
      >
        <ScalePress
          onPress={onClose}
          containerStyle={{ flex: 1 }}
          style={{
            paddingVertical: 10,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: C.gray200,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={[TS.sm, { fontWeight: '600', color: C.gray600 }]}>Cancel</Text>
        </ScalePress>
        <ScalePress
          onPress={handleSubmit}
          disabled={submitting}
          containerStyle={{ flex: 1 }}
          style={{
            paddingVertical: 10,
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: RED,
            boxShadow: '0 4px 14px #e6222244',
            opacity: submitting ? 0.5 : 1,
          }}
        >
          {submitting ? <Spinner size={14} color="#ffffff" /> : <Check size={14} color="#ffffff" />}
          <Text style={[TS.sm, { fontWeight: '700', color: '#ffffff' }]}>
            {submitting ? 'Submitting…' : 'Submit Complaint'}
          </Text>
        </ScalePress>
      </View>
    </View>
  );
}

/* `visible` / `onClose`, like the other in-screen sheets. The panel mounts
   fresh on every open, so subject and text start empty each time — the web
   mounted the modal only while open. The subject picker is a sibling of the
   sheet (not inside its animated panel) so it covers the whole screen. */
export default function ComplaintModal({ visible, currentUser, onClose }) {
  const [subject, setSubject] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => {
    if (visible) setSubject('');
    else setPickerOpen(false);
  }, [visible]);

  return (
    <>
      <Overlay visible={visible} onClose={onClose} scrim="rgba(0,0,0,0.55)" panelStyle={{ maxHeight: '92%' }}>
        <ComplaintPanel
          currentUser={currentUser}
          onClose={onClose}
          subject={subject}
          pickerOpen={pickerOpen}
          onOpenPicker={() => setPickerOpen(true)}
        />
      </Overlay>
      <PickerSheet
        visible={visible && pickerOpen}
        title="Subject"
        options={SUBJECT_OPTIONS}
        value={subject}
        onSelect={(v) => {
          setSubject(v);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}
