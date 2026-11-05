import { CommonActions } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import { TABS } from './routes';

/* ─── "Go to Home", the same everywhere ───
 * The logo, breadcrumbs and "Back to Home" buttons used
 * navigate(HomeTab, { screen: 'Home' }). In React Navigation 7 that PUSHES a
 * new Home onto the Home stack, leaving whatever was open underneath alive —
 * e.g. a product page still holding the quantities you picked, which came
 * back when you returned to it, and a stack that grew on every visit.
 *
 * This does what a Home tab press does (see TabBar): close anything stacked
 * above the tabs (Login, checkout pages), reset the Home stack to just Home,
 * and switch to the Home tab. */
export function goHome() {
  if (!navigationRef.isReady()) return;
  const root = navigationRef.getRootState();
  const tabsRoute = root?.routes?.find((r) => r.name === 'Tabs');

  /* Root-stack screens sit above the tabs — pop back down to them. */
  if (tabsRoute && root.routes[root.index]?.name !== 'Tabs') {
    navigationRef.dispatch({ ...CommonActions.navigate({ name: 'Tabs', pop: true }), target: root.key });
  }

  const tabsState = tabsRoute?.state;
  const homeStack = tabsState?.routes?.find((r) => r.name === TABS.HOME)?.state;
  const atHome = !homeStack || (homeStack.routes?.length === 1 && homeStack.routes[0]?.name === 'Home');
  if (homeStack?.key && !atHome) {
    navigationRef.dispatch({
      ...CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }),
      target: homeStack.key,
    });
  }
  navigationRef.navigate('Tabs', { screen: TABS.HOME });
}
