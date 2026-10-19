import {
  auth,
  firestore,
  storage,
  signInAnonymously,
} from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  getCountFromServer,
} from '@react-native-firebase/firestore';
import { ref, putFile, getDownloadURL } from '@react-native-firebase/storage';
import { toast } from './toast';

// Helper
const getCartTotal = (cartItems) => {
  let total = 0;
  for (let i = 0; i < cartItems.length; i++) {
    total += parseInt(cartItems[i].sum, 10);
  }
  return total;
};

/* Normalises whatever the picker/document layer hands us into the three
   things Storage needs. react-native-image-picker returns { uri, type,
   fileName }; image-crop-picker returns { path, mime }; a plain string uri is
   also accepted. */
const describeUpload = (file) => {
  if (!file) throw new Error('No file to upload');
  if (typeof file === 'string') return { uri: file, ext: extOf(file), contentType: undefined };
  const uri = file.uri || file.path;
  if (!uri) throw new Error('File has no uri');
  const contentType = file.type || file.mime || undefined;
  const name = file.fileName || file.name || '';
  return { uri, ext: extOf(name) || extOf(uri) || extFromMime(contentType), contentType };
};

const extOf = (s) => {
  const m = /\.([a-zA-Z0-9]{1,5})(?:\?|$)/.exec(String(s || ''));
  return m ? `.${m[1].toLowerCase()}` : '';
};

const extFromMime = (m) => {
  if (!m) return '';
  const sub = String(m).split('/')[1];
  if (!sub) return '';
  return `.${sub === 'jpeg' ? 'jpg' : sub}`;
};

const GenerateUniqueID = () => {
  return ('0000' + (Math.random() * (100000 - 101) + 101)).slice(-5);
};

export const getMonthName = () => {
  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  const d = new Date();
  return `${monthNames[d.getMonth()]},${d.getFullYear()}`;
};

const incrementUserCountByOne = async () => {
  const countRef = doc(firestore, 'userCount', 'count');
  const snapShot = await getDoc(countRef);
  if (!snapShot.exists()) {
    try {
      await setDoc(countRef, { userCount: 1 });
    } catch (error) {
      console.error(error);
    }
  } else {
    try {
      await updateDoc(countRef, { userCount: snapShot.data().userCount + 1 });
    } catch (error) {
      console.error(error);
    }
  }
  const updatedSnapShot = await getDoc(countRef);
  return updatedSnapShot.data().userCount;
};

export const createUserProfileDocument = async (userAuth, additionalData) => {
  if (!userAuth) return;
  if (userAuth && userAuth.isAnonymous) return;
  const userRef = doc(firestore, 'users', userAuth.uid);
  const adminRef = doc(firestore, 'admins', userAuth.uid);
  const adminSnapShot = await getDoc(adminRef);
  if (adminSnapShot.exists()) return;

  const snapShot = await getDoc(userRef);
  if (!snapShot.exists()) {
    const { email, displayName } = userAuth;
    const createdAt = new Date();
    try {
      const userCount = await incrementUserCountByOne();
      const usersCollectionRef = collection(firestore, 'users');
      const usersQuery = query(usersCollectionRef, where('userId', '==', `${userCount}`));
      const usersSnap = await getDocs(usersQuery);
      const usersArray = [];
      usersSnap.forEach((s) => {
        if (s.exists()) usersArray.push(s.data());
      });

      if (usersArray.length > 0) {
        await createUserProfileDocument(userAuth, additionalData);
      } else {
        await setDoc(userRef, {
          userId: userCount < 10 ? `0${userCount}` : `${userCount}`,
          uid: userAuth.uid,
          id: userAuth.uid,
          ...(displayName ? { displayName } : {}),
          email,
          createdAt,
          ...additionalData,
          myWallet: 0,
          addresss: '',
          company: '',
          status: 'Customer',
          totalRecharge: 0,
          totalPoints: 0,
          buyerLvl: 1,
        });
      }
    } catch (error) {
      console.log('error creating user', error.message);
    }
  }
  return userRef;
};

export const removeItemFromCart = async (userAuth, item) => {
  if (!userAuth || !userAuth.id) return;
  const cartRef = doc(firestore, 'carts', userAuth.id);
  const snapShot = await getDoc(cartRef);
  const firestoreCart = snapShot.data().cart;
  let skusArray = item.skus.map((sku) => sku.sku_id);
  let updatedCart = firestoreCart.map((shop) => {
    if (shop.items[0].id == item.id) {
      if (shop.items[0].skus.length == item.skus.length) {
        return null;
      } else {
        let newSkusArray = [];
        shop.items[0].skus.forEach((sku) => {
          if (skusArray.includes(sku.sku_id)) {
            // skip
          } else {
            newSkusArray.push(sku);
          }
        });
        return { ...shop, items: [{ ...shop.items[0], skus: newSkusArray }] };
      }
    } else {
      return shop;
    }
  });
  await updateDoc(cartRef, { cart: updatedCart.filter((shop) => shop) });
  const updatedCartArr = await getDoc(cartRef);
  return updatedCartArr.data().cart;
};

