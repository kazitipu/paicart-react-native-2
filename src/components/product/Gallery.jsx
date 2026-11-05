import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, Pressable, FlatList, ScrollView, Dimensions, StyleSheet } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { WebView } from 'react-native-webview';
import { Play } from 'lucide-react-native';
import ProductImage from '@/components/ui/ProductImage';
import { t, C, ORANGE2, SHADOW } from './ui';

const { width: SCREEN_W } = Dimensions.get('window');
export const GALLERY_W = SCREEN_W - 16; // px-2 page gutter
const INNER = GALLERY_W - 2; // 1px border

const videoHtml = (url) => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer">
<style>html,body{margin:0;height:100%;background:#000}video{width:100%;height:100%;object-fit:contain;background:#000}</style></head>
<body><video src="${String(url).replace(/"/g, '&quot;')}" controls autoplay muted playsinline loop></video></body></html>`;

function VideoSlide({ item, active }) {
  if (active) {
    return (
      <View style={{ width: INNER, height: INNER, backgroundColor: '#000' }}>
        <WebView
          originWhitelist={['*']}
          source={{ html: videoHtml(item.url) }}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          allowsFullscreenVideo
          scrollEnabled={false}
          style={{ backgroundColor: '#000' }}
        />
      </View>
    );
  }
  return (
    <View style={{ width: INNER, height: INNER, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
      {!!item.thumb && <ProductImage uri={item.thumb} resizeMode="contain" style={[StyleSheet.absoluteFill, { opacity: 0.6 }]} />}
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
        <Play size={18} color={C.gray900} fill={C.gray900} style={{ marginLeft: 2 }} />
      </View>
    </View>
  );
}

function Dot({ active, video, onPress }) {
  const style = useAnimatedStyle(() => ({ width: withTiming(active ? 16 : 6, { duration: 200 }) }));
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Animated.View
        style={[
          { height: 6, borderRadius: 3, backgroundColor: active ? '#ffffff' : video ? 'rgba(253,186,116,0.7)' : 'rgba(255,255,255,0.5)' },
          style,
        ]}
      />
    </Pressable>
  );
}

function Thumb({ item, active, onPress }) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withTiming(active ? 1.05 : 1, { duration: 150 }) }],
    opacity: withTiming(active ? 1 : 0.7, { duration: 150 }),
  }));
  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={[
          {
            width: 50,
            height: 50,
            borderRadius: 12,
            boxShadow: active ? `0 0 0 2px #ffffff, 0 0 0 4px ${ORANGE2}, ${SHADOW.lg}` : `0 0 0 1px ${C.gray200}`,
          },
          style,
        ]}
      >
        {item.type === 'video' ? (
          <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: C.gray900, alignItems: 'center', justifyContent: 'center' }}>
            {item.thumb ? (
              <ProductImage uri={item.thumb} thumb style={[StyleSheet.absoluteFill, { opacity: 0.6 }]} fallbackIconSize={12} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: C.gray800 }]} />
            )}
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', boxShadow: SHADOW.base }}>
              <Play size={8} color={C.gray900} fill={C.gray900} style={{ marginLeft: 1 }} />
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}>
            <ProductImage uri={item.url} thumb style={{ width: '100%', height: '100%' }} fallbackIconSize={12} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

/* ════════ COL 1 — main image + thumbnails ════════
   The web's hover-only prev/next arrows become a swipeable pager. A colour
   whose image is not in the gallery shows on top of it until the next swipe
   or thumbnail tap (web `colorOverrideImg`). */
export default function Gallery({ allMedia, pics, activeImg, onSelect, colorOverrideImg, onUserSwipe, isDirectFactory, imgRef }) {
  const listRef = useRef(null);
  const data = allMedia.length ? allMedia : [{ type: 'image', url: pics[0] || null }];
  const current = data[activeImg] || data[0];

  /* Thumbnail / colour selection moves the pager. */
  useEffect(() => {
    if (activeImg >= 0 && activeImg < data.length) {
      listRef.current?.scrollToOffset({ offset: activeImg * INNER, animated: true });
    }
  }, [activeImg, data.length]);

  const renderItem = useCallback(
    ({ item, index }) =>
      item.type === 'video' ? (
        <VideoSlide item={item} active={index === activeImg} />
      ) : (
        <View style={{ width: INNER, height: INNER, padding: 12, backgroundColor: '#ffffff' }}>
          <ProductImage uri={item.url} resizeMode="contain" style={{ width: '100%', height: '100%' }} fallbackIconSize={40} />
        </View>
      ),
    [activeImg],
  );

  return (
    <View style={{ gap: 12 }}>
      {/* Main image */}
      <View
        ref={imgRef}
        collapsable={false}
        style={{
          width: GALLERY_W,
          height: GALLERY_W,
          backgroundColor: '#ffffff',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: C.gray100,
          boxShadow: SHADOW.md,
        }}
      >
        <View style={{ flex: 1, borderRadius: 23, overflow: 'hidden' }}>
          <FlatList
            ref={listRef}
            data={data}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => `media-${i}`}
            getItemLayout={(_, i) => ({ length: INNER, offset: INNER * i, index: i })}
            initialNumToRender={2}
            windowSize={3}
            extraData={activeImg}
            onScrollBeginDrag={onUserSwipe}
            onMomentumScrollEnd={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / INNER);
              if (i !== activeImg) onSelect(i);
            }}
            renderItem={renderItem}
          />

          {!!colorOverrideImg && current?.type !== 'video' && (
            <Animated.View
              key={colorOverrideImg}
              entering={FadeIn.duration(200)}
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff', padding: 12 }]}
            >
              <ProductImage uri={colorOverrideImg} resizeMode="contain" style={{ width: '100%', height: '100%' }} fallbackIconSize={40} />
            </Animated.View>
          )}

          {/* from-black/8 to-transparent, h-10 */}
          <Svg pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40 }}>
            <Defs>
              <LinearGradient id="galleryTop" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000" stopOpacity="0.08" />
                <Stop offset="1" stopColor="#000" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#galleryTop)" />
          </Svg>

          {isDirectFactory && (
            <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: '#00B42A', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, boxShadow: SHADOW.base }}>
              <Text style={[t('9'), { color: '#ffffff', fontWeight: '700' }]}>Factory</Text>
            </View>
          )}

          {allMedia.length > 1 && (
            <View style={{ position: 'absolute', bottom: 8, right: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={[t('10'), { color: '#ffffff', fontWeight: '500' }]}>
                {activeImg + 1}/{allMedia.length}
              </Text>
            </View>
          )}

          {allMedia.length > 1 && allMedia.length <= 8 && (
            <View style={{ position: 'absolute', bottom: 10, left: 0, right: 0, alignItems: 'center' }} pointerEvents="box-none">
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {allMedia.map((item, i) => (
                  <Dot key={i} active={i === activeImg} video={item.type === 'video'} onPress={() => onSelect(i, true)} />
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Thumbnails */}
      {allMedia.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4, paddingVertical: 8, gap: 8 }}>
          {allMedia.slice(0, 12).map((item, i) => (
            <Thumb key={i} item={item} active={i === activeImg} onPress={() => onSelect(i, true)} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}
