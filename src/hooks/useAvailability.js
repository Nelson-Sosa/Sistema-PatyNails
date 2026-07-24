import { useState, useMemo, useEffect } from 'react'
import { useAppointmentsByDateRange } from './useAppointments'
import { APPOINTMENT_STATUS } from '@/constants/app'
import { useBusinessSettings } from './useBusinessSettings'
import { calculateAvailableSlots } from '@/services/scheduleService'

// Helper: Get Monday of a given date's week
function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  return new Date(date.setDate(diff))
}

/**
 * Hook to manage availability calendar state and calculations.
 * @param {number} serviceDuration - Duration of the service in minutes
 */
export function useAvailability(serviceDuration = 60) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return getMonday(today)
  })
  
  const [selectedDate, setSelectedDate] = useState(null)

  const currentWeekEnd = useMemo(() => {
    const end = new Date(currentWeekStart)
    end.setDate(end.getDate() + 6)
    end.setHours(23, 59, 59, 999)
    return end
  }, [currentWeekStart])

  // Fetch business settings
  const { settings: businessSettings, isLoading: isLoadingSettings } = useBusinessSettings()

  // Fetch appointments for the current week
  const { data: appointments = [], isLoading: isLoadingAppointments, isError } = useAppointmentsByDateRange(
    currentWeekStart,
    currentWeekEnd
  )

  const isLoading = isLoadingSettings || isLoadingAppointments

  // Calculate availability for each day in the week
  const weekDays = useMemo(() => {
    if (!businessSettings) return []

    const days = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const now = new Date() // to check past times today

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart)
      date.setDate(date.getDate() + i)
      date.setHours(0, 0, 0, 0)

      const isPastDay = date < today
      const isWorkingDay = businessSettings.workingDays?.includes(date.getDay()) ?? [1, 2, 3, 4, 5, 6].includes(date.getDay())
      const isToday = date.getTime() === today.getTime()
      
      let slots = []

      if (!isPastDay && isWorkingDay) {
        // Filter appointments for this specific day
        const dayAppointments = appointments.filter(apt => {
          if (!apt.date) return false
          const aptDate = apt.date.toDate ? apt.date.toDate() : new Date(apt.date)
          return aptDate.getFullYear() === date.getFullYear() &&
                 aptDate.getMonth() === date.getMonth() &&
                 aptDate.getDate() === date.getDate()
        })

        slots = calculateAvailableSlots(dayAppointments, serviceDuration, businessSettings, isToday, now)
      }

      days.push({
        date,
        isPast: isPastDay,
        isWorkingDay,
        slots,
        availableCount: slots.length,
        isFull: !isPastDay && isWorkingDay && slots.length === 0,
        isFew: !isPastDay && isWorkingDay && slots.length > 0 && slots.length < 3,
        isAvailable: slots.length > 0
      })
    }
    
    return days
  }, [currentWeekStart, appointments, serviceDuration, businessSettings])

  // Auto-select first available day when week changes or loaded
  useEffect(() => {
    if (!isLoading && weekDays.length > 0) {
      // If we don't have a selected date, or the selected date is not in the current week
      const isSelectedInWeek = selectedDate && weekDays.some(d => d.date.getTime() === selectedDate.getTime())
      
      if (!isSelectedInWeek) {
        const firstAvailable = weekDays.find(d => d.isAvailable)
        if (firstAvailable) {
          setSelectedDate(firstAvailable.date)
        } else {
          setSelectedDate(null)
        }
      }
    }
  }, [weekDays, isLoading, selectedDate])

  const nextWeek = () => {
    const next = new Date(currentWeekStart)
    next.setDate(next.getDate() + 7)
    setCurrentWeekStart(next)
    setSelectedDate(null) // clear selection on week change to trigger auto-select
  }

  const prevWeek = () => {
    const prev = new Date(currentWeekStart)
    prev.setDate(prev.getDate() - 7)
    
    // Don't allow navigating to weeks completely in the past
    const today = new Date()
    today.setHours(0,0,0,0)
    const currentMonday = getMonday(today)
    
    if (prev >= currentMonday) {
      setCurrentWeekStart(prev)
      setSelectedDate(null)
    }
  }

  const selectedDayInfo = useMemo(() => {
    if (!selectedDate) return null
    return weekDays.find(d => d.date.getTime() === selectedDate.getTime()) || null
  }, [selectedDate, weekDays])

  return {
    currentWeekStart,
    currentWeekEnd,
    weekDays,
    selectedDate,
    setSelectedDate,
    selectedDayInfo,
    nextWeek,
    prevWeek,
    isLoading,
    isError,
    canGoPrevWeek: currentWeekStart > getMonday(new Date())
  }
}