const getPrice = (item, totalQuantity, taka) => {
  let price2 = 0;
  if (item.price_range) {
    let price_range = JSON.parse(item.price_range);
    if (price_range && price_range.length > 0) {
      price_range.forEach((price, index2, arr) => {
        const stateQ = parseInt(totalQuantity);
        const dataQs = arr.map((p, i) => (i === 0 ? 0 : parseInt(p[0])));
        const selectedIndex = dataQs.findIndex((q, i, arr) => {
          return stateQ >= q && stateQ < (arr[i + 1] || stateQ + 1);
        });
        const selected = selectedIndex === index2;
        if (selected) {
          price2 = Math.round(parseFloat(price[1]) * parseFloat(taka));
        }
      });
    }
  }
  return price2;
};

export const addCartItemTofirestore = async (userAuth, product) => {
  if (!userAuth || !userAuth.id) return;
  const cartRef = doc(firestore, 'carts', userAuth.id);
  const snapShot = await getDoc(cartRef);
  if (!snapShot.exists()) {
    try {
      await setDoc(cartRef, { cart: [product] });
      const updatedSnapshot = await getDoc(cartRef);
      return updatedSnapshot.data().cart;
    } catch (error) {
      console.log('error creating cartProduct', error.message);
      return [];
    }
  } else {
    let firestoreCart = snapShot.data().cart;
    const shopAlreadyAddedArray = firestoreCart.filter(
      (cartItem) => cartItem.shopId == product.shopId
    );
    let shopAlreadyAdded = null;
    if (shopAlreadyAddedArray.length == 1) {
      shopAlreadyAdded = shopAlreadyAddedArray[0];
    } else if (shopAlreadyAddedArray.length > 1) {
      for (let i = 0; i < shopAlreadyAddedArray.length; i++) {
        let shop = shopAlreadyAddedArray[i];
        if (shop.items.find((item) => item.id == product.items[0].id)) {
          shopAlreadyAdded = shop;
          break;
        } else {
          shopAlreadyAdded = shop;
        }
      }
    }

    if (shopAlreadyAdded) {
      const itemAlreadyAdded = shopAlreadyAdded.items.find(
        (item) => item.id == product.items[0].id
      );
      if (itemAlreadyAdded) {
        let totalQuantity = 0;
        let mergedArray = [...product.items[0].skus];
        itemAlreadyAdded.skus.forEach((sku) => {
          if (!product.items[0].skus.find((sku1) => sku1.sku_id == sku.sku_id)) {
            mergedArray.push(sku);
          } else {
            mergedArray = mergedArray.map((sku2) => {
              if (sku2.sku_id == sku.sku_id) {
                return {
                  ...sku2,
                  totalQuantity: parseInt(sku.totalQuantity) + parseInt(sku2.totalQuantity),
                };
              } else {
                return { ...sku2 };
              }
            });
          }
        });
        mergedArray.forEach((sku) => {
          totalQuantity += parseInt(sku.totalQuantity);
        });

        // Only recalculate tier price when taka rate is available; otherwise keep
        // the BDT prices that the product page already calculated in mergedArray.
        if (product.currency && product.items[0].price_range) {
          const recalculated = getPrice(product.items[0], totalQuantity, product.currency);
          if (!isNaN(recalculated) && recalculated > 0) {
            mergedArray = mergedArray.map((sku) => ({ ...sku, price: recalculated }));
          }
        }

        const newCart = snapShot.data().cart.map((shop) => {
          if (shop.shopId == product.shopId) {
            return {
              ...shop,
              items: shop.items.map((item) =>
                item.id == itemAlreadyAdded.id
                  ? { ...itemAlreadyAdded, skus: mergedArray }
                  : item
              ),
            };
          }
          return shop;
        });

        try {
          await updateDoc(cartRef, { cart: newCart });
          const updatedSnapshot = await getDoc(cartRef);
          return updatedSnapshot.data().cart;
        } catch (error) {
          console.log('error creating cartProduct', error.message);
          // Return existing Firestore cart so Redux is not cleared on error
          return snapShot.data().cart;
        }
      } else {
        try {
          await updateDoc(cartRef, { cart: [...snapShot.data().cart, product] });
          const updatedSnapshot = await getDoc(cartRef);
          return updatedSnapshot.data().cart;
        } catch (error) {
          console.log('error creating cartProduct', error.message);
          return [];
        }
      }
    } else {
      try {
        await updateDoc(cartRef, { cart: [...snapShot.data().cart, product] });
        const updatedSnapshot = await getDoc(cartRef);
        return updatedSnapshot.data().cart;
      } catch (error) {
        console.log('error creating cartProduct', error.message);
        return [];
      }
    }
  }
};

