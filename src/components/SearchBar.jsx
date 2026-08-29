import React, { useState, useCallback } from 'react';
import { View, TextInput, Pressable, ActivityIndicator, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Search, Camera, Sparkles } from 'lucide-react-native';
import { emptySearchedProductsArray } from '@/store/actions';
import { pickImage } from '@/lib/picker';
import { resizeAndCompressToBase64, startImageSearchInstances } from '@/lib/imageUtils';
import { uploadSearchImage } from '@/lib/api';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

/* Extracts a 1688 offer id from a pasted product URL. Two shapes are in the
   wild: `?offerId=123` and `/123.html`. */
export function get1688ProductId(url) {
  try {
    const offerId = /[?&]offerId=(\d+)/.exec(url)?.[1];
    if (offerId) return offerId;
    const path = /\/(\d+)\.html/.exec(url)?.[1];
    if (path) return path;
    const idParam = /[?&]id=(\d+)/.exec(url)?.[1];
    return idParam || null;
  } catch {
    return null;
  }
}

/* The web Header's search row, minus the chrome that does not apply here — the
   typewriter placeholder wrote directly to a DOM node to avoid re-rendering 15
   icons per keystroke, and the scroll-hide behaviour set dataset attributes on
   the header element. Neither has a native analogue worth reproducing. */
export default function SearchBar({ initialValue = '' }) {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [q, setQ] = useState(initialValue);
  const [uploading, setUploading] = useState(false);

  const submit = useCallback(() => {
    const query = q.trim();
    if (!query) return;
    dispatch(emptySearchedProductsArray());

    /* Short strings are keywords. Anything longer is treated as a pasted URL —
       the same 35-character cut-off the web used. */
    if (query.length < 35) {
      navigation.navigate('Collection', { id: query });
    } else {
      const id = get1688ProductId(query);
      if (id) navigation.navigate('Product', { id });
      else navigation.navigate('Collection', { id: query });
    }
    setQ('');
  }, [q, dispatch, navigation]);

  const imageSearch = useCallback(async () => {
    if (uploading) return;
    let asset;
    try {
      asset = await pickImage({ title: 'Search by image' });
    } catch {
      toast.error('Could not open the picker.');
      return;
    }
    if (!asset) return;

    setUploading(true);
    try {
      /* Downscale to 500x500 JPEG q0.7 before upload — the same budget the web
         used, and on a phone the original is often 12MP. */
      const { base64, uri } = await resizeAndCompressToBase64(asset.uri);
      const imgId = await uploadSearchImage(base64);
      if (!imgId) throw new Error('No image id returned');
      /* A fresh pick resets the crop history; later crops append to it. */
      startImageSearchInstances(imgId, uri);
      dispatch(emptySearchedProductsArray());
      navigation.navigate('Collection', { id: 'img_uploads', imageUrl: imgId });
    } catch {
      toast.error('There was an error uploading your image.');
    }
    setUploading(false);
  }, [uploading, dispatch, navigation]);

  return (
    <View className="px-3 py-2.5 bg-white border-b border-gray-100">
      <View className="flex-row items-center rounded-full bg-primary p-[2.5px]">
        <View className="flex-1 flex-row items-center bg-white rounded-full pl-2 pr-1 py-1">
          <View className="flex-row items-center gap-0.5 bg-primary-tint rounded-full px-2 py-1 mr-1.5">
            <Sparkles size={11} color={colors.primary} />
            <Text className="text-xxs font-extrabold text-primary">AI</Text>
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={submit}
            returnKeyType="search"
            placeholder="Search products from China"
            placeholderTextColor="#9ca3af"
            className="flex-1 text-smd text-foreground py-1"
          />
          <Pressable onPress={imageSearch} hitSlop={6} className="px-2">
            {uploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Camera size={18} color={colors.primary} />
            )}
          </Pressable>
          <Pressable
            onPress={submit}
            className="bg-primary rounded-full w-9 h-9 items-center justify-center"
          >
            <Search size={16} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
