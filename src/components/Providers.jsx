import React, { useEffect, useRef } from 'react';
import { Provider, useDispatch } from 'react-redux';
import store from '@/store';
import { auth, firestore, onAuthStateChanged, doc, onSnapshot } from '@/lib/firebase';
import { createUserProfileDocument } from '@/lib/firebaseUtils';
import {
  setCurrentUser,
  setReduxCart,
  setReduxWishlist,
  getCurrencyRedux,
  getSiteDiscountRedux,
  getAllCampaignsRedux,
} from '@/store/actions';

/* The signed-out / admin-account shape, matching userSlice's initial state. */
const EMPTY_USER = { displayName: '', email: '' };

function AuthListener() {
  const dispatch = useDispatch();
  /* Holds the three Firestore unsubscribes across auth-state changes.
     See the note in the effect below. */
  const listenersRef = useRef([]);

  useEffect(() => {
    /* Fired unconditionally, before auth resolves — the FX rate, the site-wide
       discount and the campaign list are needed to price anything at all, and
       none of them depend on who is signed in. */
    dispatch(getCurrencyRedux());
    dispatch(getSiteDiscountRedux());
    dispatch(getAllCampaignsRedux());

    const detachSnapshots = () => {
      listenersRef.current.forEach((off) => {
        try {
          off();
        } catch {
          /* already torn down */
        }
      });
      listenersRef.current = [];
    };

    const signedOut = () => {
      dispatch(setCurrentUser(EMPTY_USER));
      dispatch(setReduxCart([]));
      dispatch(setReduxWishlist([]));
    };

    const unsubscribeFromAuth = onAuthStateChanged(auth, async (userAuth) => {
      /* ⚠️ The web version returned its cleanup closure from *this* callback.
         Firebase discards that return value, so the three snapshot listeners
         below were never torn down and a fresh trio stacked up on every
         auth-state change. Page reloads hid it on the web; a mobile app lives
         long enough for the reads to add up. Detach explicitly instead. */
      detachSnapshots();

      if (!userAuth) {
        signedOut();
        return;
      }

      /* Returns undefined for anonymous sessions and for accounts that are
         admins — both are treated as "not a customer" here. */
      const userRef = await createUserProfileDocument(userAuth);
      if (!userRef) {
        signedOut();
        return;
      }

      const unsubscribeUser = onSnapshot(userRef, (snapShot) => {
        dispatch(setCurrentUser({ id: snapShot.id, ...snapShot.data() }));
      });

      const cartRef = doc(firestore, 'carts', userAuth.uid);
      const unsubscribeCart = onSnapshot(cartRef, (snapShot) => {
        if (snapShot.exists()) {
          dispatch(setReduxCart(snapShot.data().cart));
        }
      });

      const wishlistRef = doc(firestore, 'wishlists', userAuth.uid);
      const unsubscribeWishlist = onSnapshot(wishlistRef, (snapShot) => {
        if (snapShot.exists()) {
          dispatch(setReduxWishlist(snapShot.data().wishlist));
        }
      });

      listenersRef.current = [unsubscribeUser, unsubscribeCart, unsubscribeWishlist];
    });

    return () => {
      detachSnapshots();
      unsubscribeFromAuth();
    };
  }, [dispatch]);

  return null;
}

export default function Providers({ children }) {
  return (
    <Provider store={store}>
      <AuthListener />
      {children}
    </Provider>
  );
}
