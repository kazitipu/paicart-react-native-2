import React, { useCallback, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { ImagePlus } from 'lucide-react-native';
import { C, Press, Spinner } from '@/components/product/ui';
import { TS } from '@/components/cart/CartBits';
import { pickImage } from '@/lib/picker';
import { uploadImage } from '@/lib/firebaseUtils';
import { toast } from '@/lib/toast';
import { PAY } from './PaymentSheet';

/* The web's handleImageChange, shared by every sheet: upload immediately on
   pick and keep the Storage URL — submit only ever sends the URL. On the web
   this sat behind a hidden <input type="file"> poked with
   document.getElementById(id).click(); here the camera-or-gallery chooser
   from lib/picker. A cancelled pick is not an error. */
export function useScreenshotUpload() {
  const [imageUrl, setImageUrl] = useState('');
  const [imgLoading, setImgLoading] = useState(false);

  const pick = useCallback(async () => {
    if (imgLoading) return;
    let asset;
    try {
      asset = await pickImage({ title: 'Transaction screenshot' });
    } catch {
      toast.error('Image upload failed.');
      return;
    }
    if (!asset) return;
    setImgLoading(true);
    try {
      setImageUrl(await uploadImage(asset));
    } catch {
      toast.error('Image upload failed.');
    }
    setImgLoading(false);
  }, [imgLoading]);

  const reset = useCallback(() => {
    setImageUrl('');
    setImgLoading(false);
  }, []);

  return { imageUrl, imgLoading, pick, reset };
}

/* "Transaction Screenshot *" label (text-xs font-extrabold gray-500
   uppercase tracking-widest mb-2) over the h-36 dashed drop box. The web's
   hover states (teal-300 border, teal-50/30 fill, "Click to change" veil)
   become press feedback; "Click" reads "Tap" on a phone. */
export default function ScreenshotUpload({ imageUrl, loading, onPick }) {
  return (
    <View>
      <Text style={[TS.xs, { fontWeight: '800', color: C.gray500, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 }]}>
        Transaction Screenshot <Text style={{ color: '#f87171' }}>*</Text>
      </Text>
      <Press
        onPress={onPick}
        disabled={loading}
        accessibilityLabel="Upload transaction screenshot"
        style={({ pressed }) => ({
          width: '100%',
          height: 144,
          borderRadius: 16,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: pressed ? '#5eead4' : C.gray200,
          backgroundColor: pressed ? 'rgba(240,253,250,0.3)' : C.gray50,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        })}
      >
        {({ pressed }) =>
          loading ? (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <Spinner size={26} color={PAY.TEAL500} />
              <Text style={[TS.xs, { color: C.gray400 }]}>Uploading…</Text>
            </View>
          ) : imageUrl ? (
            <>
              <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              {pressed && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={[TS.xs, { color: '#ffffff', fontWeight: '700' }]}>Tap to change</Text>
                </View>
              )}
            </>
          ) : (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: pressed ? '#ccfbf1' : C.gray100,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ImagePlus size={18} color={pressed ? PAY.TEAL500 : C.gray400} />
              </View>
              <Text style={[TS.xs, { color: pressed ? PAY.TEAL_DEEP : C.gray400 }]}>জমার ছবি / স্ক্রিনশট আপলোড করুন</Text>
            </View>
          )
        }
      </Press>
    </View>
  );
}
