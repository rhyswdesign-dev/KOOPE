/**
 * useCartSync
 *
 * Calls syncFromServer when the authenticated user changes, so the
 * Zustand shopping cart loads cross-device data on login.
 * Mount this once inside the auth provider tree (e.g. RootNavigator).
 */

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useShoppingCart } from '../store/useShoppingCart';

export function useCartSync() {
  const { user } = useAuth();
  const syncFromServer = useShoppingCart(state => state.syncFromServer);

  useEffect(() => {
    if (user?.id) {
      syncFromServer();
    }
  }, [user?.id]);
}
