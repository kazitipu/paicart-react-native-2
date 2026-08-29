import React, { useState } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator } from 'react-native';
import { Upload, RefreshCw } from 'lucide-react-native';
import { pickImage } from '@/lib/picker';
import { toast } from '@/lib/toast';
import colors from '@/theme/colors';

/* One upload field. `upload` receives the picked asset and returns a URL —
   which lets the caller choose between uploadImage (payments/) and
   uploadShipForMeFile (a named folder), as the web form did per field. */
export default function FileField({ label, value, onChange, upload, required = false }) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (loading) return;
    let asset;
    try {
      asset = await pickImage({ title: label });
    } catch {
      toast.error('Could not open the picker.');
      return;
    }
    if (!asset) return;
    setLoading(true);
    try {
      onChange(await upload(asset));
    } catch {
      toast.error(`Could not upload the ${label.toLowerCase()}.`);
    }
    setLoading(false);
  };

  return (
    <View>
      <Text className="text-2xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">
        {label} {required && <Text className="text-brand">*</Text>}
      </Text>
      <Pressable
        onPress={handle}
        className="h-28 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden items-center justify-center"
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : value ? (
          <>
            <Image source={{ uri: value }} className="w-full h-full" resizeMode="cover" />
            <View className="absolute bottom-1.5 right-1.5 flex-row items-center gap-1 bg-black/60 rounded-full px-2 py-1">
              <RefreshCw size={10} color="#ffffff" />
              <Text className="text-white text-xxs font-semibold">Replace</Text>
            </View>
          </>
        ) : (
          <View className="items-center gap-1.5">
            <Upload size={20} color={colors.muted} />
            <Text className="text-2xs text-gray-400">Tap to upload</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
