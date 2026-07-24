import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAppointmentsByDate,
  getAppointmentsByDateRange,
  createAppointment,
  updateAppointmentStatus,
  cancelAppointment,
  getAppointmentsByClient,
  updateAppointmentDetails,
  submitPaymentProof,
  replacePaymentProof,
  approvePayment,
  rejectPayment,
} from '@/services/appointments/appointmentsService'

const QUERY_KEY = 'appointments'

/**
 * Fetch all appointments for a given date.
 * @param {Date} date
 */
export function useAppointmentsByDate(date) {
  return useQuery({
    queryKey: [QUERY_KEY, 'byDate', date?.toDateString()],
    queryFn: () => getAppointmentsByDate(date),
    enabled: !!date,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

/**
 * Fetch today's appointments.
 */
export function useAppointmentsToday() {
  return useAppointmentsByDate(new Date())
}

/**
 * Fetch appointments within a date range (inclusive).
 * @param {Date} start
 * @param {Date} end
 */
export function useAppointmentsByDateRange(start, end) {
  return useQuery({
    queryKey: [QUERY_KEY, 'byDateRange', start?.toDateString(), end?.toDateString()],
    queryFn: () => getAppointmentsByDateRange(start, end),
    enabled: !!start && !!end,
    staleTime: 1000 * 60 * 2,
  })
}

/**
 * Fetch all appointments for a specific client.
 * @param {string} clientId
 */
export function useAppointmentsByClient(clientId) {
  return useQuery({
    queryKey: [QUERY_KEY, 'byClient', clientId],
    queryFn: () => getAppointmentsByClient(clientId),
    enabled: !!clientId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Mutation: create a new appointment.
 */
export function useCreateAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
  })
}

/**
 * Mutation: update the status of an appointment.
 * Automatically triggers income creation if status === 'done'.
 */
export function useUpdateAppointmentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => updateAppointmentStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
  })
}

/**
 * Mutation: update appointment details (date, time, service).
 */
export function useUpdateAppointmentDetails() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => updateAppointmentDetails(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
  })
}

/**
 * Mutation: cancel an appointment.
 */
export function useCancelAppointment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => cancelAppointment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
  })
}

// ─── Payment (Seña) Mutations ─────────────────────────────────────────────────

/**
 * Mutation: submit a new payment proof (first upload).
 */
export function useSubmitPaymentProof() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, proof }) => submitPaymentProof(id, proof),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

/**
 * Mutation: replace a rejected proof with a new image.
 */
export function useReplacePaymentProof() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, proof }) => replacePaymentProof(id, proof),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}

/**
 * Mutation: admin approves a payment proof.
 * Automatically transitions appointment.status → confirmed.
 */
export function useApprovePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, adminUid }) => approvePayment(id, adminUid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
    },
  })
}

/**
 * Mutation: admin rejects a payment proof with a reason.
 */
export function useRejectPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, adminUid, reason }) => rejectPayment(id, adminUid, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEY] })
    },
  })
}
