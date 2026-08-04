import { hashKey } from '@tanstack/react-query'

/**
 * Registry of active Firestore listeners, keyed by the hashed React Query key.
 * Holds the cleanup function for each realtime query so it can be closed when
 * the last observer unmounts (see attachRealtimeCleanup).
 */
const activeListeners = new Map()

/**
 * Creates a React Query `queryFn` that keeps a Firestore `onSnapshot`
 * subscription alive for as long as the query has active observers.
 *
 * Contract:
 * - The returned promise resolves with the FIRST snapshot, so the existing
 *   `useQuery` flow (isLoading / isError / data) keeps working unchanged.
 * - Every subsequent snapshot is written straight into the React Query cache
 *   via `setQueryData`, updating the UI without refetching or reloading.
 * - Exactly one listener exists per query key: re-running the `queryFn`
 *   (mount, refetch, retry) closes the previous one first, so there are never
 *   duplicate subscriptions.
 * - Listeners are always cleaned up: on abort (StrictMode / cancellation),
 *   on query errors after the first snapshot, and when the last observer
 *   unmounts (via attachRealtimeCleanup).
 *
 * @param {(onNext: (data: any) => void, onError: (error: Error) => void) => () => void} subscribe
 *   Function that starts a Firestore listener and returns its unsubscribe.
 */
export function createRealtimeQuery(subscribe) {
  return async ({ queryKey, client, signal }) => {
    const cacheKey = hashKey(queryKey)
    let firstRun = true
    let unsubscribe = null
    let cleanup = null

    // Close any listener left over from a previous run of this queryFn
    // (e.g. a refetch or retry) so we never stack subscriptions.
    const previous = activeListeners.get(cacheKey)
    if (previous) previous()

    const data = await new Promise((resolve, reject) => {
      cleanup = () => {
        signal?.removeEventListener('abort', cleanup)
        if (activeListeners.get(cacheKey) === cleanup) {
          activeListeners.delete(cacheKey)
        }
        if (unsubscribe) {
          unsubscribe()
          unsubscribe = null
        }
      }

      signal?.addEventListener('abort', cleanup, { once: true })

      unsubscribe = subscribe(
        (nextData) => {
          if (firstRun) {
            if (signal?.aborted) {
              cleanup()
              return
            }
            firstRun = false
            activeListeners.set(cacheKey, cleanup)
            resolve(nextData)
          } else {
            client.setQueryData(queryKey, nextData)
          }
        },
        (error) => {
          if (firstRun) {
            firstRun = false
            signal?.removeEventListener('abort', cleanup)
            reject(error)
          } else {
            // The listener died after delivering data: drop the stale cache
            // entry so React Query refetches (and re-subscribes) it.
            client.invalidateQueries({ queryKey })
          }
        }
      )
    })

    return data
  }
}

/**
 * Closes Firestore listeners when the last observer of a realtime query
 * unmounts. Call this once, right after creating the QueryClient.
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 */
export function attachRealtimeCleanup(queryClient) {
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'observerRemoved' && event.query.getObserversCount() === 0) {
      const cleanup = activeListeners.get(hashKey(event.query.queryKey))
      if (cleanup) cleanup()
    }
  })
}
