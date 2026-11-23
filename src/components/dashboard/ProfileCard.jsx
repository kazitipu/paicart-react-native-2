import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import Avatar from '@/components/Avatar';
import { Press } from '@/components/product/ui';
import Icon from './icons';
import { Grad, bdt } from './ui';
import TransactionHistory from './TransactionHistory';

/* Profile card + the expandable "TOTAL OUTSTANDING DUE" box (web page.jsx
   .profile-card / .outstanding-box <details>).

   Two looks for the outstanding box: the design file's original dark navy
   (#102442 → #1d4d7c, white figures), and the later light variant the web's
   cascaded dashboard.css actually renders (white → #fffaf6, orange figure).
   OUTSTANDING_THEME picks one. */
const NAVY = {
  stops: [[0, '#102442'], [0.58, '#173d6c'], [1, '#1d4d7c']],
  border: 'rgba(255,255,255,0.22)',
  ring: 'rgba(255,255,255,0.10)',
  shadow: '0 10px 24px rgba(20,48,83,0.22)',
  iconStops: [[0, '#ffffff', 0.2], [1, '#ffffff', 0.08]],
  iconBorder: 'rgba(255,255,255,0.16)',
  iconColor: '#ffe1b0',
  label: 'rgba(226,238,252,0.76)',
  amount: '#ffffff',
  caption: 'rgba(226,238,252,0.68)',
  expand: '#ffe1b0',
  detailsBorder: 'rgba(226,238,252,0.15)',
  detailsBg: 'transparent',
  headTitle: '#f5f8fc',
  headSub: 'rgba(226,238,252,0.57)',
  rowBg: 'rgba(255,255,255,0.065)',
  rowBorder: 'rgba(255,255,255,0.085)',
  rowIconBg: 'rgba(255,255,255,0.11)',
  rowIcon: '#dcecff',
  rowTitle: '#f5f8fc',
  rowSub: 'rgba(226,238,252,0.57)',
  rowAmount: '#ffffff',
  foot: 'rgba(226,238,252,0.65)',
  footIcon: '#ffc18e',
};
const LIGHT = {
  stops: [[0, '#ffffff'], [1, '#fffaf6']],
  border: '#f4d8c4',
  ring: 'rgba(255,106,0,0.09)',
  shadow: '0 8px 22px rgba(232,95,0,0.075)',
  iconStops: [[0, '#ff9a45'], [0.55, '#f36b08'], [1, '#e85d04']],
  iconBorder: 'rgba(255,255,255,0.35)',
  iconColor: '#ffffff',
  label: '#9a6a4c',
  amount: '#e85d04',
  caption: '#8d8179',
  expand: '#d95b07',
  detailsBorder: '#f2e2d7',
  detailsBg: '#fffaf5',
  headTitle: '#332921',
  headSub: '#a18e80',
  rowBg: 'rgba(255,255,255,0.88)',
  rowBorder: '#f2e8e1',
  rowIconBg: '#fff0e5',
  rowIcon: '#e66a18',
  rowTitle: '#332921',
  rowSub: '#a09389',
  rowAmount: '#e85d04',
  foot: '#97897f',
  footIcon: '#df772f',
};
const OUTSTANDING_THEME = LIGHT;

function Ring({ size, style, color }) {
  return <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: color }, style]} />;
}

/* Stage pill colours for a due bill's bucket (web .due-bill-stage[data-stage]). */
const STAGE_TONE = {
  'To Ship': { bg: '#fff1e6', border: '#fbdcc4', fg: '#d95b07' },
  'In Shipment': { bg: '#eaf3ff', border: '#d3e5fb', fg: '#2f6fb5' },
  'To Receive': { bg: '#f2edff', border: '#e3daf9', fg: '#7350c0' },
  Delivered: { bg: '#ecf9f1', border: '#d3eedd', fg: '#22814f' },
};

function StagePill({ bucket }) {
  const tone = STAGE_TONE[bucket] || STAGE_TONE['To Ship'];
  return (
    <View style={{ alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 999, borderWidth: 1, borderColor: tone.border, backgroundColor: tone.bg }}>
      <Text style={{ fontSize: 8.5, fontWeight: '800', color: tone.fg }}>{bucket}</Text>
    </View>
  );
}

