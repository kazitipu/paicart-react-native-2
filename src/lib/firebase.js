/* ─── Firebase (native) ───
 *
 * Mirrors the web app's src/lib/firebase.js barrel so call sites can import the
 * same names. Two structural differences from the web version:
 *
 *   1. No `initializeApp(firebaseConfig)`. React Native Firebase reads its
 *      config from the native files — android/app/google-services.json and
 *      ios/GoogleService-Info.plist — which are added in Phase 13. The web
 *      app's hardcoded config object carries a `:web:` appId and is not valid
 *      for a native app, so it is deliberately not carried over.
 *
 *   2. `signInWithPopup` does not exist on native. Google sign-in goes through
 *      the native Google Sign-In SDK to obtain an ID token, which is then
 *      exchanged for a Firebase credential. Facebook is dropped entirely: the
 *      web app exported `singInWithFacebook` (sic) but never called it.
 *
 * Session persistence is automatic on native — no AsyncStorage wiring, unlike
 * the JS SDK.
 */
import { getApp } from '@react-native-firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  EmailAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signInAnonymously,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  updatePassword,
  signOut,
} from '@react-native-firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  getCountFromServer,
  Timestamp,
  writeBatch,
  runTransaction,
} from '@react-native-firebase/firestore';
import {
  getStorage,
  ref,
  putFile,
  uploadBytes,
  getDownloadURL,
} from '@react-native-firebase/storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const app = getApp();

export const auth = getAuth(app);
/* Named `firestore`, not `db`, to match every existing call site. */
export const firestore = getFirestore(app);
export const storage = getStorage(app);

/* The *web* OAuth client id — NOT the Android one. Firebase validates the ID
 * token's audience against this, and passing an Android client id fails with a
 * confusing "audience mismatch".
 *
 * It comes straight out of android/app/google-services.json: the entry under
 * `oauth_client` with `client_type: 3`. (Android clients are `client_type: 1`.)
 * The same value appears in the Google Cloud console under
 * APIs & Services -> Credentials as "Web client (auto created by Google
 * Service)".
 *
 * Not a secret — it is a public client identifier that ships inside the app;
 * access is governed by Firebase Security Rules, not by hiding this. */
export const GOOGLE_WEB_CLIENT_ID =
  '702286683439-e2ospds3onqigd71usk46i0de4gcopkl.apps.googleusercontent.com';

/* Call once at startup, before any sign-in attempt. */
export const configureGoogleSignin = (webClientId = GOOGLE_WEB_CLIENT_ID) => {
  GoogleSignin.configure({ webClientId, offlineAccess: false });
};

/* Resolves to a Firebase UserCredential, or null when the user backs out of
   the Google sheet — a cancellation is not an error and must not surface as a
   toast. */
export const signInWithGoogle = async () => {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (response.type !== 'success') return null;
  const idToken = response.data?.idToken;
  if (!idToken) throw new Error('Google sign-in returned no ID token');
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
};

/* Google keeps its own session alongside Firebase's; signing out of only one
   leaves the account silently re-selected on the next attempt. */
export const signOutEverywhere = async () => {
  try {
    await GoogleSignin.signOut();
  } catch {
    /* not signed in with Google — expected for email/OTP users */
  }
  await signOut(auth);
};

export {
  GoogleAuthProvider,
  EmailAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signInAnonymously,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  updatePassword,
  signOut,
};

export {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  getCountFromServer,
  Timestamp,
  writeBatch,
  runTransaction,
};

export { ref, putFile, uploadBytes, getDownloadURL };
