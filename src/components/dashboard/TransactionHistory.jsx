import React, { useMemo, useState } from 'react';
import { View, Text, Share, Linking, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Select from '@/components/ui/Select';
import { Press } from '@/components/product/ui';
import { toast } from '@/lib/toast';
import { TXN_TYPE_LABELS, formatDateTime } from '@/lib/dashboardData';
import Icon from './icons';
import { bdt, openTxnTarget, openList, openRecord } from './ui';

/* Port of the web's _overview/TransactionHistory.jsx. Filters by period,
   payment type and status; each entry is the web's Entry. The web's
   "Statement" downloaded a CSV file — here the same CSV text goes to the
   system share sheet (no file-system dependency). */

const PERIODS = {
  '1y': { label: 'Last 1 year', months: 12 },
  '6m': { label: 'Last 6 months', months: 6 },
  '2m': { label: 'Last 2 months', months: 2 },
  all: { label: 'All time', months: null },
};
const STATUS_LABEL = { approved: 'Approved', pending: 'Pending verification', rejected: 'Rejected' };
const PAGE = 20;

const METHOD_TONE = {
  cash: { bg: '#fff0e4', border: '#f3e7de', fg: '#d85e0b' },
  direct: { bg: '#fff0e4', border: '#f3e7de', fg: '#d85e0b' },
  bank: { bg: '#e9f2ff', border: '#e4edf8', fg: '#3978b8' },
  manual: { bg: '#f2edff', border: '#ece5fa', fg: '#7c60b9' },
};
const STATUS_TONE = {
  approved: { bg: '#effaf3', border: '#dcefe4', fg: '#208456' },
  pending: { bg: '#fff8e9', border: '#f3e5c5', fg: '#ac771d' },
  rejected: { bg: '#fff3f2', border: '#f2dedd', fg: '#c15a54' },
};

function StatusPill({ tone, label }) {
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4,
        borderRadius: 999, borderWidth: 1, borderColor: tone.border, backgroundColor: tone.bg,
      }}
    >
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: tone.fg }} />
      <Text style={{ fontSize: 9.5, fontWeight: '800', color: tone.fg }} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function MiniAction({ label, primary, onPress }) {
  return (
    <Press
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1,
        borderColor: primary ? '#ffd8be' : '#ece9e6', backgroundColor: primary ? '#fff5ed' : '#ffffff',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 10, fontWeight: '800', color: primary ? '#d45b08' : '#59636e' }}>{label}</Text>
    </Press>
  );
}

function ImpactRow({ label, value, credit, balance }) {
  return (
    <View
      style={{
        flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 4,
        ...(balance ? { borderTopWidth: 1, borderTopColor: '#e3efe7', marginTop: 2, paddingTop: 6 } : null),
      }}
    >
      <Text style={{ fontSize: 10, color: balance ? '#2d3a33' : '#6f7c74', fontWeight: balance ? '800' : '500', flexShrink: 1 }}>{label}</Text>
      <Text style={{ fontSize: 10.5, fontWeight: '800', color: credit ? '#208456' : '#29313a' }}>{value}</Text>
    </View>
  );
}

