import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBusinessSettings, updateBusinessSettings } from '@/services/settings/settingsService'

const SETTINGS_QUERY_KEY = ['businessSettings']

/**
 * Hook to fetch and update the business settings globally.
 */
export function useBusinessSettings() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: getBusinessSettings,
    staleTime: 1000 * 60 * 60, // 1 hour (rarely changes)
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
