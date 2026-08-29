import React, { useState } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator } from 'react-native';
import { ImagePlus, RefreshCw } from 'lucide-react-native';
import { pickImage } from '@/lib/picker';
import { uploadImage } from '@/lib/firebaseUtils';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

/* The transaction-screenshot field shared by all three payment modals.
 *
 * On the web this was a hidden <input type="file"> poked with
 * `document.getElementById('order-pay-img-upload').click()` — a different
 * hardcoded id per modal, which is why the same markup was duplicated three
 * times. One component, no ids.
 *
 * Uploads immediately on pick and reports the resulting Storage URL, matching
 * the web behaviour where the modal's submit button only ever sent a URL. */
export default function ScreenshotUpload({ value, onChange, label = 'Transaction Screenshot', required = true }) {
  const [loading, setLoading] = useState(false);

  const handlePick = async () => {
    if (loading) return;
    let asset;
    try {
      asset = await pickImage({ title: 'Transaction screenshot' });
    } catch {
      toast.error('Could not open the picker.');
      return;
    }
    if (!asset) return;

    setLoading(true);
    try {
      const url = await uploadImage(asset);
      onChange(url);
    } catch {
      toast.error('Upload failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <View>
      <Text className="text-3xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
        {label} {required && <Text className="text-red-400">*</Text>}
      </Text>
      <Pressable
        onPress={handlePick}
        className="w-full h-36 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden items-center justify-center"
      >
        {loading ? (
          <View className="items-center gap-2">
            <ActivityIndicator color={colors.teal} />
            <Text className="text-tiny text-gray-400">Uploading…</Text>
          </View>
        ) : value ? (
          <>
            <Image source={{ uri: value }} className="w-full h-full" resizeMode="cover" />
            <View className="absolute bottom-2 right-2 flex-row items-center gap-1 bg-black/60 rounded-full px-2.5 py-1">
              <RefreshCw size={11} color="#ffffff" />
              <Text className="text-white text-2xs font-semibold">Replace</Text>
            </View>
          </>
        ) : (
          <View className="items-center gap-2">
            <ImagePlus size={26} color={colors.muted} />
            <Text className="text-tiny text-gray-400">Tap to add a screenshot</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
