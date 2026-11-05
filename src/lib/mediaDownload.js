/* ─── Saving product media ───
 *
 * The web page fetched each file into a blob and clicked an <a download>. Here
 * the file is downloaded straight to the app cache (react-native-blob-util,
 * no Referer — 1688's CDN refuses hotlinks) and then written into the phone's
 * gallery under a "Paicart" album (camera-roll). One tap, no share sheet.
 * Resolves true once saved; throws on a failed download or a denied
 * permission, so callers can show an error.
 */
import { Platform, PermissionsAndroid } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

const MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

export const extOf = (url, fallback = 'jpg') => {
  const e = String(url || '').split(/[?#]/)[0].split('.').pop().slice(0, 4).toLowerCase();
  return MIME[e] ? e : fallback;
};

export const safeName = (label, fallback = 'image') =>
  String(label || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || fallback;

const ALBUM = 'Paicart';

/* Android 10+ saves through MediaStore without any permission; API 24–28
   still need WRITE_EXTERNAL_STORAGE. iOS prompts for add-only access itself
   (NSPhotoLibraryAddUsageDescription). */
async function ensureWritePermission() {
  if (Platform.OS !== 'android' || Platform.Version >= 29) return;
  const perm = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
  if (await PermissionsAndroid.check(perm)) return;
  const res = await PermissionsAndroid.request(perm);
  if (res !== PermissionsAndroid.RESULTS.GRANTED) throw new Error('permission denied');
}

export async function saveRemoteFile(url, filename, ext) {
  await ensureWritePermission();
  const isVideo = (MIME[ext] || '').startsWith('video/');
  /* Downloaded under its final name — the gallery keeps the cache file's
     name, which was "ReactNativeBlobUtilTmp_<uuid>" with fileCache. A clash
     with an earlier save is renamed "name (1).jpg" by MediaStore. */
  const path = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${filename || `paicart-${Date.now()}.${ext}`}`;
  const res = await ReactNativeBlobUtil.config({ path }).fetch('GET', url);
  try {
    const status = res.info().status;
    if (status < 200 || status >= 300) throw new Error(`fetch failed (${status})`);
    await CameraRoll.saveAsset(Platform.OS === 'android' ? `file://${path}` : path, {
      type: isVideo ? 'video' : 'photo',
      album: ALBUM,
    });
    return true;
  } finally {
    /* The gallery keeps its own copy; drop the cache file either way. */
    res.flush().catch(() => {});
  }
}
