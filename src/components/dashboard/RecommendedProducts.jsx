import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import ProductImage from '@/components/ui/ProductImage';
import { Press } from '@/components/product/ui';
import { alg } from '@/lib/api';
import { SectionHeading, D, enIN } from './ui';

/* Recommended Products (web page.jsx "Recommended Products"): up to 8 items
   from the catalogue search for the latest order's product type (or a
   popular category). Every card is the same height — fixed image, title
   clamped to 2 lines in a fixed-height box, price row and "View Product"
   at the bottom — so the row lines up whatever the 1688 title length. */

const CARD_W = 158;
const IMG_H = 140;
const TITLE_LH = 15;

function SkeletonCard() {
  return (
    <View style={{ width: CARD_W, height: IMG_H + 2 * TITLE_LH + 86, borderRadius: 16, backgroundColor: '#eef0f3' }} />
  );
}

const ProductCard = React.memo(function ProductCard({ p, taka, onOpen }) {
  const price = taka && p.salePrice ? Math.round(parseFloat(p.salePrice) * parseFloat(taka)) : null;
  const sold = parseInt(p.totalSold, 10) || 0;
  return (
    <Press
      onPress={() => onOpen(p)}
      style={({ pressed }) => ({
        width: CARD_W, overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: D.panelBorder,
        backgroundColor: '#ffffff', boxShadow: D.shadow, opacity: pressed ? 0.92 : 1,
      })}
    >
      <View style={{ height: IMG_H, backgroundColor: '#f6f7f9' }}>
        <ProductImage uri={p.pictures?.[0]} thumb style={{ width: '100%', height: '100%' }} />
      </View>
      <View style={{ padding: 10 }}>
        <Text numberOfLines={2} style={{ height: 2 * TITLE_LH, fontSize: 11, lineHeight: TITLE_LH, fontWeight: '700', color: '#333b45' }}>
          {p.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5, marginTop: 8, height: 18 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: D.brandDark, flexShrink: 1 }} numberOfLines={1}>
            {price != null ? `৳ ${enIN(price)}` : `¥ ${p.salePrice ?? '—'}`}
          </Text>
          {sold > 0 ? <Text style={{ fontSize: 9.5, color: D.muted }} numberOfLines={1}>{sold.toLocaleString()} sold</Text> : null}
        </View>
        <View style={{ marginTop: 9, paddingVertical: 7, borderRadius: 9, backgroundColor: '#fff2e8', alignItems: 'center' }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#d95e08' }}>View Product</Text>
        </View>
      </View>
    </Press>
  );
});

export default function RecommendedProducts({ keyword, taka, onOpenProduct, onViewAll, onBrowse }) {
  /* keyed by the keyword it was fetched for, so a new keyword shows the
     loading state again */
  const [state, setState] = useState({ keyword: null, list: [] });

  useEffect(() => {
    let alive = true;
    alg
      .get('/products/search', { params: { keyword, framePosition: 1, filterByCategory: 'Default' }, timeout: 12000 })
      .then((res) => {
        if (alive) setState({ keyword, list: (res.data?.products || []).slice(0, 8) });
      })
      .catch(() => {
        if (alive) setState({ keyword, list: [] });
      });
    return () => {
      alive = false;
    };
  }, [keyword]);

  const products = state.keyword === keyword ? state.list : null;

  return (
    <View>
      <SectionHeading
        title="Recommended Products"
        right={
          <Press onPress={onViewAll} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingVertical: 4 })}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: D.brandDark }}>View all ›</Text>
          </Press>
        }
      />
      {products && products.length === 0 ? (
        <View style={{ padding: 18, borderRadius: 18, borderWidth: 1, borderColor: '#e9edf1', backgroundColor: '#fff', alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: D.muted }}>
            No recommendations right now.{' '}
            <Text onPress={onBrowse} style={{ color: D.brand, fontWeight: '700' }}>Browse products →</Text>
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginHorizontal: -2 }}
          contentContainerStyle={{ gap: 10, paddingHorizontal: 2, paddingBottom: 7, alignItems: 'stretch' }}
        >
          {products === null
            ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
            : products.map((p) => <ProductCard key={p.id} p={p} taka={taka} onOpen={onOpenProduct} />)}
        </ScrollView>
      )}
    </View>
  );
}