function DueBill({ bill, onPress }) {
  const T = OUTSTANDING_THEME;
  return (
    <Press
      onPress={() => onPress(bill)}
      accessibilityRole="button"
      accessibilityLabel={`Bill ${bill.id}, due ${bdt(bill.due)}`}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 9, paddingVertical: 8, borderRadius: 10,
        borderWidth: 1, borderColor: T.rowBorder, backgroundColor: pressed ? T.detailsBg : '#ffffff',
      })}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: T.rowTitle }} numberOfLines={1}>#{bill.id}</Text>
        {bill.title ? (
          <Text style={{ fontSize: 9.5, color: T.rowSub, marginTop: 1 }} numberOfLines={1}>{bill.title}</Text>
        ) : null}
        <StagePill bucket={bill.bucket} />
      </View>
      <View style={{ alignItems: 'flex-end', flexShrink: 0, maxWidth: '55%' }}>
        <Text style={{ fontSize: 12.5, fontWeight: '900', color: T.rowAmount }} numberOfLines={1}>{bdt(bill.due)}</Text>
        <Text style={{ fontSize: 9, color: T.rowSub, marginTop: 2 }} numberOfLines={1}>
          Bill {bdt(bill.bill)} · Paid {bdt(bill.paid)}
        </Text>
      </View>
      <Icon name="chevronRight" size={13} color={T.rowSub} strokeWidth={2} />
    </Press>
  );
}

/* One category (web .due-group <details>): open by default when it has bills. */
function DueGroup({ icon, title, sub, bills, amount, loaded, onBill }) {
  const T = OUTSTANDING_THEME;
  const [open, setOpen] = useState(bills.length > 0);
  /* Bills arrive after the first render (loading) — open the group then. */
  const hadBills = useRef(bills.length > 0);
  useEffect(() => {
    if (bills.length > 0 && !hadBills.current) {
      hadBills.current = true;
      setOpen(true);
    }
  }, [bills.length]);

  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: T.rowBorder, backgroundColor: T.rowBg, overflow: 'hidden' }}>
      <Press
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 9, paddingVertical: 8, opacity: pressed ? 0.75 : 1 })}
      >
        <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: T.rowIconBg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={16} color={T.rowIcon} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 11.5, fontWeight: '800', color: T.rowTitle }} numberOfLines={1}>{title}</Text>
          <Text style={{ fontSize: 9.5, color: T.rowSub, marginTop: 2 }} numberOfLines={1}>
            {sub} · {loaded ? `${bills.length} ${bills.length === 1 ? 'bill' : 'bills'} due` : '…'}
          </Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: '800', color: T.rowAmount }}>{loaded ? bdt(amount, 2) : '…'}</Text>
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <Icon name="chevronRight" size={13} color={T.expand} strokeWidth={2} />
        </View>
      </Press>
      {open ? (
        <View style={{ paddingHorizontal: 8, paddingBottom: 8, gap: 6 }}>
          {bills.length === 0 ? (
            <Text style={{ fontSize: 10, color: T.rowSub, paddingHorizontal: 2, paddingVertical: 2 }}>
              {loaded ? 'No due bills here.' : 'Loading…'}
            </Text>
          ) : (
            bills.map((b) => <DueBill key={b.key} bill={b} onPress={onBill} />)
          )}
        </View>
      ) : null}
    </View>
  );
}

const NO_BILLS = [];

