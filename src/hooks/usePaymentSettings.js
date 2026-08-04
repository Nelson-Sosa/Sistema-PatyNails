import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscribePaymentSettings, updatePaymentSettings } from '@/services/settings/settingsService'
import { createRealtimeQuery } from '@/lib/firestoreRealtime'

const QUERY_KEY = ['settings', 'payments']

/**
 * Read payment settings from Firestore (settings/payments).
 * Returns defaults if the document doesn't exist yet.
 */
export function usePaymentSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: createRealtimeQuery(subscribePaymentSettings),
    refetchOnMount: 'always',
  })
}

/**
 * Mutation: save payment settings to Firestore (settings/payments).
 * Automatically invalidates the query cache.
 */
export function useUpdatePaymentSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updatePaymentSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
