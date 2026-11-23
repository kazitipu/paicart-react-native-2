import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { subscribeToUserNotifications } from '@/lib/firebaseUtils';

/* The signed-in customer's in-app notifications (admin → customer), live.
 *
 * Each caller opens its own onSnapshot; the Firestore SDK shares identical
 * queries under the hood, so the dashboard bell, the More row and the
 * Notifications screen together cost one listener. Signed out → empty.
 *
 * Returns { items, unreadCount, loading, error, uid }. */
const EMPTY = [];

export default function useNotifications() {
  const uid = useSelector((s) => s.user?.currentUser?.id);
  const [state, setState] = useState({ for: null, items: EMPTY, error: null });

  useEffect(() => {
    if (!uid) return undefined;
    return subscribeToUserNotifications(
      uid,
      (items) => setState({ for: uid, items, error: null }),
      (error) => setState((s) => ({ ...s, for: uid, error })),
    );
  }, [uid]);

  const items = uid && state.for === uid ? state.items : EMPTY;
  const unreadCount = useMemo(() => items.reduce((n, it) => n + (it.read ? 0 : 1), 0), [items]);

  return {
    uid,
    items,
    unreadCount,
    loading: !!uid && state.for !== uid,
    error: uid && state.for === uid ? state.error : null,
  };
}