const Entry = React.memo(function Entry({ t, first, navigation }) {
  const isRecorded = !!t.recorded;
  const isCash = t.type === 'cash';
  const short = isCash ? 'CASH' : t.type === 'bank' ? '৳' : 'bK';
  const statusText = isRecorded
    ? isCash ? 'Cash received · confirmed' : 'Recorded · confirmed'
    : STATUS_LABEL[t.status] || 'Recorded';
  const tone = METHOD_TONE[t.type] || METHOD_TONE.manual;
  const sTone = isRecorded ? STATUS_TONE.approved : STATUS_TONE[t.status] || STATUS_TONE.approved;
  const hasTarget = !!t.kind;

  return (
    <View style={{ paddingVertical: 12, paddingHorizontal: 1, borderTopWidth: first ? 0 : 1, borderTopColor: '#f1efed' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 9 }}>
        <View
          style={{
            width: 37, height: 37, borderRadius: 12, borderWidth: 1, borderColor: tone.border,
            backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: isCash ? 8.5 : 11, fontWeight: '900', color: tone.fg }}>{short}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 12, lineHeight: 16, fontWeight: '800', color: '#29313a' }}>{t.methodLabel}</Text>
            <Text style={{ fontSize: 12.5, lineHeight: 16, fontWeight: '900', color: '#252d35' }}>{bdt(t.amount)}</Text>
          </View>
          <Text style={{ marginTop: 3, fontSize: 10, lineHeight: 14, color: '#8d959e' }}>
            {isRecorded ? `Transaction ID: ${t.id}` : `${t.id} · ${t.reference}`}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 9, rowGap: 5, marginTop: 7 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="calendarPlain" size={11} color="#a0a7ae" />
              <Text style={{ fontSize: 9.5, color: '#9299a1' }}>{formatDateTime(t.time)}</Text>
            </View>
            <StatusPill tone={sTone} label={statusText} />
          </View>
        </View>
      </View>

      {isRecorded ? (
        <View style={{ marginTop: 10, marginLeft: 46, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#dcefe4', backgroundColor: '#f6fcf8' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#22a06b', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>✓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#1f5a3e' }}>
                {isCash ? 'Cash collection confirmed' : 'Payment recorded by Paicart'}
              </Text>
              <Text style={{ fontSize: 9.5, color: '#5f7a6b', marginTop: 2 }}>
                {isCash ? 'Received in person and adjusted against your due' : 'Entered by our team and adjusted against your due'}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 9 }}>
            {[['Received by', t.receivedBy], ['Receipt ID', t.id]].map(([k, v]) => (
              <View key={k} style={{ flex: 1, padding: 7, borderRadius: 9, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e6f1ea' }}>
                <Text style={{ fontSize: 9, color: '#7b8a81' }}>{k}</Text>
                <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#29313a', marginTop: 2 }} numberOfLines={2}>{v}</Text>
              </View>
            ))}
          </View>
          <View style={{ marginTop: 8 }}>
            <ImpactRow label="Invoice due before" value={bdt(t.dueBefore)} />
            <ImpactRow label={isCash ? 'Cash received' : 'Payment received'} value={`− ${bdt(t.amount)}`} credit />
            <ImpactRow label="Remaining due after adjustment" value={bdt(t.dueAfter)} balance />
          </View>
          <Text style={{ marginTop: 6, fontSize: 9, color: '#7b8a81' }}>Keep the receipt ID for future reference.</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 9, marginLeft: 46 }}>
        <Press
          disabled={!hasTarget}
          onPress={() => openTxnTarget(navigation, t)}
          style={({ pressed }) => ({ flexShrink: 1, opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={{ fontSize: 10, lineHeight: 14, color: hasTarget ? '#6d7781' : '#8a929b', textDecorationLine: hasTarget ? 'underline' : 'none' }}>
            Invoice: {t.invoice}
          </Text>
        </Press>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {t.status === 'rejected' ? (
            <MiniAction
              primary
              label="Pay again"
              onPress={() => (t.kind ? openList(navigation, t.kind) : openRecord(navigation, 'order', t.ids?.[0]))}
            />
          ) : t.type === 'direct' ? (
            <StatusPill tone={STATUS_TONE.approved} label="Gateway verified" />
          ) : t.slipUrl ? (
            <MiniAction
              label="View slip"
              onPress={() => Linking.openURL(t.slipUrl).catch(() => toast.error('Could not open the slip.'))}
            />
          ) : null}
        </View>
      </View>
      {t.status === 'rejected' ? (
        <View style={{ marginTop: 9, marginLeft: 46, padding: 9, borderRadius: 10, borderWidth: 1, borderColor: '#f5e4e1', backgroundColor: '#fff8f7' }}>
          <Text style={{ fontSize: 10, lineHeight: 15, color: '#a75a55' }}>
            <Text style={{ fontWeight: '800' }}>Reason: </Text>
            {t.note}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export default function TransactionHistory({ transactions, loading }) {
  const navigation = useNavigation();
  const [status, setStatus] = useState('all');
  const [period, setPeriod] = useState('1y');
  const [type, setType] = useState('all');
  const [limit, setLimit] = useState(PAGE);

  const inPeriod = useMemo(() => {
    const months = PERIODS[period].months;
    if (!months) return transactions;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return transactions.filter((t) => (t.time || 0) >= cutoff.getTime());
  }, [transactions, period]);
  const ofType = useMemo(() => (type === 'all' ? inPeriod : inPeriod.filter((t) => t.type === type)), [inPeriod, type]);
  const shown = useMemo(() => (status === 'all' ? ofType : ofType.filter((t) => t.status === status)), [ofType, status]);
  const count = (s) => ofType.filter((t) => t.status === s).length;

  const shareStatement = async () => {
    if (!shown.length) return;
    const rows = [
      ['Date', 'Transaction ID', 'Reference', 'Payment type', 'Status', 'Amount (BDT)', 'Invoice'],
      ...shown.map((t) => [formatDateTime(t.time), t.id, t.reference, t.methodLabel, STATUS_LABEL[t.status] || t.status, t.amount, t.invoice]),
    ];
    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
    try {
      await Share.share({ title: `paicart-statement-${new Date().toISOString().slice(0, 10)}.csv`, message: csv });
    } catch {
      toast.error('Could not share the statement.');
    }
  };

  const setFilter = (fn) => (v) => {
    fn(v);
    setLimit(PAGE);
  };

  const statusWord = status === 'all' ? 'transactions' : `${status} transactions`;
  const visible = shown.slice(0, limit);

  return (
    <View style={{ marginTop: 11, overflow: 'hidden', borderWidth: 1, borderColor: '#eee8e3', borderRadius: 20, backgroundColor: '#ffffff', boxShadow: '0 8px 24px rgba(49,35,24,0.045)' }}>
      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 12, paddingTop: 13, paddingBottom: 11, borderBottomWidth: 1, borderBottomColor: '#f0eeec' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#ffe9d8', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="calendar" size={16} color="#d9600b" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#292f36' }}>Transaction History</Text>
            <Text style={{ fontSize: 10, color: '#9ba1a8', marginTop: 2 }} numberOfLines={2}>
              {loading
                ? 'Loading…'
                : `${shown.length} ${statusWord}${type === 'all' ? '' : ` · ${TXN_TYPE_LABELS[type]}`} · ${PERIODS[period].label}`}
            </Text>
          </View>
        </View>
        <Press
          onPress={shareStatement}
          disabled={!shown.length}
          accessibilityLabel="Share these transactions as a CSV statement"
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32, paddingHorizontal: 9, borderRadius: 10,
            borderWidth: 1, borderColor: '#f2e4d9', backgroundColor: '#fffaf6', opacity: !shown.length ? 0.45 : pressed ? 0.7 : 1,
          })}
        >
          <Icon name="download" size={13} color="#d45b08" strokeWidth={1.9} />
          <Text style={{ fontSize: 10, fontWeight: '800', color: '#d45b08' }}>Statement</Text>
        </Press>
      </View>

      {/* period + type */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 11 }}>
        <View style={{ flex: 1 }}>
          <Select
            label="Transaction period"
            value={period}
            onChange={setFilter(setPeriod)}
            options={Object.entries(PERIODS).map(([k, p]) => ({ value: k, label: p.label }))}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Select
            label="Payment type"
            value={type}
            onChange={setFilter(setType)}
            options={[{ value: 'all', label: 'All payment types' }, ...Object.entries(TXN_TYPE_LABELS).map(([k, l]) => ({ value: k, label: l }))]}
          />
        </View>
      </View>

      {/* status chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingTop: 11, paddingBottom: 10 }}>
        {[
          ['all', 'All', ofType.length],
          ['approved', 'Approved', count('approved')],
          ['pending', 'Pending', count('pending')],
          ['rejected', 'Rejected', count('rejected')],
        ].map(([k, label, n]) => {
          const active = status === k;
          return (
            <Press
              key={k}
              onPress={() => setFilter(setStatus)(k)}
              accessibilityState={{ selected: active }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 31, paddingHorizontal: 10, borderRadius: 999,
                borderWidth: 1, borderColor: active ? '#f8c39f' : '#ece9e6', backgroundColor: active ? '#ffeddf' : '#ffffff',
              }}
            >
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: active ? '#d75a05' : '#727b85' }}>{label}</Text>
              <View style={{ minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 999, backgroundColor: active ? '#ffe0ca' : '#f2f3f4', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: active ? '#c85305' : '#7b838c' }}>{n}</Text>
              </View>
            </Press>
          );
        })}
      </ScrollView>

      {/* list */}
      <View style={{ paddingHorizontal: 11, paddingBottom: 10 }}>
        {loading ? (
          <Empty title="Loading transactions…" body="Your payment records will appear here." />
        ) : shown.length === 0 ? (
          <Empty title="No transactions found" body="There are no records for this filter and time period." />
        ) : (
          <>
            {visible.map((t, i) => <Entry key={t.key} t={t} first={i === 0} navigation={navigation} />)}
            {shown.length > limit ? (
              <Press
                onPress={() => setLimit((l) => l + PAGE)}
                style={({ pressed }) => ({ marginTop: 4, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#f2e4d9', backgroundColor: pressed ? '#fff1e6' : '#fffaf6', alignItems: 'center' })}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#d45b08' }}>Show more ({shown.length - limit} left)</Text>
              </Press>
            ) : null}
          </>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginHorizontal: 12, marginBottom: 12, padding: 10, borderRadius: 11, borderWidth: 1, borderColor: '#f0ece6', backgroundColor: '#faf9f7' }}>
        <View style={{ marginTop: 1 }}><Icon name="info" size={12} color="#d17a3c" /></View>
        <Text style={{ flex: 1, fontSize: 9.5, lineHeight: 14, color: '#92918e' }}>
          Pending or rejected slip submissions do not reduce your due. Payments recorded by Paicart (cash or offline) show the receipt ID and the due before and after adjustment.
        </Text>
      </View>
    </View>
  );
}

function Empty({ title, body }) {
  return (
    <View style={{ paddingVertical: 25, paddingHorizontal: 12, alignItems: 'center' }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#4b545e', marginBottom: 3 }}>{title}</Text>
      <Text style={{ fontSize: 10.5, color: '#9098a2', textAlign: 'center' }}>{body}</Text>
    </View>
  );
}
