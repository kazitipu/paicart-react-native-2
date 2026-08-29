import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput } from 'react-native';

const LENGTH = 6;

/* Six single-character boxes. The web version hand-rolled paste splitting and
   arrow-key traversal; on a phone the equivalents are the OS autofill of an
   incoming SMS code and backspace moving to the previous box.
 *
   `autoComplete="sms-otp"` (Android) and `textContentType="oneTimeCode"` (iOS)
   are what let the keyboard offer the code straight from the SMS. */
export default function OtpBoxes({ value = '', onChange, autoFocus = true }) {
  const refs = useRef([]);
  const [digits, setDigits] = useState(Array(LENGTH).fill(''));

  useEffect(() => {
    const next = String(value).slice(0, LENGTH).split('');
    setDigits(Array.from({ length: LENGTH }, (_, i) => next[i] || ''));
  }, [value]);

  const setAt = (i, char) => {
    /* A pasted or autofilled code arrives in one box — spread it across all
       six rather than keeping only the first character. */
    const cleaned = String(char).replace(/\D/g, '');
    if (cleaned.length > 1) {
      const spread = cleaned.slice(0, LENGTH).split('');
      const next = Array.from({ length: LENGTH }, (_, k) => spread[k] || '');
      setDigits(next);
      onChange(next.join(''));
      refs.current[Math.min(spread.length, LENGTH - 1)]?.focus();
      return;
    }
    const next = [...digits];
    next[i] = cleaned;
    setDigits(next);
    onChange(next.join(''));
    if (cleaned && i < LENGTH - 1) refs.current[i + 1]?.focus();
  };

  const onKeyPress = (i, e) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  return (
    <View className="flex-row justify-between gap-2">
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          onChangeText={(t) => setAt(i, t)}
          onKeyPress={(e) => onKeyPress(i, e)}
          keyboardType="number-pad"
          maxLength={LENGTH}
          autoFocus={autoFocus && i === 0}
          autoComplete={i === 0 ? 'sms-otp' : 'off'}
          textContentType={i === 0 ? 'oneTimeCode' : 'none'}
          className={`flex-1 h-13 text-center text-lg font-extrabold text-foreground bg-gray-50 border-2 rounded-xl ${d ? 'border-brand' : 'border-gray-200'}`}
          style={{ height: 52 }}
        />
      ))}
    </View>
  );
}
