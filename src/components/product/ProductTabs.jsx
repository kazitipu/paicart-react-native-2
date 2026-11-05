import React, { memo } from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import ProductImage from '@/components/ui/ProductImage';
import AutoHeightWebView from './AutoHeightWebView';
import { Press as Pressable, Stars, t, C, ORANGE, ORANGE2, SHADOW } from './ui';

const Empty = ({ children }) => (
  <Text style={[t('xs'), { color: C.gray400, textAlign: 'center', paddingVertical: 32 }]}>{children}</Text>
);

function SpecRow({ index, name, children }) {
  return (
    <View style={{ flexDirection: 'row', borderRadius: 8, backgroundColor: index % 2 === 0 ? C.gray50 : '#ffffff' }}>
      <View style={{ width: '33.333%', paddingHorizontal: 12, paddingVertical: 8 }}>{name}</View>
      <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' }}>{children}</View>
    </View>
  );
}

function Specs({ specs, variantSpecs }) {
  if (!specs.length && !variantSpecs.length) return <Empty>No specifications available.</Empty>;
  return (
    <View>
      {specs.map((spec, i) => (
        <SpecRow key={`s-${i}`} index={i} name={<Text style={[t('xs'), { fontWeight: '600', color: C.gray600 }]}>{spec.name}</Text>}>
          <Text style={[t('xs'), { color: C.gray800 }]}>{spec.value}</Text>
        </SpecRow>
      ))}
      {/* Variant dimensions, appended below the seller's own specs */}
      {variantSpecs.map((g, i) => (
        <SpecRow
          key={`variant-${g.dim}`}
          index={specs.length + i}
          name={
            <Text style={[t('xs'), { fontWeight: '600', color: C.gray600 }]}>
              {g.name}
              <Text style={{ fontWeight: '400', color: C.gray400 }}> ({g.values.length})</Text>
            </Text>
          }
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {g.values.map((v) => (
              <View key={v} style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: '#ffffff', borderWidth: 1, borderColor: C.gray200 }}>
                <Text style={[t('11'), { color: C.gray700 }]}>{v}</Text>
              </View>
            ))}
          </View>
        </SpecRow>
      ))}
    </View>
  );
}

function Reviews({ feedback }) {
  if (!feedback?.length) return <Empty>No reviews yet for this product.</Empty>;
  return (
    <View style={{ gap: 16 }}>
      {feedback.map((fb, i) => {
        const last = i === feedback.length - 1;
        return (
          <View key={i} style={{ borderBottomWidth: last ? 0 : 1, borderBottomColor: C.gray100, paddingBottom: last ? 0 : 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={[t('xs'), { color: '#ffffff', fontWeight: '700' }]}>{(fb.displayName || 'U')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                  <Text style={[t('xs'), { fontWeight: '600', color: C.gray800 }]}>{fb.displayName || 'Anonymous'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Stars rating={fb.rating || 0} size={10} />
                    <Text style={[t('10'), { color: C.gray400 }]}>{fb.date || ''}</Text>
                  </View>
                </View>
                <Text style={[t('xs', 'relaxed'), { color: C.gray600, marginTop: 4 }]}>{fb.content}</Text>
                {(fb.info?.Color || fb.info?.Size || fb.info?.Logistics) && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                    {[fb.info.Color && `Color: ${fb.info.Color}`, fb.info.Size && `Size: ${fb.info.Size}`, fb.info.Logistics]
                      .filter(Boolean)
                      .map((label) => (
                        <View key={label} style={{ backgroundColor: C.gray100, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={[t('10'), { color: C.gray600 }]}>{label}</Text>
                        </View>
                      ))}
                  </View>
                )}
                {fb.photos?.length > 0 && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {fb.photos.map((ph, j) => (
                      <ProductImage
                        key={j}
                        uri={ph}
                        style={{ width: 56, height: 56, borderRadius: 8, borderWidth: 1, borderColor: C.gray200 }}
                        fallbackIconSize={14}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/* ════════ Specs / Overview / Reviews ════════ */
function ProductTabs({ product, variantSpecs, descHtml, activeTab, setActiveTab }) {
  const tabs = [
    { id: 'specs', label: 'Specifications' },
    { id: 'overview', label: 'Overview' },
    { id: 'reviews', label: `Reviews (${product.feedback?.length || 0})` },
  ];
  return (
    <View
      style={{
        marginTop: 16,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.gray100,
        boxShadow: SHADOW.sm,
        overflow: 'hidden',
        paddingBottom: 24,
      }}
    >
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.gray100 }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                alignItems: 'center',
                borderBottomWidth: 2,
                borderBottomColor: active ? ORANGE2 : 'transparent',
                backgroundColor: active ? 'rgba(255,247,237,0.4)' : pressed ? C.gray50 : 'transparent',
              })}
            >
              <Text style={[t('xs'), { fontWeight: '600', color: active ? ORANGE2 : C.gray500 }]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Animated.View key={activeTab} entering={FadeIn.duration(200)} style={{ padding: 16 }}>
        {activeTab === 'specs' && <Specs specs={product.specs || []} variantSpecs={variantSpecs} />}
        {activeTab === 'overview' && (descHtml ? <AutoHeightWebView html={descHtml} /> : <Empty>No overview available.</Empty>)}
        {activeTab === 'reviews' && <Reviews feedback={product.feedback} />}
      </Animated.View>
    </View>
  );
}

export default memo(ProductTabs);