function Outstanding({ outstanding, loaded, transactions, onBill }) {
  const T = OUTSTANDING_THEME;
  const [open, setOpen] = useState(false);
  const bills = outstanding.bills || {};

  const groups = [
    ['cart', 'Buy & Ship for me', 'Website order', bills.websiteOrder || NO_BILLS, outstanding.websiteOrderDue],
    ['truck', 'Ship for me', 'Only shipment', bills.shipment || NO_BILLS, outstanding.shipmentDue],
    ['box', 'Requested Product', 'Product request', bills.requestedProduct || NO_BILLS, outstanding.requestedProductDue],
  ];

  return (
    <View style={{ marginTop: 13, borderRadius: 18, borderWidth: 1, borderColor: T.border, overflow: 'hidden', boxShadow: T.shadow }}>
      <Grad stops={T.stops} />
      <Ring size={150} color={T.ring} style={{ top: -62, right: -48 }} />
      <Ring size={95} color={T.ring} style={{ top: -35, right: -20 }} />

      <Press
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="Total outstanding due, view details"
        style={{ minHeight: 108, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 15 }}
      >
        <View style={{ width: 44, height: 44, borderRadius: 15, borderWidth: 1, borderColor: T.iconBorder, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <Grad stops={T.iconStops} />
          <Icon name="wallet" size={22} color={T.iconColor} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.75, color: T.label }}>TOTAL OUTSTANDING DUE</Text>
          <Text style={{ marginTop: 4, fontSize: 27, lineHeight: 32, fontWeight: '900', letterSpacing: -0.8, color: T.amount }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {loaded ? bdt(outstanding.total, 2) : '…'}
          </Text>
          <Text style={{ marginTop: 3, fontSize: 10, color: T.caption }}>Your total unpaid invoice balance</Text>
        </View>
        <View style={{ alignItems: 'center', gap: 5 }}>
          <Text style={{ fontSize: 9, fontWeight: '800', color: T.expand }}>{open ? 'Hide details' : 'View details'}</Text>
          <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
            <Icon name="chevronRight" size={17} color={T.expand} strokeWidth={2.1} />
          </View>
        </View>
      </Press>

      {open ? (
        <View style={{ paddingHorizontal: 11, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: T.detailsBorder, backgroundColor: T.detailsBg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9, marginHorizontal: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: T.headTitle }}>Due Breakdown</Text>
            <Text style={{ fontSize: 10, fontWeight: '600', color: T.headSub }}>By invoice category</Text>
          </View>
          <View style={{ gap: 7 }}>
            {groups.map(([icon, title, sub, list, amount]) => (
              <DueGroup key={title} icon={icon} title={title} sub={sub} bills={list} amount={amount} loaded={loaded} onBill={onBill} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10 }}>
            <View style={{ marginTop: 1 }}><Icon name="info" size={12} color={T.footIcon} /></View>
            <Text style={{ flex: 1, fontSize: 10, lineHeight: 14.5, color: T.foot }}>
              Due covers items from To Ship to Delivered — To Pay, pending and rejected items are not included. Slips waiting for verification don't reduce the due yet.
            </Text>
          </View>

          <TransactionHistory transactions={transactions} loading={!loaded} />
        </View>
      ) : null}
    </View>
  );
}

export default function ProfileCard({ user, displayId, shippingMark, onCopy, onEdit, outstanding, loaded, transactions, onBill }) {
  return (
    <View style={{ borderRadius: 18, padding: 14, overflow: 'hidden', boxShadow: '0 7px 18px rgba(255,106,0,0.14)' }}>
      <Grad stops={[[0, '#f56a08'], [1, '#ff851f']]} dir="right" />
      <Ring size={190} color="rgba(255,255,255,0.12)" style={{ right: -88, top: -112 }} />
      <Ring size={140} color="rgba(255,255,255,0.12)" style={{ right: -48, bottom: -105 }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar
          user={user}
          editable={!!user?.id}
          sizeClass="w-12 h-12"
          roundedClass="rounded-2xl"
          bgClass="bg-white/20"
          ringClass="border border-white/40"
          textStyle={{ fontSize: 20, lineHeight: 26, fontWeight: '800', color: '#ffffff' }}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 15, lineHeight: 19, fontWeight: '800', color: '#ffffff' }} numberOfLines={1}>
            {user?.displayName || 'Paicart Customer'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 22, marginTop: 1 }}>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.86)', flexShrink: 1 }} numberOfLines={1}>
              User ID: <Text style={{ fontWeight: '800', letterSpacing: 0.25, color: '#ffffff' }}>{displayId || '—'}</Text>
            </Text>
            <Press
              onPress={() => onCopy(displayId, 'User ID')}
              accessibilityLabel="Copy user ID"
              hitSlop={6}
              style={({ pressed }) => ({
                width: 23, height: 23, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
                backgroundColor: pressed ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center',
                transform: [{ scale: pressed ? 0.91 : 1 }],
              })}
            >
              <Icon name="copy" size={13} color="#ffffff" />
            </Press>
          </View>
          {user?.email ? (
            <Text style={{ fontSize: 11, lineHeight: 16, color: 'rgba(255,255,255,0.86)' }} numberOfLines={1}>{user.email}</Text>
          ) : null}
          {shippingMark ? (
            <Press
              onPress={() => onCopy(shippingMark, 'Shipping mark')}
              accessibilityLabel="Copy shipping mark"
              style={({ pressed }) => ({
                alignSelf: 'flex-start', maxWidth: '100%', marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 5,
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
                backgroundColor: pressed ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.14)',
              })}
            >
              <Text style={{ fontSize: 10.5, color: '#ffffff', flexShrink: 1 }} numberOfLines={1}>
                Shipping mark: <Text style={{ fontWeight: '800' }}>{shippingMark}</Text>
              </Text>
              <Icon name="copy" size={11} color="#ffffff" />
            </Press>
          ) : null}
        </View>
        <Press
          onPress={onEdit}
          accessibilityLabel="Edit profile"
          style={({ pressed }) => ({
            width: 34, height: 34, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
            backgroundColor: pressed ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center',
          })}
        >
          <Icon name="edit" size={16} color="#ffffff" />
        </Press>
      </View>

      <Outstanding outstanding={outstanding} loaded={loaded} transactions={transactions} onBill={onBill} />
    </View>
  );
}
