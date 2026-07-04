import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { authApi } from '../../modules/auth/api/auth.api';
import { useAuthStore } from '../stores/auth.store';

/**
 * Fetches the current user profile and populates the auth store.
 * Only runs when authenticated — skipped for guests.
 */
export function useCurrentUser() {
  const { isAuthenticated, setUser } = useAuthStore();

  const query = useQuery({
    queryKey: ['currentUser'],
    queryFn: authApi.getMe,
    enabled: isAuthenticated, // only fetch if logged in
  });

  useEffect(() => {
    if (query.data) {
      setUser(query.data);
    }
  }, [query.data, setUser]);

  return query;
}