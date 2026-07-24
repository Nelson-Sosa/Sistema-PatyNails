import { useState, useMemo, useEffect } from 'react'
import { useAppointmentsByDateRange } from './useAppointments'
import { BUSINESS_HOURS, APPOINTMENT_STATUS } from '@/constants/app'

// Helper: Get Monday of a given date's week
function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  return new Date(date.setDate(diff))
}

// Helper: HH:mm to minutes since midnight
function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

// Helper: Minutes since midnight to HH:mm
function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
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

  // Fetch appointments for the current week
  const { data: appointments = [], isLoading, isError } = useAppointmentsByDateRange(
    currentWeekStart,
    currentWeekEnd
  )

  // Calculate availability for each day in the week
  const weekDays = useMemo(() => {
    const days = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const now = new Date() // to check past times today

    const startMinutes = timeToMinutes(BUSINESS_HOURS.START)
    const endMinutes = timeToMinutes(BUSINESS_HOURS.END)
    const step = 15 // 15 minutes increments

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart)
      date.setDate(date.getDate() + i)
      date.setHours(0, 0, 0, 0)

      const isPastDay = date < today
      const isWorkingDay = BUSINESS_HOURS.DAYS.includes(date.getDay())
      const isToday = date.getTime() === today.getTime()
      
      let slots = []

      if (!isPastDay && isWorkingDay) {
        // Filter appointments for this specific day
        const dayAppointments = appointments.filter(apt => {
          if (!apt.date) return false
          const aptDate = apt.date.toDate ? apt.date.toDate() : new Date(apt.date)
          return aptDate.getFullYear() === date.getFullYear() &&
                 aptDate.getMonth() === date.getMonth() &&
                 aptDate.getDate() === date.getDate() &&
                 apt.status !== APPOINTMENT_STATUS.CANCELLED &&
                 apt.status !== APPOINTMENT_STATUS.NO_SHOW
        })

        // Generate slots
        for (let min = startMinutes; min + serviceDuration <= endMinutes; min += step) {
          const slotStart = min
          const slotEnd = min + serviceDuration

          // If it's today, ensure the slot is at least 2 hours from now
          if (isToday) {
            const slotDate = new Date(date)
            slotDate.setHours(Math.floor(slotStart / 60), slotStart % 60, 0, 0)
            const minAllowedTime = new Date(now.getTime() + 2 * 60 * 60 * 1000)
            if (slotDate < minAllowedTime) {
              continue // Skip this slot, it's too soon
            }
          }

          // Check conflict with appointments
          const hasConflict = dayAppointments.some(apt => {
            if (!apt.time) return false
            const aptStart = timeToMinutes(apt.time)
            const aptDuration = Math.min(Number(apt.duration) || 60, 720)
            const aptEnd = aptStart + aptDuration

            // Overlap condition
            return slotStart < aptEnd && slotEnd > aptStart
          })

          if (!hasConflict) {
            slots.push(minutesToTime(slotStart))
          }
        }
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
  }, [currentWeekStart, appointments, serviceDuration])

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
