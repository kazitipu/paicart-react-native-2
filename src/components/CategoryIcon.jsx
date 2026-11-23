import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { categoryIcon } from '@/data/categoryIcons';

/* One storefront category's custom line icon on its soft tile
   (data/categoryIcons.js — same set as the website). */
export default function CategoryIcon({ id, box = 40, size = 22 }) {
  const icon = categoryIcon(id);
  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: 12,
        backgroundColor: icon.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke={icon.color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon.shapes.map((s, i) =>
          s.d ? (
            <Path key={i} d={s.d} fill={s.fill ? icon.color : 'none'} />
          ) : (
            <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill ? icon.color : 'none'} />
          ),
        )}
      </Svg>
    </View>
  );
}
