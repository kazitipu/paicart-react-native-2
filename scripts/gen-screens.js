/* Creates a placeholder screen for every route that has no file yet.
   Safe to re-run: existing screens are never overwritten, so a phase that has
   already replaced a stub keeps its real implementation. */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const { code } = babel.transformFileSync('src/navigation/routes.js', {
  configFile: './babel.config.js',
});
const mod = { exports: {} };
new Function('module', 'exports', 'require', code)(mod, mod.exports, require);
const { ROUTES } = mod.exports;

const AREA = {
  Home: 'storefront', Collection: 'storefront', Product: 'storefront',
  Product1688: 'storefront', ProductTaobao: 'storefront', TaobaoSearch: 'storefront',
  Wishlist: 'storefront', Categories: 'storefront',

  Cart: 'cart', PlaceOrder: 'cart', LegacyCart: 'cart', PlaceOrderSuccess: 'cart',
  OrderSuccess: 'cart', OrderSuccessDetail: 'cart', LegacyOrderDetail: 'cart',
  LegacyOrderLogistics: 'cart',

  Login: 'auth', Register: 'auth', ForgotPassword: 'auth',

  ShipForMeForm: 'services', BuyForMe: 'services', TrackOrder: 'services',
  CostCalculator: 'services', Notices: 'services', NoticeDetail: 'services',
  More: 'services', PaymentReturn: 'services',

  AboutUs: 'static', Contact: 'static', Faq: 'static', HowToOrder: 'static',
  PrivacyPolicy: 'static', RefundPolicy: 'static', TaxAndShipping: 'static',
  Terms: 'static',
};

let created = 0, kept = 0;
Object.keys(ROUTES).forEach((name) => {
  const area = AREA[name] || 'dashboard';
  const dir = path.join('src/screens', area);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.jsx`);
  if (fs.existsSync(file)) { kept++; return; }
  fs.writeFileSync(file, `import React from 'react';
import ScreenStub from '@/components/ScreenStub';

/* TODO: port from ../paicart-nextjs15 — see MIGRATION.md. */
export default function ${name}(props) {
  return <ScreenStub name="${name}" route={props.route} />;
}
`);
  created++;
});
console.log(`screens: ${created} created, ${kept} already implemented`);