export const addToOrdersApi = async (userAuth, orders) => {
  if (!userAuth || !userAuth.id) return;
  let ordersArray = [];
  for (let i = 0; i < orders.length; i++) {
    const shop = orders[i];
    const orderRef = doc(firestore, 'ordersApi', shop.orderId);
    const snapShot = await getDoc(orderRef);
    if (!snapShot.exists()) {
      try {
        await setDoc(orderRef, {
          ...shop,
          userId: userAuth.id,
          displayName: userAuth.displayName,
          uid: userAuth.userId,
          month: getMonthName(),
        });
        const updatedSnapshot = await getDoc(orderRef);
        ordersArray.push(updatedSnapshot.data());
      } catch (error) {
        console.log('error creating orders', error.message);
        return;
      }
    } else {
      toast.error('this orderId was already added. try again');
    }
  }
  return ordersArray.sort((a, b) => b.time - a.time);
};

export const updateOrdersApi = async (userAuth, orders) => {
  if (!userAuth || !userAuth.id) return;
  for (let i = 0; i < orders.length; i++) {
    const shop = orders[i];
    const orderRef = doc(firestore, 'ordersApi', shop.orderId);
    const snapShot = await getDoc(orderRef);
    if (snapShot.exists()) {
      try {
        await updateDoc(orderRef, { ...shop, userId: userAuth.id });
      } catch (error) {
        console.log('error updating orders', error.message);
        return;
      }
    } else {
      toast.error('No order was found to be updated');
    }
  }
  let ordersArray = await getAllOrdersApi(userAuth.id);
  return ordersArray.sort((a, b) => b.time - a.time);
};

export const getAllOrdersApi = async (userId) => {
  if (!userId) return;
  const ordersCollectionRef = collection(firestore, 'ordersApi');
  const q = query(ordersCollectionRef, where('userId', '==', userId));
  try {
    const orders = await getDocs(q);
    const ordersArray = [];
    orders.forEach((d) => { ordersArray.push(d.data()); });
    return ordersArray.sort((a, b) => b.time - a.time);
  } catch (error) {
    console.error(error);
  }
};

export const getAllBookingsOfSingleUser = async (userId) => {
  const bookingsCollectionRef = collection(firestore, 'bookingRequest');
  const q = query(bookingsCollectionRef, where('userId', '==', userId));
  try {
    const bookings = await getDocs(q);
    const bookingsArray = [];
    bookings.forEach((d) => { bookingsArray.push(d.data()); });
    return bookingsArray.sort((a, b) => b.time - a.time);
  } catch (error) {
    console.error(error);
  }
};

export const getAllShipForMeOfSingleUser = async (userId) => {
  const bookingsCollectionRef = collection(firestore, 'shipForMe');
  const q = query(bookingsCollectionRef, where('userId', '==', userId));
  try {
    const bookings = await getDocs(q);
    const bookingsArray = [];
    bookings.forEach((d) => { bookingsArray.push(d.data()); });
    return bookingsArray.sort((a, b) => b.time - a.time);
  } catch (error) {
    console.error(error);
  }
};

export const setProductRequest = async (bookingObj) => {
  const bookingId = `${Math.round(Math.random() * 1000000 - 1)}`;
  const bookingRef = doc(firestore, 'bookingRequest', bookingId);
  delete bookingObj.file;
  const snapShot = await getDoc(bookingRef);
  if (!snapShot.exists()) {
    try {
      await setDoc(bookingRef, { bookingId, ...bookingObj });
      const uploadedSnapShot = await getDoc(bookingRef);
      return uploadedSnapShot.data();
    } catch (error) {
      console.error(error);
    }
  } else {
    toast.error('there is already a booking with similar uid, please try again later');
  }
};

export const setShipForMe = async (bookingObj) => {
  const bookingRef = doc(firestore, 'shipForMe', bookingObj.bookingId);
  delete bookingObj.file;
  const snapShot = await getDoc(bookingRef);
  if (!snapShot.exists()) {
    try {
      await setDoc(bookingRef, { ...bookingObj });
      const uploadedSnapShot = await getDoc(bookingRef);
      return uploadedSnapShot.data();
    } catch (error) {
      console.error(error);
    }
  } else {
    toast.error('there is already a booking with similar uid, please try again later');
  }
};

export const updateShipForMe = async (bookingObj) => {
  const bookingRef = doc(firestore, 'shipForMe', bookingObj.bookingId);
  delete bookingObj.file;
  const snapShot = await getDoc(bookingRef);
  try {
    await updateDoc(bookingRef, { ...snapShot.data(), ...bookingObj });
    const uploadedSnapShot = await getDoc(bookingRef);
    return uploadedSnapShot.data();
  } catch (error) {
    console.error(error);
  }
};

export const updateShipmentRequest = async (requestObj) => {
  const requestRef = doc(firestore, 'shipForMe', requestObj.bookingId);
  try {
    await updateDoc(requestRef, { ...requestObj });
    const request = await getDoc(requestRef);
    return request.data();
  } catch (error) {
    console.error(error);
  }
};

