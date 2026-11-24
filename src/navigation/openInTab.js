import { CommonActions } from '@react-navigation/native';
import { navigationRef } from './navigationRef';

/* ─── Open a screen of ANOTHER tab as a fresh page ───
 * navigate(TABS.MORE, { screen }) pushes onto whatever the More stack still
 * holds. Home → Product Request → breadcrumb Home (goHome only resets the
 * Home stack) → Ship For Me left the stack [Product Request, Ship For Me],
 * so Back went to Product Request instead of Home.
 *
 * This resets the target tab's stack to just `screen`, then switches to the
 * tab — Back from it then pops out of the tab, and the tab navigator's
 * backBehavior="initialRoute" returns to Home. */
export function openInTab(tab, screen, params) {
  if (!navigationRef.isReady()) return;
  const root = navigationRef.getRootState();
  const tabsRoute = root?.routes?.find((r) => r.name === 'Tabs');
  const stack = tabsRoute?.state?.routes?.find((r) => r.name === tab)?.state;

  if (stack?.key) {
    /* tab already mounted — replace its stack, then just focus the tab */
    navigationRef.dispatch({
      ...CommonActions.reset({ index: 0, routes: [{ name: screen, params }] }),
      target: stack.key,
    });
    navigationRef.navigate('Tabs', { screen: tab });
  } else {
    /* not mounted yet — the nested screen becomes the stack's only route */
    navigationRef.navigate('Tabs', { screen: tab, params: { screen, params } });
  }
}
