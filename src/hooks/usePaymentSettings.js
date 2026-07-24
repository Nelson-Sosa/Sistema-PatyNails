import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPaymentSettings, updatePaymentSettings } from '@/services/settings/settingsService'

const QUERY_KEY = ['settings', 'payments']

/**
 * Read payment settings from Firestore (settings/payments).
 * Returns defaults if the document doesn't exist yet.
 */
export function usePaymentSettings() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getPaymentSettings,
    staleTime: 1000 * 60 * 5, // 5 minutes — settings change infrequently
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
