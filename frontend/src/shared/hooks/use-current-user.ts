import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { authApi } from '../../modules/auth/api/auth.api';
import { useAuthStore } from '../stores/auth.store';

export function useCurrentUser() {
  const { isAuthenticated, setUser } = useAuthStore();

  const query = useQuery({
    queryKey: ['currentUser'],
    queryFn: authApi.getMe,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (query.data) {
      setUser(query.data);
    }
  }, [query.data, setUser]);

  return query;
}