import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  subscribeServices,
  subscribeAllServices,
  subscribeService,
  subscribeServicesByCategory,
  createService,
  updateService,
  toggleServiceActive,
  deleteService,
} from '@/services/services/servicesService'
import { createRealtimeQuery } from '@/lib/firestoreRealtime'

const QUERY_KEY = 'services'

/**
 * Fetch all active services (public catalog).
 */
export function useServices() {
  return useQuery({
    queryKey: [QUERY_KEY, 'active'],
    queryFn: createRealtimeQuery(subscribeServices),
    refetchOnMount: 'always',
  })
}

/**
 * Fetch all services including inactive ones (admin use).
 */
export function useAllServices() {
  return useQuery({
    queryKey: [QUERY_KEY, 'all'],
    queryFn: createRealtimeQuery(subscribeAllServices),
    refetchOnMount: 'always',
  })
}

/**
 * Fetch a single service by ID.
 * @param {string} serviceId
 */
export function useService(serviceId) {
  return useQuery({
    queryKey: [QUERY_KEY, serviceId],
    queryFn: createRealtimeQuery((onNext, onError) => subscribeService(serviceId, onNext, onError)),
    enabled: !!serviceId,
    refetchOnMount: 'always',
  })
}

/**
 * Mutation: create a new service.
 */
export function useCreateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createService,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

/**
 * Mutation: update a service.
 */
export function useUpdateService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => updateService(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

/**
 * Mutation: toggle service active state.
 */
export function useToggleServiceActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }) => toggleServiceActive(id, active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

/**
 * Mutation: delete a service. Admin only.
 */
export function useDeleteService() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => deleteService(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

/**
 * Fetch active services for a specific category.
 * @param {string} categoryId
 */
export function useServicesByCategory(categoryId) {
  return useQuery({
    queryKey: [QUERY_KEY, 'byCategory', categoryId],
    queryFn: createRealtimeQuery((onNext, onError) => subscribeServicesByCategory(categoryId, onNext, onError)),
    enabled: !!categoryId,
    refetchOnMount: 'always',
  })
}
