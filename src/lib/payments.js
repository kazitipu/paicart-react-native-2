/* ─── Payment constants and the bKash gateway hand-off ───
 *
 * On the web these lived inside a route folder
 * (app/pages/dashboard/ship-for-me/my-request/_shared.jsx) which components
 * then imported *upwards* from — PrePaymentModal reached into a route for
 * BANK_ACCOUNTS. They belong in lib.
 */
import axios from 'axios';
import { Linking } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';

export const BANK_ACCOUNTS = [
  {
    key: 'City',
    logo: require('@/assets/city-bank.png'),
    name: 'City Bank',
    acName: 'MD MOSTAFA SHEIKH',
    acNo: '2303116295001',
    routing: 'Routing: 225670228',
    branch: 'Bhulta, Narayanganj',
  },
  {
    key: 'Bkash',
    logo: require('@/assets/bkash.png'),
    name: 'Bkash',
    acName: 'MD RABIUL HASAN',
    acNo: '01780180810',
    routing: 'Personal',
    branch: '',
  },
];

/* Two different rates, and they are not interchangeable:
   - 2%   when the customer sends money to the bKash personal number themselves
          (they absorb bKash's own send-money charge)
   - 1.5% when paying through the hosted gateway
   Mixing them up over- or under-bills every manual payment. */
export const MANUAL_BKASH_FEE_PCT = 2;
export const GATEWAY_BKASH_FEE_PCT = 1.5;

export const manualBkashFee = (amount) => {
  const payable = parseFloat(amount) || 0;
  return Math.round((payable * MANUAL_BKASH_FEE_PCT) / 100);
};

export const gatewayBkashFee = (amount) => {
  const payable = parseFloat(amount) || 0;
  return parseFloat(((payable * GATEWAY_BKASH_FEE_PCT) / 100).toFixed(2));
};

/* The web sent `parseInt(payable * 0.015) + payable` — a truncating parseInt,
   not a round. Kept identical: the gateway reconciles against this exact
   figure, so "fixing" the rounding here would put the app a taka out from
   what the server expects. */
export const gatewayPayableTotal = (amount) => {
  const payable = parseFloat(amount) || 0;
  return parseInt(payable * (GATEWAY_BKASH_FEE_PCT / 100), 10) + payable;
};

export const BKASH_CREATE_PAYMENT_URL = 'https://paicart.com/api/v1/bkash/create-payment';

/* Where the gateway sends the customer back to.
 *
 * ⚠️ The web passed `window.location.href` — the page it was on. There is no
 * such page on mobile, so the gateway must redirect to this custom scheme
 * instead. THIS REQUIRES A BACKEND CHANGE: paicart.com's bkash create-payment
 * and its callback must accept and honour a `paicart://` URL. Until that
 * lands, the payment will complete on bKash's side but the app will not be
 * returned to. Tracked in MIGRATION.md. */
export const PAYMENT_RETURN_URL = 'paicart://payment-return';

/* Opens the hosted gateway. An in-app browser rather than the system browser
   so the app stays in the foreground and the deep-link return lands back in
   this task rather than a fresh one. */
export const openBkashGateway = async (paymentObj) => {
  const { data } = await axios.post(BKASH_CREATE_PAYMENT_URL, {
    ...paymentObj,
    payableTotalWithGatewayCharge: gatewayPayableTotal(paymentObj.amount),
    url: PAYMENT_RETURN_URL,
  });

  const url = data?.bkashURL;
  if (!url) throw new Error('Gateway did not return a payment URL');

  if (await InAppBrowser.isAvailable()) {
    return InAppBrowser.openAuth(url, PAYMENT_RETURN_URL, {
      ephemeralWebSession: false,
      showTitle: true,
      enableUrlBarHiding: true,
      enableDefaultShare: false,
    });
  }
  await Linking.openURL(url);
  return { type: 'external' };
};