export const getAllD2DRates = async (freightType, country) => {
  const d2dRatesCollectionRef = collection(firestore, `d2d-rates-${freightType}-${country}`);
  try {
    const d2dRates = await getDocs(d2dRatesCollectionRef);
    const d2dRatesArray = [];
    d2dRates.forEach((d) => { d2dRatesArray.push(d.data()); });
    return d2dRatesArray;
  } catch (error) {
    console.error(error);
  }
};

/* 1688 category-id-keyed AIR shipping rates (admin-managed at
   /ship-for-me-2/air-1688 in paicart-backend2) — fields per doc:
   categoryId, translatedName, parcel (<=300g), ten (below 5kg), eleven (above 5kg). */
export const getAll1688CategoryRates = async () => {
  const ratesCollectionRef = collection(firestore, '1688Category');
  try {
    const rates = await getDocs(ratesCollectionRef);
    const ratesArray = [];
    rates.forEach((d) => { ratesArray.push(d.data()); });
    return ratesArray;
  } catch (error) {
    console.error(error);
    return [];
  }
};

/* Single-doc lookup by categoryId - the `1688Category` collection has ~13k
   documents, so a product page has no business pulling the whole collection
   (getAll1688CategoryRates above) just to find its own category's rate. */
export const get1688CategoryRateById = async (categoryId) => {
  if (!categoryId) return null;
  try {
    const snap = await getDoc(doc(firestore, '1688Category', String(categoryId)));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getAllBanners = async () => {
  const bannersCollectionRef = collection(firestore, 'banners');
  const q = query(bannersCollectionRef, where('visible', '==', true));
  try {
    const bannersCollections = await getDocs(q);
    const bannersArray = [];
    bannersCollections.forEach((d) => { bannersArray.push(d.data()); });
    return bannersArray;
  } catch (error) {
    console.error(error);
  }
};

export const getAllCampaigns = async () => {
  const campaignsCollectionRef = collection(firestore, 'campaigns');
  const q = query(campaignsCollectionRef, where('visible', '==', true));
  try {
    const campaigns = await getDocs(q);
    const campaignsArray = [];
    campaigns.forEach((d) => { campaignsArray.push(d.data()); });
    return campaignsArray;
  } catch (error) {
    console.error(error);
  }
};

export const getAllPartials = async () => {
  const partialsCollectionRef = collection(firestore, 'partial-payments');
  try {
    const partials = await getDocs(partialsCollectionRef);
    const partialsArray = [];
    partials.forEach((d) => { partialsArray.push(d.data()); });
    return partialsArray;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getSiteDiscount = async () => {
  const siteDiscountCollectionRef = collection(firestore, 'site-discount');
  try {
    const docs = await getDocs(siteDiscountCollectionRef);
    const arr = [];
    docs.forEach((d) => { arr.push(d.data()); });
    return arr[0] || null;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getAllShipForMeList = async (userId) => {
  const listCollectionRef = collection(firestore, 'shipForMeList');
  const q = query(listCollectionRef, where('userId', '==', userId));
  try {
    const list = await getDocs(q);
    const listsArray = [];
    list.forEach((d) => { listsArray.push(d.data()); });
    return listsArray;
  } catch (error) {
    console.error(error);
  }
};

export const uploadShipForMeList = async (bookingObj) => {
  const bookingId = `${Math.round(Math.random() * 1000000 - 1)}`;
  const bookingRef = doc(firestore, 'shipForMeList', bookingId);
  delete bookingObj.file;
  const snapShot = await getDoc(bookingRef);
  if (!snapShot.exists()) {
    try {
      await setDoc(bookingRef, { bookingId, ...bookingObj });
      const uploadedSnapShot = await getDoc(bookingRef);
      return uploadedSnapShot.data();
    } catch (error) {
      console.error(error);
    }
  } else {
    toast.error('there is already a booking with similar uid, please try again later');
  }
};

export const updateShipForMeList = async (bookingObj) => {
  const bookingRef = doc(firestore, 'shipForMeList', bookingObj.bookingId);
  delete bookingObj.bookingObj;
  const snapShot = await getDoc(bookingRef);
  if (snapShot.exists()) {
    try {
      await updateDoc(bookingRef, { ...bookingObj });
      const uploadedSnapShot = await getDoc(bookingRef);
      return uploadedSnapShot.data();
    } catch (error) {
      console.error(error);
    }
  } else {
    toast.error('there is already a booking with similar uid, please try again later');
  }
};

export const deleteShipForMeList = async (bookingObj) => {
  const productTypeRef = doc(firestore, 'shipForMeList', bookingObj.bookingId);
  try {
    await deleteDoc(productTypeRef);
  } catch (error) {
    console.error(error);
  }
};

export const getSingleShipForMe = async (bookingId) => {
  try {
    const shipForMeRef = doc(firestore, 'shipForMe', bookingId);
    const shipForMe = await getDoc(shipForMeRef);
    return shipForMe.data();
  } catch (error) {
    console.error(error);
  }
};

export const getAllHomeCategory = async () => {
  const productsCollectionRef = collection(firestore, 'homeCategories');
  try {
    const products = await getDocs(productsCollectionRef);
    const productsArray = [];
    products.forEach((d) => { productsArray.push(d.data()); });
    return productsArray;
  } catch (error) {
    console.error(error);
  }
};

export const sendOtp = async (number, otp) => {
  const otpRef = doc(firestore, 'otpSms', `${number}`);
  const snapShot = await getDoc(otpRef);
  try {
    if (!snapShot.exists()) {
      await setDoc(otpRef, { number, otp });
      setTimeout(async () => {
        await deleteDoc(otpRef);
      }, 60000);
    } else {
      await updateDoc(otpRef, { number, otp });
      setTimeout(async () => {
        await deleteDoc(otpRef);
      }, 60000);
    }
  } catch (error) {
    console.error(error);
  }
};

export const verifyOtp = async (number, otp) => {
  const otpRef = doc(firestore, 'otpSms', `${number}`);
  const snapShot = await getDoc(otpRef);
  try {
    if (!snapShot.exists()) {
      toast.error('Your OTP is expired. Try again.');
      return null;
    } else {
      if (snapShot.data().otp == otp) {
        const userAuth = {
          uid: number,
          id: number,
          email: '',
          displayName: number,
        };
        const userRef = await createUserProfileDocument(userAuth, { mobileNo: `${number}` });
        await signInAnonymously(auth);
        const userObj = await getDoc(userRef);
        return userObj.data();
      }
      /* Wrong code. The web version fell through to an implicit undefined,
         which the caller read as "no error" — combined with an un-awaited
         dispatch that is why a bad OTP still let people in. */
      toast.error('Incorrect OTP. Please try again.');
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getSingleOrderApi = async (id) => {
  const orderRef = doc(firestore, 'ordersApi', id);
  try {
    const order = await getDoc(orderRef);
    return order.data();
  } catch (error) {
    console.error(error);
  }
};

/* Cancels an order that's been sitting completely unpaid (no payment, nothing
   pending) past its window. Marked, not deleted: the customer can still see
   what happened and re-order it, and support keeps a record. Called
   client-side from the my-orders page rather than a scheduled job, since this
   project has no server-side cron infrastructure. */
export const cancelUnpaidOrderApi = async (orderId, reason = 'unpaid-window-expired') => {
  if (orderId == null) return;
  const orderRef = doc(firestore, 'ordersApi', String(orderId));
  try {
    await updateDoc(orderRef, {
      orderStatus: 'reject',
      cancelledReason: reason,
      cancelledAt: Date.now(),
      autoCancelled: true,
    });
  } catch (error) {
    console.error(error);
  }
};

export const deleteOrderApi = async (orderId) => {
  if (orderId == null) return;
  // Some legacy orders were written with a numeric orderId — Firestore's
  // doc() requires a string path segment, so coerce defensively.
  const orderRef = doc(firestore, 'ordersApi', String(orderId));
  try {
    await deleteDoc(orderRef);
  } catch (error) {
    console.error(error);
  }
};

export const getAllNotices = async () => {
  const noticesCollectionRef = collection(firestore, 'notices');
  try {
    const notices = await getDocs(noticesCollectionRef);
    let noticesArray = [];
    // Carry the Firestore document id through — /pages/notices/[noticeId]
    // looks the notice up by doc id, which the stored `id` field may not match.
    notices.forEach((d) => { noticesArray.push({ ...d.data(), id: d.id }); });
    return noticesArray.sort((a, b) => b.time - a.time);
  } catch (error) {
    console.error(error);
  }
};

export const getSingleNotice = async (noticeId) => {
  const noticeRef = doc(firestore, 'notices', noticeId);
  const snapShot = await getDoc(noticeRef);
  return snapShot.data();
};

export const getSingleProductRequest = async (id) => {
  const orderRef = doc(firestore, 'bookingRequest', id);
  try {
    const order = await getDoc(orderRef);
    return order.data();
  } catch (error) {
    console.error(error);
  }
};

export const getOrderOrShipmentRequest = async (orderId) => {
  const orderRef = doc(firestore, 'ordersApi', orderId);
  const shipmentRequestRef = doc(firestore, 'shipForMe', orderId);
  const productRequestRef = doc(firestore, 'bookingRequest', orderId);
  const orderSnapShot = await getDoc(orderRef);
  const shipmentSnapShot = await getDoc(shipmentRequestRef);
  const bookingSnapShot = await getDoc(productRequestRef);

  if (orderSnapShot.exists()) {
    return orderSnapShot.data();
  } else if (shipmentSnapShot.exists()) {
    return shipmentSnapShot.data();
  } else if (bookingSnapShot.exists()) {
    return bookingSnapShot.data();
  } else {
    const ordersCollectionRef = collection(firestore, 'ordersApi');
    const shipmentCollectionRef = collection(firestore, 'shipForMe');
    const productRequestCollectionRef = collection(firestore, 'bookingRequest');

    const ordersQ = query(ordersCollectionRef, where('trackingNo', '==', orderId));
    const shipmentsQ = query(shipmentCollectionRef, where('trackingNo', '==', orderId));
    const productRequestsQ = query(productRequestCollectionRef, where('trackingNo', '==', orderId));

    const orders = await getDocs(ordersQ);
    const shipments = await getDocs(shipmentsQ);
    const productRequests = await getDocs(productRequestsQ);

    if (!orders.empty) {
      const ordersArray = [];
      orders.forEach((d) => { ordersArray.push(d.data()); });
      return ordersArray[0];
    } else if (!shipments.empty) {
      const shipmentsArray = [];
      shipments.forEach((d) => { shipmentsArray.push(d.data()); });
      return shipmentsArray[0];
    } else if (!productRequests.empty) {
      const productRequestsArray = [];
      productRequests.forEach((d) => { productRequestsArray.push(d.data()); });
      return productRequestsArray[0];
    } else {
      return null;
    }
  }
};

export const getCurrency = async () => {
  const currencyRef = doc(firestore, 'Currency', 'taka');
  try {
    const currency = await getDoc(currencyRef);
    return currency.data();
  } catch (error) {
    console.error(error);
  }
};

/* `file` is { uri, type?, name? } as produced by the image picker. */
export const uploadImage = async (file) => {
  const { uri, ext, contentType } = describeUpload(file);
  const imageRef = ref(storage, `payments/${GenerateUniqueID()}${ext}`);
  await putFile(imageRef, uri, contentType ? { contentType } : undefined);
  const url = await getDownloadURL(imageRef);
  return url;
};

export const uploadShipForMeFile = async (file, folder = 'shipForMe') => {
  const { uri, ext, contentType } = describeUpload(file);
  const fileRef = ref(storage, `${folder}/${GenerateUniqueID()}${ext}`);
  await putFile(fileRef, uri, contentType ? { contentType } : undefined);
  const url = await getDownloadURL(fileRef);
  return url;
};

export const getAllWarehouses = async () => {
  const warehousesCollectionRef = collection(firestore, 'warehouses');
  try {
    const snapshot = await getDocs(warehousesCollectionRef);
    const warehousesArray = [];
    snapshot.forEach((d) => { warehousesArray.push(d.data()); });
    return warehousesArray;
  } catch (error) {
    console.error(error);
    return [];
  }
};

/* Product-request payment. Throws on failure (like the order and shipment
   versions below) so the modal shows an error instead of a false success.
   The id must be a string: doc() throws on a number, which used to fail
   every submission before anything was written. */
export const uploadPaymentRequest2 = async (paymentObj) => {
  const paymentRequestRef = doc(firestore, 'paymentRequestApi', String(paymentObj.paymentId));
  delete paymentObj.file;
  const snapShot = await getDoc(paymentRequestRef);
  if (snapShot.exists()) {
    throw new Error('Payment ID already exists. Please try again.');
  }
  await setDoc(paymentRequestRef, {
    ...paymentObj,
    displayName: paymentObj.displayName || '',
    productRequest: true,
  });
  for (const booking of paymentObj.productRequestArray) {
    const q = query(collection(firestore, 'bookingRequest'), where('bookingId', '==', booking.bookingId));
    const bookings = await getDocs(q);
    for (const d of bookings.docs) {
      await updateDoc(d.ref, { paymentStatus: 'pending' });
    }
  }
  return paymentObj;
};

/* Writes the customer's refund application and flips the source record to
   `refundStatus: 'requested'`, returning the updated record for the reducer.

   Throws rather than swallowing: the caller renders a toast off the failure
   and keeps the modal open so the customer can retry. It used to console.error
   and return undefined, which made a failed write look like a success and
   then crashed the reducer on `action.payload.orderId`. */
export const uploadRefundApply = async (refundObj) => {
  const refundId = String(refundObj.refundId);
  const refundRequestRef = doc(firestore, 'refundRequest', refundId);
  const snapShot = await getDoc(refundRequestRef);
  if (snapShot.exists()) {
    throw new Error(`refund request ${refundId} already exists`);
  }
  await setDoc(refundRequestRef, {
    ...refundObj,
    refundId,
    status: 'pending',
    /* The admin sorts its queues with `b.time - a.time`, so this stays a
       number even though the document id is a string. */
    time: Number(refundId),
  });
  const orderRef = refundObj.productRequest
    ? doc(firestore, 'bookingRequest', String(refundObj.order.bookingId))
    : doc(firestore, 'ordersApi', String(refundObj.order.orderId));
  await updateDoc(orderRef, { refundStatus: 'requested' });
  const orderSnapshot = await getDoc(orderRef);
  return orderSnapshot.data();
};

export const submitComplaint = async (complaintObj) => {
  const complaintId = `${Date.now()}`;
  const complaintRef = doc(firestore, 'complain', complaintId);
  try {
    const date = new Date();
    await setDoc(complaintRef, {
      ...complaintObj,
      complaintId,
      status: 'pending',
      time: date.getTime(),
      date: date.toLocaleDateString('en-GB'),
    });
    const snapShot = await getDoc(complaintRef);
    return snapShot.data();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const uploadShipmentPaymentRequest = async (paymentObj) => {
  const paymentRequestRef = doc(firestore, 'paymentRequest', String(paymentObj.paymentId));
  delete paymentObj.file;
  const snapShot = await getDoc(paymentRequestRef);
  if (!snapShot.exists()) {
    /* Firestore rejects undefined — users without a name have no displayName */
    await setDoc(paymentRequestRef, { ...paymentObj, displayName: paymentObj.displayName || '' });
    for (const booking of paymentObj.productRequestArray) {
      const bookingsCollectionRef = collection(firestore, 'shipForMe');
      const q = query(bookingsCollectionRef, where('bookingId', '==', booking.bookingId));
      const bookings = await getDocs(q);
      for (const d of bookings.docs) {
        await updateDoc(d.ref, { paymentRequested: true });
      }
    }
    return paymentObj;
  } else {
    throw new Error('Payment ID already exists. Please try again.');
  }
};

export const uploadOrderPaymentRequest = async (paymentObj) => {
  const paymentRequestRef = doc(firestore, 'paymentRequestApi', String(paymentObj.paymentId));
  delete paymentObj.file;
  const snapShot = await getDoc(paymentRequestRef);
  if (!snapShot.exists()) {
    /* Firestore rejects undefined — users without a name have no displayName */
    await setDoc(paymentRequestRef, { ...paymentObj, displayName: paymentObj.displayName || '' });
    for (const order of paymentObj.pendingOrders) {
      const ordersCollectionRef = collection(firestore, 'ordersApi');
      const q = query(ordersCollectionRef, where('orderId', '==', order.orderId));
      const orders = await getDocs(q);
      for (const d of orders.docs) {
        /* d.ref, not doc(…, orderId): older orders store orderId as a number,
           and doc() throws on non-string ids. */
        const orderRef = d.ref;
        /* Carry the chosen "pay now %" tier onto the order itself. Stored as
           a number (20, never "20%") — the bill breakdowns in both the
           customer app and the admin panel read it that way, and without it
           the discount the customer was granted left no trace on the order. */
        const offer = parseFloat(paymentObj.offer) || 0;
        await updateDoc(orderRef, {
          paymentStatus: 'pending',
          ...(offer > 0
            ? {
                offer,
                offerPayNowPercent: parseFloat(paymentObj.offerPayNowPercent) || 0,
                offerDiscountAmount: parseFloat(paymentObj.offerDiscountAmount) || 0,
              }
            : {}),
        });
      }
    }
    return paymentObj;
  } else {
    throw new Error('Payment ID already exists. Please try again.');
  }
};

export const addCartItemsToOrdersFirestore = async (userAuth, ordersArray, billingAddress) => {
  if (!userAuth) return;
  const sum = getCartTotal(ordersArray);
  const paid = 0;
  const uniqueId = 'gbb' + GenerateUniqueID();
  const orderRef = doc(firestore, 'orders', uniqueId);
  try {
    await setDoc(orderRef, {
      userId: userAuth.uid,
      otherInformation: billingAddress,
      order: ordersArray,
      sum,
      status: 'order_pending',
      orderedAt: new Date(),
      paymentStatus: {
        paid,
        due: parseInt(sum) - parseInt(paid),
        total: sum,
      },
    });
    const snapShot = await getDoc(orderRef);
    const userRef = doc(firestore, 'users', userAuth.uid);
    const userSnapShot = await getDoc(userRef);
    const previousOrdersArray = userSnapShot.data().ordersArray
      ? userSnapShot.data().ordersArray
      : [];
    try {
      await updateDoc(userRef, {
        ordersArray: [...previousOrdersArray, { ...snapShot.data(), orderId: uniqueId }],
        shippingAddress: billingAddress,
      });
    } catch (error) {
      toast.error('error creating order. try again later');
    }
    return { ...snapShot.data(), orderId: uniqueId };
  } catch (error) {
    toast.error('error creating order. please try again');
  }
};

export const removeCartItemFromFirestore = async (userAuth, product) => {
  if (!userAuth) return;
  const cartRef = doc(firestore, 'carts', userAuth.uid);
  const snapShot = await getDoc(cartRef);
  if (!snapShot.exists()) return;
  let cart = [];
  snapShot.data().cart.forEach((cartItem) => {
    if (cartItem.id !== product.id) {
      cart.push(cartItem);
    } else {
      if (cartItem.color !== product.color) {
        cart.push(cartItem);
      } else {
        if (cartItem.sizeOrShipsFrom !== product.sizeOrShipsFrom) {
          cart.push(cartItem);
        }
      }
    }
  });
  try {
    await updateDoc(cartRef, { cart });
  } catch (error) {
    console.error(error);
  }
};

export const removeAllCartItemFromFirestore = async (userAuth, cartItem) => {
  if (!userAuth) return;
  const cartRef = doc(firestore, 'carts', userAuth.uid);
  await deleteDoc(cartRef);
};

export const addWishlistTofirestore = async (userAuth, product) => {
  if (!userAuth) return;
  const wishlistRef = doc(firestore, 'wishlists', userAuth.uid);
  const snapShot = await getDoc(wishlistRef);
  if (!snapShot.exists()) {
    await setDoc(wishlistRef, { wishlist: [{ ...product, price_range: '', videos: '' }] });
  } else {
    if (snapShot.data().wishlist.findIndex((item) => item.id === product.id) !== -1) {
      return;
    } else {
      await updateDoc(wishlistRef, {
        wishlist: [...snapShot.data().wishlist, { ...product, price_range: '', videos: '' }],
      });
    }
  }
};

export const removeFromWishlistFirestore = async (userAuth, product) => {
  if (!userAuth) return;
  const wishlistRef = doc(firestore, 'wishlists', userAuth.uid);
  const snapShot = await getDoc(wishlistRef);
  const wishlist = snapShot.data().wishlist.filter((item) => item.id !== product.id);
  await updateDoc(wishlistRef, { wishlist });
};

export const getSelectedIntroModal = async () => {
  const introCollectionRef = collection(firestore, 'intros');
  const q = query(introCollectionRef, where('selected', '==', true));
  const intros = await getDocs(q);
  let imgUrl = [];
  intros.forEach((intro) => { imgUrl.push(intro.data()); });
  if (imgUrl.length > 0) {
    return imgUrl[0].imageUrl;
  } else {
    return '';
  }
};

export const getSingleUser = async (id) => {
  const userRef = doc(firestore, 'users', id);
  try {
    const user = await getDoc(userRef);
    return user.data();
  } catch (error) {
    console.error(error);
  }
};

export const updateUser = async (user) => {
  const userRef = doc(firestore, 'users', user.id);
  try {
    await updateDoc(userRef, { ...user });
  } catch (error) {
    console.error(error);
  }
};

export const getSingleCoupon = async (couponName) => {
  const couponsCollectionRef = collection(firestore, 'coupons');
  const q = query(couponsCollectionRef, where('name', '==', couponName));
  const couponsCollection = await getDocs(q);
  let coupons = [];
  couponsCollection.forEach((d) => { coupons.push(d.data()); });
  if (coupons.length > 0) {
    return coupons[0];
  } else {
    return null;
  }
};

export const get1688Category = async (level, categoryId) => {
  const productsCollectionRef = collection(firestore, '1688Category');
  const q = query(productsCollectionRef, where(`level${level}`, 'array-contains', categoryId));
  try {
    const products = await getDocs(q);
    const productsArray = [];
    products.forEach((d) => { productsArray.push(d.data()); });
    return productsArray[0];
  } catch (error) {
    console.error(error);
    return [];
  }
};

/* ── Dashboard counters ──
   How many of a user's documents sit in each tab. Every order / ship-for-me
   request carries a `bucket` field kept in sync by the Cloud Function in
   paicart-nextjs15/functions/ (rules: lib/buckets.js), so each tab is one
   server-side count — ~1 read per 1000 documents, however long the user's
   history, and always equal to what the tab list shows. Two equality
   filters, so Firestore serves it from the built-in single-field indexes.
   A failed count reports 0 rather than taking the dashboard down. */
const countBucket = async (collectionName, userId, bucket) => {
  try {
    const snap = await getCountFromServer(query(
      collection(firestore, collectionName),
      where('userId', '==', userId),
      where('bucket', '==', bucket),
    ));
    return snap.data().count || 0;
  } catch (error) {
    console.error(`count(${collectionName}, ${bucket})`, error);
    return 0;
  }
};

export const getOrderStatCounts = async (userId) => {
  if (!userId) return { toPay: 0, toShip: 0, inShipment: 0, toReceive: 0, delivered: 0 };
  const [toPay, toShip, inShipment, toReceive, delivered] = await Promise.all(
    ['To Pay', 'To Ship', 'In Shipment', 'To Receive', 'Delivered']
      .map((b) => countBucket('ordersApi', userId, b)),
  );
  return { toPay, toShip, inShipment, toReceive, delivered };
};

export const getShipStatCounts = async (userId) => {
  if (!userId) return { pending: 0, approved: 0, inShipment: 0, toReceive: 0, delivered: 0 };
  const [pending, approved, inShipment, toReceive, delivered] = await Promise.all(
    ['Pending', 'Approved', 'In Shipment', 'To Receive', 'Delivered']
      .map((b) => countBucket('shipForMe', userId, b)),
  );
  return { pending, approved, inShipment, toReceive, delivered };
};
