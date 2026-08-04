import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscribeBusinessSettings, updateBusinessSettings } from '@/services/settings/settingsService'
import { createRealtimeQuery } from '@/lib/firestoreRealtime'

const SETTINGS_QUERY_KEY = ['businessSettings']

/**
 * Hook to fetch and update the business settings globally.
 */
export function useBusinessSettings() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: createRealtimeQuery(subscribeBusinessSettings),
    refetchOnMount: 'always',
  })

  const mutation = useMutation({
    mutationFn: updateBusinessSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY })
    },
  })

  return {
    settings: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    updateSettings: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  }
}
