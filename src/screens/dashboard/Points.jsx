import React from 'react';
import { View, Text } from 'react-native';
import { useSelector } from 'react-redux';
import { Award } from 'lucide-react-native';
import DashboardLayout from '@/components/DashboardLayout';
import { BUYER_LEVELS, computeBuyerLvl, getLevelMeta, getLevelProgress } from '@/lib/buyerLevel';
import colors from '@/theme/colors';

export default function Points() {
  const currentUser = useSelector((s) => s.user?.currentUser);
  const points = parseInt(currentUser?.totalPoints, 10) || 0;
  const lvl = computeBuyerLvl(points);
  const meta = getLevelMeta(lvl);
  const { fraction, pointsToNext, next } = getLevelProgress(points);

  return (
    <DashboardLayout title="Points & Level" contentClassName="p-3">
      <View className="bg-ink rounded-2xl p-4">
        <View className="flex-row items-center gap-2">
          <Award size={18} color={colors.primary} />
          <Text className="text-white font-extrabold text-md">{meta.label}</Text>
        </View>
        <Text className="text-white/60 text-2xs mt-1">
          1 point = ৳1 of any verified payment
        </Text>
        <Text className="text-white text-2xl font-extrabold mt-3">
          {points.toLocaleString()}
        </Text>
        <Text className="text-white/60 text-2xs">total points</Text>

        <View className="h-2 rounded-full bg-white/15 mt-4 overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{ width: `${Math.round(fraction * 100)}%`, backgroundColor: colors.primary }}
          />
        </View>
        <Text className="text-white/60 text-2xs mt-2">
          {next
            ? `${pointsToNext.toLocaleString()} more to reach ${next.label}`
            : 'You have reached the highest level.'}
        </Text>
      </View>

      <View className="bg-white rounded-xl border border-gray-100 mt-3">
        <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest px-3 pt-3 pb-1">
          All levels
        </Text>
        {BUYER_LEVELS.map((l) => {
          const active = l.lvl === lvl;
          return (
            <View
              key={l.lvl}
              className={`flex-row items-center justify-between px-3 py-3 border-t border-gray-50 ${active ? 'bg-primary-tint' : ''}`}
            >
              <Text className={`text-smd ${active ? 'text-primary font-bold' : 'text-foreground'}`}>
                {l.label}
              </Text>
              <Text className="text-2xs text-gray-500">
                {l.max == null
                  ? `৳${l.min.toLocaleString()}+`
                  : `৳${l.min.toLocaleString()} – ৳${l.max.toLocaleString()}`}
              </Text>
            </View>
          );
        })}
      </View>
    </DashboardLayout>
  );
}
