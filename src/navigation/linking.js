/* Deep linking.
 *
 * Every screen's `path` in routes.js is the original paicart.com URL, so links
 * already in the wild — order confirmation emails, OTP SMS, links from the
 * admin panel — open the right screen instead of bouncing to the store page.
 *
 * React Navigation resolves paths against the nested navigator shape, so each
 * screen's config is nested under the tab that owns it.
 */
import { getStateFromPath as defaultGetStateFromPath } from '@react-navigation/native';
import { ROUTES, REDIRECTS } from './routes';

const PREFIXES = ['paicart://', 'https://paicart.com', 'https://www.paicart.com'];

function buildScreens() {
  const tabs = {};
  const root = {};

  Object.entries(ROUTES).forEach(([name, cfg]) => {
    if (!cfg.tab) {
      root[name] = cfg.path;
      return;
    }
    if (!tabs[cfg.tab]) tabs[cfg.tab] = { screens: {} };
    tabs[cfg.tab].screens[name] = cfg.path;
  });

  return { ...root, Tabs: { screens: tabs } };
}

/* A linking config binds exactly one path per screen, so a route that used to
   redirect cannot simply be listed alongside its destination. Rewriting the
   path up front keeps those old links working without inventing screen names
   that no navigator declares. */
function applyRedirects(path) {
  const [pathname, search = ''] = String(path).split('?');
  const trimmed = pathname.replace(/\/+$/, '') || '/';
  const target = REDIRECTS[trimmed];
  if (!target) return path;
  return search ? `${target}?${search}` : target;
}

const linking = {
  prefixes: PREFIXES,
  getStateFromPath: (path, options) =>
    defaultGetStateFromPath(applyRedirects(path), options),
  config: {
    initialRouteName: 'Tabs',
    screens: buildScreens(),
  },
};

export default linking;
