/* Call this when a product is added to cart or wishlist.
 *
 * The web version measured the tapped element with getBoundingClientRect() and
 * announced the flight on a DOM CustomEvent. React Native has neither, so the
 * caller measures its own node (measureInWindow is async and only the caller
 * holds the ref) and the announcement goes over the app event bus.
 *
 *   imgUrl  — product image to animate
 *   rect    — { x, y, width, height } in window coords, from measureInWindow
 *   target  — 'cart' | 'wishlist'
 */
import { emit, EVENTS } from './events';

export function flyToIcon(imgUrl, rect, target = 'cart') {
  emit(EVENTS.FLY_TO_ICON, { imgUrl, rect: rect ?? null, target });
}

/* Convenience for the common case: hand it a ref to the tapped view and it
   does the measuring. Silently does nothing if the node has gone away, which
   is the right behaviour for a purely decorative animation. */
export function flyToIconFromRef(imgUrl, ref, target = 'cart') {
  const node = ref?.current;
  if (!node?.measureInWindow) {
    flyToIcon(imgUrl, null, target);
    return;
  }
  node.measureInWindow((x, y, width, height) => {
    flyToIcon(imgUrl, { x, y, width, height }, target);
  });
}

/* Landing spots published by whatever is currently showing the cart/wishlist
   icons (the Home header, like the web's #header-cart-btn). The animation
   falls back to the tab bar when nothing has registered. The owner must clear
   its entry when it loses focus, or flights from other screens would land on
   a header that is no longer visible. */
const flyTargets = {};
export const setFlyTarget = (target, point) => {
  if (point) flyTargets[target] = point;
  else delete flyTargets[target];
};
export const getFlyTarget = (target) => flyTargets[target] || null;
