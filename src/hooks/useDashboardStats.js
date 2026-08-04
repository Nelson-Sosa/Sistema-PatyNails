import { useState, useEffect, useMemo } from 'react'
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { useAppointmentsByDateRange } from './useAppointments'
import { useClients } from './useClients'
import { APPOINTMENT_STATUS } from '@/constants/app'

/**
 * Hook to calculate Dashboard KPIs for the current day and month.
 *
 * Derives the statistics from the realtime appointment and client queries, so
 * every KPI updates live whenever an appointment or client changes — no page
 * reload or polling needed.
 */
export function useDashboardStats() {
  const dates = useMemo(() => {
    const now = new Date()
    return {
      todayStart: startOfDay(now),
      todayEnd: endOfDay(now),
      monthStart: startOfMonth(now),
      monthEnd: endOfMonth(now),
    }
  }, [])

  // Current time as "HH:mm", refreshed once a minute so the "next appointment"
  // cutoff stays current without refetching from Firestore.
  const [nowTimeStr, setNowTimeStr] = useState(() => new Date().toTimeString().substring(0, 5))
  useEffect(() => {
    const id = setInterval(() => {
      setNowTimeStr(new Date().toTimeString().substring(0, 5))
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  const todayQuery = useAppointmentsByDateRange(dates.todayStart, dates.todayEnd)
  const monthQuery = useAppointmentsByDateRange(dates.monthStart, dates.monthEnd)
  const clientsQuery = useClients()

  const data = useMemo(() => {
    const todayAppointments = todayQuery.data ?? []
    const monthAppointments = monthQuery.data ?? []
    const allClients = clientsQuery.data ?? []

    // 2. Today's income from 'done' appointments
    const todayIncomeAmount = todayAppointments
      .filter((a) => a.status === APPOINTMENT_STATUS.DONE)
      .reduce((sum, a) => sum + (Number(a.price) || 0), 0)

    // 3. Next appointment
    const pendingAppointments = todayAppointments
      .filter(
        (a) =>
          a.status === APPOINTMENT_STATUS.PENDING ||
          a.status === APPOINTMENT_STATUS.CONFIRMED ||
          a.status === APPOINTMENT_STATUS.IN_PROGRESS
      )
      .filter((a) => a.time >= nowTimeStr)
      .sort((a, b) => a.time.localeCompare(b.time))

    const nextAppointment = pendingAppointments.length > 0 ? pendingAppointments[0] : null

    // 4. Clients attended today
    const clientsAttendedToday = todayAppointments.filter(
      (a) => a.status === APPOINTMENT_STATUS.DONE
    ).length

    // 5. Month's appointments + income
    const monthIncomeAmount = monthAppointments
      .filter((a) => a.status === APPOINTMENT_STATUS.DONE)
      .reduce((sum, a) => sum + (Number(a.price) || 0), 0)

    // 6. Top services this month
    const serviceCounts = {}
    monthAppointments
      .filter((a) => a.status === APPOINTMENT_STATUS.DONE)
      .forEach((a) => {
        const name = a.serviceName || 'Sin servicio'
        serviceCounts[name] = (serviceCounts[name] || 0) + 1
      })
    const topServices = Object.entries(serviceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }))

    // 7. Client stats
    const totalClients = allClients.length
    const newClientsThisMonth = allClients.filter((c) => {
      if (!c.createdAt) return false
      const d = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt)
      return d >= dates.monthStart && d <= dates.monthEnd
    }).length

    return {
      todayAppointmentsCount: todayAppointments.length,
      todayIncome: todayIncomeAmount,
      monthIncome: monthIncomeAmount,
      nextAppointment,
      clientsAttendedToday,
      totalClients,
      newClientsThisMonth,
      topServices,
      todayAppointmentsList: todayAppointments,
    }
  }, [todayQuery.data, monthQuery.data, clientsQuery.data, dates, nowTimeStr])

  return {
    data,
    isLoading: todayQuery.isLoading || monthQuery.isLoading || clientsQuery.isLoading,
    isError: todayQuery.isError || monthQuery.isError || clientsQuery.isError,
  }
}
