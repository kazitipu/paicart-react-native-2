/* Maps every route name to its component. Kept separate from routes.js so the
   route table stays importable from plain-Node tooling (the stub generator and
   the link checker both read it) without pulling in React. */
import Home from '@/screens/storefront/Home';
import Collection from '@/screens/storefront/Collection';
import Product from '@/screens/storefront/Product';
import Product1688 from '@/screens/storefront/Product1688';
import ProductTaobao from '@/screens/storefront/ProductTaobao';
import TaobaoSearch from '@/screens/storefront/TaobaoSearch';
import Wishlist from '@/screens/storefront/Wishlist';
import Categories from '@/screens/storefront/Categories';

import Cart from '@/screens/cart/Cart';
import PlaceOrder from '@/screens/cart/PlaceOrder';
import LegacyCart from '@/screens/cart/LegacyCart';
import PlaceOrderSuccess from '@/screens/cart/PlaceOrderSuccess';
import OrderSuccess from '@/screens/cart/OrderSuccess';
import OrderSuccessDetail from '@/screens/cart/OrderSuccessDetail';
import LegacyOrderDetail from '@/screens/cart/LegacyOrderDetail';
import LegacyOrderLogistics from '@/screens/cart/LegacyOrderLogistics';

import DashboardOverview from '@/screens/dashboard/DashboardOverview';
import BuyShipMyOrders from '@/screens/dashboard/BuyShipMyOrders';
import BuyShipOrderDetail from '@/screens/dashboard/BuyShipOrderDetail';
import BuyShipMyRequests from '@/screens/dashboard/BuyShipMyRequests';
import BuyShipRequestDetail from '@/screens/dashboard/BuyShipRequestDetail';
import BuyShipDelivered from '@/screens/dashboard/BuyShipDelivered';
import BuyShipForwarding from '@/screens/dashboard/BuyShipForwarding';
import ShipMyRequests from '@/screens/dashboard/ShipMyRequests';
import ShipRequestDetail from '@/screens/dashboard/ShipRequestDetail';
import ShipDelivered from '@/screens/dashboard/ShipDelivered';
import ShipForwarding from '@/screens/dashboard/ShipForwarding';
import ShipmentInvoice from '@/screens/dashboard/ShipmentInvoice';
import OrderInvoice from '@/screens/dashboard/OrderInvoice';
import Refunds from '@/screens/dashboard/Refunds';
import Points from '@/screens/dashboard/Points';
import UserInformation from '@/screens/dashboard/UserInformation';
import UserSecurity from '@/screens/dashboard/UserSecurity';

import ShipForMeForm from '@/screens/services/ShipForMeForm';
import BuyForMe from '@/screens/services/BuyForMe';
import TrackOrder from '@/screens/services/TrackOrder';
import CostCalculator from '@/screens/services/CostCalculator';
import Notices from '@/screens/services/Notices';
import NoticeDetail from '@/screens/services/NoticeDetail';
import More from '@/screens/services/More';
import PaymentReturn from '@/screens/services/PaymentReturn';

import AboutUs from '@/screens/static/AboutUs';
import Contact from '@/screens/static/Contact';
import Faq from '@/screens/static/Faq';
import HowToOrder from '@/screens/static/HowToOrder';
import PrivacyPolicy from '@/screens/static/PrivacyPolicy';
import RefundPolicy from '@/screens/static/RefundPolicy';
import TaxAndShipping from '@/screens/static/TaxAndShipping';
import Terms from '@/screens/static/Terms';

import Login from '@/screens/auth/Login';
import Register from '@/screens/auth/Register';
import ForgotPassword from '@/screens/auth/ForgotPassword';

export const SCREENS = {
  Home, Collection, Product, Product1688, ProductTaobao, TaobaoSearch,
  Wishlist, Categories,

  Cart, PlaceOrder, LegacyCart, PlaceOrderSuccess, OrderSuccess,
  OrderSuccessDetail, LegacyOrderDetail, LegacyOrderLogistics,

  DashboardOverview, BuyShipMyOrders, BuyShipOrderDetail, BuyShipMyRequests,
  BuyShipRequestDetail, BuyShipDelivered, BuyShipForwarding, ShipMyRequests,
  ShipRequestDetail, ShipDelivered, ShipForwarding, ShipmentInvoice,
  OrderInvoice, Refunds, Points, UserInformation, UserSecurity,

  ShipForMeForm, BuyForMe, TrackOrder, CostCalculator, Notices, NoticeDetail,
  More, PaymentReturn,

  AboutUs, Contact, Faq, HowToOrder, PrivacyPolicy, RefundPolicy,
  TaxAndShipping, Terms,

  Login, Register, ForgotPassword,
};
