import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

const LENGTH = 6;
const RED = '#e62222';
const GRAY50 = '#f9fafb';
const GRAY200 = '#e5e7eb';
const BODY = '#1e293b';

/* ═══════════════════════════════════════════════════════════════════════
   Port of the web login page's <OtpBoxes> (< 640px):
   `flex gap-2 justify-between`, six `w-12 h-14 text-center text-xl
   font-extrabold border-2 border-gray-200 focus:border-[#e62222] bg-gray-50
   focus:bg-white rounded-xl caret-transparent`, the row at opacity-40 while
   disabled (code expired).

   ⚠️ RN: ONE uncontrolled TextInput (transparent, laid over the boxes)
   instead of six. Six controlled single-character inputs drop digits when
   typed fast or when the OS autofill / a paste lands in one box mid-render;
   a single native field owns the text, so nothing can be lost. The boxes are
   drawn from its text, and the "focused" box is the next one to fill — which
   is where the web moves focus after every digit. Paste and SMS autofill
   (`autoComplete="sms-otp"` / `textContentType="oneTimeCode"`) fill all six
   at once. To clear (a resend), the parent remounts this with a new `key`.

   ⚠️ RN: boxes may shrink below 48px (flexShrink) — on the web six 48px
   inputs + gaps need 328px and overflow the card on 360–390px-wide phones.
   ═══════════════════════════════════════════════════════════════════════ */
const OtpBoxes = forwardRef(function OtpBoxes({ onChange, disabled = false, autoFocus = false, onFocus, onBlur }, ref) {
  const inputRef = useRef(null);
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(false);
  useImperativeHandle(ref, () => inputRef.current);

  const onText = (t) => {
    const clean = String(t).replace(/\D/g, '').slice(0, LENGTH);
    /* A non-digit typed/pasted: strip it from the native field too. */
    if (clean !== t) inputRef.current?.setNativeProps?.({ text: clean });
    setCode(clean);
    onChange?.(clean);
  };

  const active = Math.min(code.length, LENGTH - 1);

  return (
    <View style={{ opacity: disabled ? 0.4 : 1 }}>
      <Pressable
        disabled={disabled}
        onPress={() => inputRef.current?.focus()}
        style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}
        accessible={false}
      >
        {Array.from({ length: LENGTH }, (_, i) => {
          const d = code[i] || '';
          const isFocus = focused && !disabled && i === active;
          return (
            <View
              key={i}
              style={{
                width: 48,
                flexShrink: 1,
                height: 56,
                borderWidth: 2,
                borderRadius: 12,
                borderColor: isFocus ? RED : GRAY200,
                backgroundColor: isFocus ? '#ffffff' : GRAY50,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {d ? (
                <Animated.Text
                  key={`${i}-${d}`}
                  entering={FadeIn.duration(120)}
                  style={{ fontSize: 20, lineHeight: 28, fontWeight: '800', color: BODY }}
                >
                  {d}
                </Animated.Text>
              ) : (
                <Text style={{ fontSize: 20, lineHeight: 28 }}> </Text>
              )}
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        editable={!disabled}
        onChangeText={onText}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={LENGTH}
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        importantForAutofill="yes"
        caretHidden
        contextMenuHidden={false}
        selectionColor="transparent"
        accessibilityLabel="Verification code"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          color: 'transparent',
          backgroundColor: 'transparent',
          fontSize: 1,
          textAlign: 'center',
        }}
      />
    </View>
  );
});

export default OtpBoxes;
