import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCategories,
  getActiveCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  toggleCategoryActive,
  subscribeCategories,
  subscribeActiveCategories,
} from '@/services/serviceCategories/serviceCategoriesService'
import { createRealtimeQuery } from '@/lib/firestoreRealtime'

const QUERY_KEY = 'serviceCategories'

/**
 * Fetch all service categories with realtime updates.
 */
export function useCategories() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: createRealtimeQuery(subscribeCategories),
    refetchOnMount: 'always',
  })
}

/**
 * Fetch only active service categories with realtime updates.
 */
export function useActiveCategories() {
  return useQuery({
    queryKey: [QUERY_KEY, 'active'],
    queryFn: createRealtimeQuery(subscribeActiveCategories),
    refetchOnMount: 'always',
  })
}

export function useCategory(id) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: () => getCategoryById(id),
    enabled: !!id,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => updateCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

export function useToggleCategoryActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }) => toggleCategoryActive(id, active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
