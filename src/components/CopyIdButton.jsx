import React, { useState, useEffect, useRef } from 'react';
import { Pressable } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Copy, Check } from 'lucide-react-native';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

/* Inline copy-to-clipboard for the order/booking IDs shown on list cards.
   Copies, flashes a check for 1.5s, and toasts. */
export default function CopyIdButton({ value, className = '', size = 12, variant = 'light' }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  /* The web version leaked this timeout — on a list of 20 cards, unmounting
     mid-flash left a setState pointed at a dead component. */
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleCopy = () => {
    if (!value) return;
    Clipboard.setString(String(value));
    setCopied(true);
    toast.success('Copied!');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  };

  const idle = variant === 'dark' ? 'rgba(255,255,255,0.6)' : colors.muted;
  const done = variant === 'dark' ? '#6ee7b7' : colors.success;

  return (
    <Pressable
      onPress={handleCopy}
      accessibilityLabel="Copy ID"
      hitSlop={8}
      className={`items-center justify-center ${className}`}
    >
      {copied ? <Check size={size} color={done} /> : <Copy size={size} color={idle} />}
    </Pressable>
  );
}
