/* ─── Image helpers for the image-search flow ───
 *
 * Replaces the web module, which was built on <canvas>: it loaded the picture
 * into `new Image()`, drew it into a canvas and read it back with
 * `canvas.toDataURL('image/jpeg', q)`. None of that exists in React Native, so
 * the resize is done by the native resizer and the base64 read by a blob.
 *
 * One deliberate change from the web version: an instance's `preview` is a
 * local file URI rather than a full data URL. The web kept the entire base64
 * payload in localStorage for every crop in the session; doing that in MMKV
 * would mean megabytes of duplicated image data on the device for a thumbnail
 * strip that the OS can render straight from disk.
 */
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { getJSON, setJSON, KEYS } from './storage';

/* Reads a local file as bare base64 — no `data:` prefix, which is the shape
   alg.com.bd's upload-image endpoint expects (the web app did
   `.split(',')[1]` for the same reason). */
export const fileToBase64 = (uri) =>
  new Promise((resolve, reject) => {
    fetch(uri)
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read image'));
        reader.onload = () => {
          const result = String(reader.result || '');
          const comma = result.indexOf(',');
          resolve(comma === -1 ? result : result.slice(comma + 1));
        };
        reader.readAsDataURL(blob);
      })
      .catch(reject);
  });

/* Mirrors the web `resizeAndCompressImage` / `resizeAndCompressDataUrl` pair —
   both downscaled to fit 500×500 preserving aspect ratio, then JPEG at q0.7.
   `mode: 'contain'` reproduces the web's fit-within behaviour, and
   `onlyScaleDown` stops a small image being blown up (the web maths only ever
   shrank, so this keeps parity). */
export const resizeAndCompressToBase64 = async (
  uri,
  maxWidth = 500,
  maxHeight = 500,
  quality = 0.7,
) => {
  const resized = await ImageResizer.createResizedImage(
    uri,
    maxWidth,
    maxHeight,
    'JPEG',
    Math.round(quality * 100),
    0,
    null,
    false,
    { mode: 'contain', onlyScaleDown: true },
  );
  const base64 = await fileToBase64(resized.uri);
  return { base64, uri: resized.uri };
};

/* ─── Image-search instance history ───
   Every image search — a fresh pick, or a crop of an earlier instance —
   produces one instance: { id, preview }. `id` is the server-assigned image id
   used as the `imageUrl` route param; `preview` is a local URI for the
   thumbnail strip. Keeping the whole session's history lets the strip show the
   original *and* every crop made from it, and lets the user jump back to any
   of them. */

export const getImageSearchInstances = () => {
  const parsed = getJSON(KEYS.IMAGE_SEARCH_INSTANCES, []);
  return Array.isArray(parsed) ? parsed : [];
};

/* A brand new pick — resets the history to just this original. */
export const startImageSearchInstances = (id, preview) => {
  const instances = [{ id, preview }];
  setJSON(KEYS.IMAGE_SEARCH_INSTANCES, instances);
  return instances;
};

/* A confirmed crop — appended without disturbing the original or earlier
   crops. */
export const appendImageSearchInstance = (id, preview) => {
  const instances = [...getImageSearchInstances(), { id, preview }];
  setJSON(KEYS.IMAGE_SEARCH_INSTANCES, instances);
  return instances;
};
