/* ─── Picking images and files ───
 *
 * Every upload in the web app went through a hidden <input type="file">,
 * triggered either by a <label htmlFor> or by
 * `document.getElementById(id).click()`. There are eight such call sites —
 * payment slips, waybills, packing lists, profile pictures, product-request
 * photos, image search. They all reduce to "give me one image", so they share
 * this wrapper rather than each reaching for the picker directly.
 *
 * The returned shape is what `describeUpload` in firebaseUtils expects.
 */
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { Alert } from 'react-native';

const BASE_OPTIONS = {
  mediaType: 'photo',
  selectionLimit: 1,
  /* Payment slips are photographed on phones that shoot 12MP+. Uploading the
     original wastes the customer's data and the admin only ever views it in a
     small preview pane. */
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.8,
};

const firstAsset = (result) => {
  if (!result || result.didCancel) return null;
  if (result.errorCode) {
    throw new Error(result.errorMessage || 'Could not open the picker');
  }
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;
  return {
    uri: asset.uri,
    type: asset.type,
    fileName: asset.fileName,
    fileSize: asset.fileSize,
    width: asset.width,
    height: asset.height,
  };
};

/* Resolves to an asset, or null when the user backs out — a cancellation is
   not an error and must never surface as a toast. */
export const pickImageFromLibrary = async (options = {}) =>
  firstAsset(await launchImageLibrary({ ...BASE_OPTIONS, ...options }));

export const takePhoto = async (options = {}) =>
  firstAsset(await launchCamera({ ...BASE_OPTIONS, ...options }));

/* Camera-or-gallery chooser. The web had no equivalent — a file input on
   mobile browsers delegates this to the OS — so it is presented explicitly. */
export const pickImage = (options = {}) =>
  new Promise((resolve, reject) => {
    Alert.alert(
      options.title || 'Add a photo',
      undefined,
      [
        {
          text: 'Take Photo',
          onPress: () => takePhoto(options).then(resolve, reject),
        },
        {
          text: 'Choose from Library',
          onPress: () => pickImageFromLibrary(options).then(resolve, reject),
        },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });

/* ─── Cropping ───
 *
 * The web shipped a 182-line ImageCropModal: a source <img>, four darkening
 * bands, a rule-of-thirds grid and eight pointer-driven drag handles, all
 * feeding canvas.drawImage + canvas.toDataURL. Every platform here already
 * has a native cropper that people know how to use, so that whole component
 * is replaced by this call rather than reimplemented with PanResponder.
 *
 * Used by the image-search re-crop loop on the Collection screen.
 */
export const cropImage = async (uri, options = {}) => {
  /* Imported lazily: the crop picker pulls in a sizeable native bridge and
     the vast majority of sessions never crop anything. */
  const ImageCropPicker = require('react-native-image-crop-picker').default;
  try {
    const result = await ImageCropPicker.openCropper({
      path: uri,
      mediaType: 'photo',
      freeStyleCropEnabled: true,
      cropperToolbarTitle: 'Crop to search',
      compressImageQuality: 0.9,
      ...options,
    });
    return { uri: result.path, type: result.mime, width: result.width, height: result.height };
  } catch (e) {
    /* The cropper rejects on cancel rather than resolving — not an error. */
    if (String(e?.message || '').toLowerCase().includes('cancel')) return null;
    if (e?.code === 'E_PICKER_CANCELLED') return null;
    throw e;
  }
};
