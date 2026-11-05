/* ─── Payment constants and the bKash gateway hand-off ───
 *
 * On the web these lived inside a route folder
 * (app/pages/dashboard/ship-for-me/my-request/_shared.jsx) which components
 * then imported *upwards* from — PrePaymentModal reached into a route for
 * BANK_ACCOUNTS. They belong in lib.
 */
import axios from 'axios';
import { navigationRef } from '@/navigation/navigationRef';
import { toast } from '@/lib/toast';

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

/* ─── bKash checkout, entirely inside the app ───
 *
 * The checkout page runs in our own WebView (screens/services/BkashCheckout)
 * — never Chrome or a Custom Tab — so the customer cannot end up on the web
 * site afterwards.
 *
 * bKash returns to paicart.com's /api/v1/bkash/payment/callback, which
 * executes the payment and then redirects to our `url` with
 * ?paymentStatus=&paymentId=. We pass a paicart.com URL (the server only
 * honours its own origin), and the WebView intercepts that final redirect
 * before it loads, closes itself and reports the result here. Any paicart.com
 * URL carrying paymentStatus counts — including the homepage fallback the
 * server uses for an expired session — so nothing ever renders the site.
 *
 * (The old flow passed paicart://payment-return. The live server rejected
 * it — that support was never deployed — and sent customers to the
 * homepage in the browser, which is the bug this replaces.) */
export const BKASH_RETURN_URL = 'https://paicart.com/bkash/app-return';
const PAICART_HOSTS = ['paicart.com', 'www.paicart.com'];

const parseQuery = (url) => {
  const params = {};
  const query = String(url).split('#')[0].split('?')[1] || '';
  query.split('&').filter(Boolean).forEach((pair) => {
    const [k, v = ''] = pair.split('=');
    try {
      params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    } catch {
      params[k] = v;
    }
  });
  return params;
};

/* Is this the callback's final redirect back to the site? */
export const isBkashReturnUrl = (url) => {
  const m = /^https?:\/\/([^/?#]+)/i.exec(String(url || ''));
  if (!m || !PAICART_HOSTS.includes(m[1].toLowerCase())) return false;
  return 'paymentStatus' in parseQuery(url);
};

/* The callback's paymentStatus is either a keyword or a sentence of its own
   (see the callback route) — classified exactly as the web's
   PaymentReturnToast does. */
export const classifyBkashReturn = (url) => {
  const { paymentStatus: raw = '', paymentId = '' } = parseQuery(url);
  if (raw === 'success') return { status: 'success', paymentId };
  if (raw === 'cancel') return { status: 'cancelled', paymentId };
  if (raw === 'failure') return { status: 'failed', paymentId };
  /* Charged, but recording it failed — the team fixes it; not an error for them. */
  if (raw.startsWith('Payment received')) return { status: 'paid_unrecorded', paymentId, message: raw };
  return { status: 'error', paymentId, message: raw || 'An error occurred! Please try again later.' };
};

let pendingCheckout = null;

/* Called by BkashCheckout exactly once per checkout. `closed` means the
   customer left before bKash redirected back — the payment is only executed
   on that redirect, so nothing was charged. */
export const finishBkashCheckout = (result) => {
  const resolve = pendingCheckout;
  pendingCheckout = null;
  resolve?.(result || { status: 'closed' });
};

/* Starts a checkout and resolves with its outcome:
   { status: 'success' | 'paid_unrecorded' | 'cancelled' | 'failed' | 'error' | 'closed', paymentId?, message? }
   Throws only if the checkout could not be started at all. */
export const openBkashGateway = async (paymentObj) => {
  const { data } = await axios.post(BKASH_CREATE_PAYMENT_URL, {
    ...paymentObj,
    payableTotalWithGatewayCharge: gatewayPayableTotal(paymentObj.amount),
    url: BKASH_RETURN_URL,
  });
  const url = data?.bkashURL;
  if (!url) throw new Error('Gateway did not return a payment URL');
  if (!navigationRef.isReady()) throw new Error('App is not ready');

  finishBkashCheckout({ status: 'closed' }); // a stale one, if any
  return new Promise((resolve) => {
    pendingCheckout = resolve;
    navigationRef.navigate('BkashCheckout', { url });
  });
};

/* Shows the outcome the way the web does (same messages as its
   PaymentReturnToast) and says whether the customer has paid. Pass
   { quietSuccess: true } when the caller shows its own success screen. */
export const reportBkashResult = (result, { quietSuccess = false } = {}) => {
  switch (result?.status) {
    case 'success':
      if (!quietSuccess) toast.success('Payment successful! Your payment has been recorded.');
      return true;
    case 'paid_unrecorded':
      toast.warning(result.message);
      return true;
    case 'failed':
      toast.error('Payment failed. Please try again.');
      return false;
    case 'error':
      toast.error(result.message);
      return false;
    default: // cancelled, closed
      toast.info('Payment cancelled.');
      return false;
  }
};

/* paicart://payment-return?paymentStatus=…&paymentId=… → PaymentReturn. */
export const showPaymentResult = (returnUrl) => {
  const query = String(returnUrl).split('?')[1] || '';
  const params = {};
  query.split('&').filter(Boolean).forEach((pair) => {
    const [k, v = ''] = pair.split('=');
    params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  });
  if (navigationRef.isReady()) navigationRef.navigate('PaymentReturn', params);
};
