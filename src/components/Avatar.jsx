import React, { useState } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator } from 'react-native';
import { Camera } from 'lucide-react-native';
import { toast } from '@/lib/toast';
import { uploadShipForMeFile, updateUser } from '@/lib/firebaseUtils';
import { pickImage } from '@/lib/picker';
import colors from '@/theme/colors';

/* The user's photoURL if set, otherwise a circle with their initial. Pass
   `editable` to turn it into a tap-to-upload control — used on the dashboard
   banner and the profile page.
 *
 * The Tailwind-class prop API (sizeClass / textClass / ringClass / …) is kept
 * from the web version: NativeWind understands the same class strings, so
 * every existing call site's sizing carries over unchanged. */
export default function Avatar({
  user,
  editable = false,
  sizeClass = 'w-14 h-14',
  textClass = 'text-2xl',
  ringClass = 'border-2 border-white/30',
  bgClass = 'bg-white/20',
  roundedClass = 'rounded-2xl',
}) {
  const [uploading, setUploading] = useState(false);
  const initial = user?.displayName?.[0]?.toUpperCase() || 'U';

  const handlePick = async () => {
    if (!user?.id || uploading) return;
    let asset;
    try {
      asset = await pickImage({ title: 'Profile picture' });
    } catch {
      toast.error('Could not open the picker.');
      return;
    }
    if (!asset) return; /* cancelled */

    setUploading(true);
    try {
      const photoURL = await uploadShipForMeFile(asset, 'profilePictures');
      await updateUser({ ...user, photoURL });
      toast.success('Profile picture updated!');
    } catch {
      toast.error('Failed to upload picture. Try again.');
    }
    setUploading(false);
  };

  return (
    <View className={`relative ${sizeClass}`}>
      <View
        className={`${sizeClass} ${roundedClass} ${bgClass} ${ringClass} items-center justify-center overflow-hidden`}
      >
        {uploading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : user?.photoURL ? (
          <Image
            /* Profile pictures live in Firebase Storage, not on the 1688 CDN,
               so they need no Referer header — but they are still remote. */
            source={{ uri: user.photoURL }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <Text className={`${textClass} font-extrabold text-white`}>{initial}</Text>
        )}
      </View>

      {editable && !uploading && (
        <Pressable
          onPress={handlePick}
          hitSlop={8}
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-gray-100 items-center justify-center"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
        >
          <Camera size={11} color={colors.foreground} />
        </Pressable>
      )}
    </View>
  );
}
