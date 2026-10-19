import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Package, Truck, User, ChevronRight, MessageSquareWarning, Award,
} from 'lucide-react-native';
import Avatar from '@/components/Avatar';
import ComplaintModal from '@/components/ComplaintModal';
import EmptyState from '@/components/ui/EmptyState';
import { DASHBOARD_NAV } from '@/data/dashboardNav';
import { getOrderStatCounts, getShipStatCounts } from '@/lib/firebaseUtils';
import { computeBuyerLvl, getLevelMeta } from '@/lib/buyerLevel';
import colors from '@/theme/colors';

const ICONS = { Package, Truck, User };

const ORDER_STATS = [
  { key: 'toPay', label: 'To Pay', tab: 'To Pay' },
  { key: 'toShip', label: 'To Ship', tab: 'To Ship' },
  { key: 'inShipment', label: 'In Shipment', tab: 'In Shipment' },
  { key: 'toReceive', label: 'To Receive', tab: 'To Receive' },
  { key: 'delivered', label: 'Delivered', tab: 'Delivered' },
];

const SHIP_STATS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'inShipment', label: 'In Shipment' },
  { key: 'toReceive', label: 'To Receive' },
  { key: 'delivered', label: 'Delivered' },
];

function StatRow({ title, stats, values, onPress }) {
  return (
    <View className="bg-white mt-2 px-3 py-3">
      <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
        {title}
      </Text>
      <View className="flex-row">
        {stats.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => onPress?.(s)}
            className="flex-1 items-center py-1"
          >
            <Text className="text-md font-extrabold text-primary">{values?.[s.key] ?? 0}</Text>
            <Text className="text-xxs text-gray-500 text-center mt-0.5">{s.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function DashboardOverview() {
  const navigation = useNavigation();
  const currentUser = useSelector((s) => s.user?.currentUser);

  const [orderStats, setOrderStats] = useState(null);
  const [shipStats, setShipStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);

  const isLoggedIn =
    currentUser && (currentUser.email || currentUser.displayName) && currentUser.email !== '';

  const load = useCallback(() => {
    if (!currentUser?.id) return;
    /* Server-side counts on each document's `bucket` field — a few reads
       however many orders the user has. The list screens load their own
       data, so nothing here downloads the full history. */
    getOrderStatCounts(currentUser.id).then(setOrderStats).catch(() => {});
    getShipStatCounts(currentUser.id).then(setShipStats).catch(() => {});
  }, [currentUser?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!isLoggedIn) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <EmptyState
          icon={<User size={40} color={colors.muted} />}
          title="Sign in to see your dashboard"
          subtitle="Track orders, shipments and refunds in one place."
          actionLabel="Sign In"
          onAction={() => navigation.navigate('Login')}
        />
      </SafeAreaView>
    );
  }

  const points = parseInt(currentUser?.totalPoints, 10) || 0;
  const level = getLevelMeta(computeBuyerLvl(points));

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="pb-10"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
              setTimeout(() => setRefreshing(false), 700);
            }}
          />
        }
      >
        <View className="bg-ink px-4 py-5 flex-row items-center gap-3">
          <Avatar user={currentUser} editable sizeClass="w-14 h-14" roundedClass="rounded-2xl" />
          <View className="flex-1">
            <Text className="text-white font-bold text-md" numberOfLines={1}>
              {currentUser.displayName || 'My Account'}
            </Text>
            <Text className="text-white/60 text-2xs" numberOfLines={1}>
              {currentUser.email || currentUser.mobileNo}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Points')}
            className="flex-row items-center gap-1 bg-white/10 rounded-full px-2.5 py-1.5"
          >
            <Award size={12} color={colors.primary} />
            <Text className="text-white text-2xs font-bold">{level.label}</Text>
          </Pressable>
        </View>

        <StatRow
          title="My Orders"
          stats={ORDER_STATS}
          values={orderStats}
          onPress={(s) => navigation.navigate('BuyShipMyOrders', { tab: s.tab })}
        />
        <StatRow
          title="My Shipments"
          stats={SHIP_STATS}
          values={shipStats}
          onPress={() => navigation.navigate('ShipMyRequests')}
        />

        {DASHBOARD_NAV.map((section) => {
          const Icon = ICONS[section.icon] || Package;
          return (
            <View key={section.title} className="bg-white mt-2">
              <View className="flex-row items-center gap-2 px-3 pt-3 pb-1">
                <Icon size={15} color={colors.primary} />
                <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest">
                  {section.title}
                </Text>
              </View>
              {section.links.map((l) => (
                <Pressable
                  key={l.screen}
                  onPress={() => navigation.navigate(l.screen)}
                  className="flex-row items-center px-4 py-3 border-t border-gray-50"
                >
                  <Text className="flex-1 text-smd text-foreground">{l.label}</Text>
                  <ChevronRight size={15} color="#d1d5db" />
                </Pressable>
              ))}
            </View>
          );
        })}

        <Pressable
          onPress={() => setComplaintOpen(true)}
          className="flex-row items-center gap-2.5 bg-white mt-2 px-4 py-3.5"
        >
          <MessageSquareWarning size={17} color={colors.brand} />
          <Text className="flex-1 text-smd text-foreground">Report an issue</Text>
          <ChevronRight size={15} color="#d1d5db" />
        </Pressable>
      </ScrollView>

      <ComplaintModal
        visible={complaintOpen}
        currentUser={currentUser}
        onClose={() => setComplaintOpen(false)}
      />
    </SafeAreaView>
  );
}
