/**
 * useWorks — React Query hooks for the `works` collection.
 * Follows the same architecture as useAppointments.js and useServices.js.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  subscribeAllWorks,
  subscribePublishedWorks,
  subscribeWorksByClient,
  createWork,
  updateWork,
  toggleWorkPublished,
  deleteWork,
} from '@/services/works/worksService'
import { createRealtimeQuery } from '@/lib/firestoreRealtime'

export const WORKS_QUERY_KEY = 'works'

/**
 * Fetch ALL works (admin panel).
 */
export function useWorks() {
  return useQuery({
    queryKey: [WORKS_QUERY_KEY, 'all'],
    queryFn: createRealtimeQuery(subscribeAllWorks),
    refetchOnMount: 'always',
  })
}

/**
 * Fetch only published works (public gallery).
 */
export function usePublishedWorks() {
  return useQuery({
    queryKey: [WORKS_QUERY_KEY, 'published'],
    queryFn: createRealtimeQuery(subscribePublishedWorks),
    refetchOnMount: 'always',
  })
}

/**
 * Fetch works for a specific client (profile view).
 * @param {string} clientId
 */
export function useClientWorks(clientId) {
  return useQuery({
    queryKey: [WORKS_QUERY_KEY, 'byClient', clientId],
    queryFn: createRealtimeQuery((onNext, onError) => subscribeWorksByClient(clientId, onNext, onError)),
    enabled: !!clientId,
    refetchOnMount: 'always',
  })
}

/**
 * Mutation: create a new work.
 * Invalidates all works queries on success.
 */
export function useCreateWork() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createWork,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WORKS_QUERY_KEY] })
    },
  })
}

/**
 * Mutation: update a work's details (title, description).
 */
export function useUpdateWork() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => updateWork(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WORKS_QUERY_KEY] })
    },
  })
}

/**
 * Mutation: toggle published state of a work.
 */
export function useToggleWorkPublished() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, published }) => toggleWorkPublished(id, published),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WORKS_QUERY_KEY] })
    },
  })
}

/**
 * Mutation: delete a work document (Firestore only).
 * Images in Cloudinary are NOT deleted (requires Cloud Functions).
 */
export function useDeleteWork() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => deleteWork(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [WORKS_QUERY_KEY] })
    },
  })
}
