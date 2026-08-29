import React, { useState } from 'react';
import { View, Image } from 'react-native';
import { ImageOff } from 'lucide-react-native';
import { imageSource, thumbSource } from '@/lib/cdn';
import colors from '@/theme/colors';

/* ⚠️ Every remote product image must go through this component.
 *
 * 1688 blocks hotlinked images. The web app defeated that with
 * referrerPolicy="no-referrer" on ~59 <img> tags across 26 files; React
 * Native's <Image> has no such prop, so an empty Referer header is the
 * equivalent (see lib/cdn.js). A plain <Image source={{uri}}> anywhere in this
 * app will 403 and render blank — which looks like a data bug, not an image
 * one, and is expensive to chase down. Funnelling every call site through here
 * is what stops that reappearing.
 *
 * `thumb` opts into the CDN's _200x200.webp resize, for grids.
 */
export default function ProductImage({
  uri,
  thumb = false,
  className = '',
  style,
  resizeMode = 'cover',
  fallbackIconSize = 20,
}) {
  const [failed, setFailed] = useState(false);
  const source = thumb ? thumbSource(uri) : imageSource(uri);

  if (!source || failed) {
    return (
      <View className={`bg-gray-100 items-center justify-center ${className}`} style={style}>
        <ImageOff size={fallbackIconSize} color={colors.muted} />
      </View>
    );
  }

  return (
    <Image
      source={source}
      className={className}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFailed(true)}
    />
  );
}
