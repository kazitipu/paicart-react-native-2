import React from 'react';
import { View, Text } from 'react-native';

/* The app's one badge primitive. Colours are the brand plate; `violet` and
   `sky` are deliberately outside it and used only where no official colour
   fits (see the web _shared.jsx). Text tones are darkened against the tinted
   background for contrast — do not swap them for the raw brand hex. */
export const SOFT_COLORS = {
  orange: { bg: '#fff1e6', text: '#FF6A00' },
  blue: { bg: '#e8f1ff', text: '#1677FF' },
  teal: { bg: '#e3f8f6', text: '#00857A' },
  amber: { bg: '#fef6e0', text: '#8a5a06' },
  emerald: { bg: '#e5f9e9', text: '#00B42A' },
  red: { bg: '#fdeaea', text: '#F5222D' },
  violet: { bg: '#f2ecfe', text: '#7c3aed' },
  sky: { bg: '#e6f6fd', text: '#0284c7' },
  gray: { bg: '#f1f2f4', text: '#899999' },
};

export default function SoftPill({
  color = 'gray',
  icon = null,
  children,
  className = '',
  textClassName = '',
  style,
}) {
  const c = SOFT_COLORS[color] || SOFT_COLORS.gray;
  return (
    <View
      className={`flex-row items-center rounded-full px-2 py-0.5 ${className}`}
      style={[{ backgroundColor: c.bg }, style]}
    >
      {icon}
      <Text
        className={`font-extrabold text-2xs ${textClassName}`}
        style={{ color: c.text }}
      >
        {children}
      </Text>
    </View>
  );
}
