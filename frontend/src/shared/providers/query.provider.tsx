import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/**
 * Configure TanStack Query defaults:
 *
 * retry: 1 — retry failed requests once before showing error
 * staleTime: 5 minutes — don't refetch data that's less than 5 min old
 * refetchOnWindowFocus: false — don't refetch when user switches tabs
 *   (would cause jarring UI updates and unnecessary API calls)
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}