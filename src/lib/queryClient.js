import { QueryClient, MutationCache } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { attachRealtimeCleanup } from '@/lib/firestoreRealtime'

/**
 * Global TanStack Query client configuration.
 *
 * Defaults:
 * - staleTime: 5 minutes — data is considered fresh for 5 min after fetching
 * - gcTime: 10 minutes — unused cache entries are removed after 10 min
 * - retry: 2 — failed queries retry 2 times before triggering error state
 * - refetchOnWindowFocus: false — prevents unexpected refetches on tab focus
 *
 * Realtime Firestore queries (see src/lib/firestoreRealtime.js) are wired to
 * close their onSnapshot listeners when the last observer unmounts.
 *
 * Global error handler: shows a toast notification for all query errors
 * that haven't been handled locally (using meta.suppressToast).
 */
export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Allow individual mutations to suppress global error toast
      if (mutation.meta?.suppressToast) return
      toast.error(error?.message || 'Ocurrió un error inesperado')
    },
  }),
  defaultOptions: {
    queries: {
      // staleTime 0: every query is considered stale immediately, so React Query
      // always re-runs the queryFn on mount. This is essential for realtime queries
      // built with createRealtimeQuery — it ensures the Firestore onSnapshot listener
      // is (re-)started whenever a component mounts, instead of serving stale cache
      // data from a previous session or tab.
      staleTime: 0,
      gcTime: 1000 * 60 * 10,     // 10 minutes — keep unused cache for quick back-nav
      retry: 2,
      // Keep false: realtime listeners push updates to the cache automatically,
      // so a window-focus refetch would only create a redundant duplicate listener.
      refetchOnWindowFocus: false,
    },
  },
})

// Close Firestore listeners when the last observer of a realtime query unmounts.
attachRealtimeCleanup(queryClient)
