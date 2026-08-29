import React, { useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Download, ChevronLeft } from 'lucide-react-native';
import { Pressable } from 'react-native';
import Share from 'react-native-share';
import RNHTMLtoPDF from 'react-native-html-to-pdf';
import { toast } from '@/lib/toast';
import EmptyState from '@/components/ui/EmptyState';
import colors from '@/theme/colors';

/* Invoice chrome + the PDF hand-off.
 *
 * The web used react-to-print for printing and, for download, dynamically
 * imported html2canvas + jsPDF to rasterise the DOM node at scale 2 and slice
 * it into A4 pages. There is no DOM to rasterise here, so the invoice is
 * rendered twice: as native views for the screen, and as a small HTML document
 * for the PDF. `toHtml` supplies the second — a screen passes the same data it
 * just rendered, so the two cannot drift apart in content, only in styling.
 *
 * Sharing rather than saving: a viewer can't open a file the app wrote to its
 * own sandbox, and the share sheet covers save-to-Files, mail and WhatsApp in
 * one step. */
export function InvoiceRow({ label, value, bold, tone, hint }) {
  const toneClass =
    tone === 'green' ? 'text-invoice-ok' : tone === 'due' ? 'text-invoice-bad' : 'text-foreground';
  return (
    <View className="flex-row items-start justify-between py-1.5">
      <View className="flex-1 pr-3">
        <Text className={`text-smd ${bold ? 'font-bold' : ''} text-gray-600`}>{label}</Text>
        {!!hint && <Text className="text-2xs text-gray-400 mt-0.5">{hint}</Text>}
      </View>
      <Text className={`text-smd ${bold ? 'font-extrabold' : 'font-semibold'} ${toneClass}`}>
        {value}
      </Text>
    </View>
  );
}

export function InvoiceDivider() {
  return <View className="h-px bg-gray-200 my-2" />;
}

export function InvoiceSection({ title, children }) {
  return (
    <View className="mt-4">
      <Text className="text-2xs uppercase tracking-widest text-gray-400 font-bold mb-1">
        {title}
      </Text>
      {children}
    </View>
  );
}

const BADGE_TONES = {
  gray: { bg: '#f1f2f4', text: '#899999' },
  orange: { bg: '#fff1e6', text: '#FF6A00' },
  emerald: { bg: '#e5f9e9', text: '#00B42A' },
  amber: { bg: '#fef6e0', text: '#8a5a06' },
  red: { bg: '#fdeaea', text: '#F5222D' },
};

export function InvoiceBadge({ children, color = 'gray' }) {
  const c = BADGE_TONES[color] || BADGE_TONES.gray;
  return (
    <View className="rounded-full px-2.5 py-1 self-start" style={{ backgroundColor: c.bg }}>
      <Text className="text-2xs font-extrabold" style={{ color: c.text }}>
        {children}
      </Text>
    </View>
  );
}

export default function InvoiceShell({
  docType,
  docId,
  docDate,
  loading,
  notFound,
  toHtml,
  children,
}) {
  const navigation = useNavigation();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!toHtml || exporting) return;
    setExporting(true);
    try {
      const { filePath } = await RNHTMLtoPDF.convert({
        html: toHtml(),
        fileName: `paicart-${docType || 'invoice'}-${docId}`.replace(/\s+/g, '-').toLowerCase(),
        /* A4 at 72dpi. The web sliced its canvas to the same page size. */
        width: 595,
        height: 842,
        padding: 24,
      });
      if (!filePath) throw new Error('No file produced');
      await Share.open({
        url: `file://${filePath}`,
        type: 'application/pdf',
        failOnCancel: false,
      });
    } catch {
      toast.error('Could not create the PDF. Please try again.');
    }
    setExporting(false);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-100">
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} className="p-1">
            <ChevronLeft size={22} color={colors.foreground} />
          </Pressable>
        )}
        <Text className="flex-1 text-md font-bold text-foreground">{docType || 'Invoice'}</Text>
        {!loading && !notFound && !!toHtml && (
          <Pressable
            onPress={handleExport}
            disabled={exporting}
            hitSlop={8}
            className="flex-row items-center gap-1.5 rounded-lg bg-primary px-3 py-2 active:opacity-80"
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Download size={14} color="#ffffff" />
            )}
            <Text className="text-white text-2xs font-bold">PDF</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : notFound ? (
        <EmptyState title="Not found" subtitle="We couldn't find this document." />
      ) : (
        <ScrollView contentContainerClassName="p-4 pb-10">
          <View className="bg-white rounded-2xl p-4 border border-gray-100">
            <View className="flex-row items-start justify-between mb-3">
              <View>
                <Text className="text-lg font-extrabold text-primary">Paicart</Text>
                <Text className="text-2xs text-gray-400">paicart.com</Text>
              </View>
              <View className="items-end">
                <Text className="text-smd font-extrabold text-foreground">#{docId}</Text>
                {!!docDate && <Text className="text-2xs text-gray-400">{docDate}</Text>}
              </View>
            </View>
            <InvoiceDivider />
            {children}
            <InvoiceDivider />
            <Text className="text-2xs text-gray-400 text-center mt-2">support@paicart.com</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
