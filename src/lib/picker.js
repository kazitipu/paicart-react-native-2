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
