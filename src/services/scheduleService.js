import { APPOINTMENT_STATUS } from '@/constants/app'

const NON_BLOCKING_STATUSES = new Set([
  APPOINTMENT_STATUS.CANCELLED,
  APPOINTMENT_STATUS.NO_SHOW,
])

/**
 * Converts HH:mm string to minutes since midnight
 * @param {string} timeStr - Time in HH:mm format
 * @returns {number} minutes since midnight
 */
export function toMinutes(timeStr) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

/**
 * Converts minutes since midnight to HH:mm string
 * @param {number} minutes 
 * @returns {string} Time in HH:mm format
 */
export function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Generates all time slots between start and end with the given interval.
 * @param {string} start - HH:mm
 * @param {string} end - HH:mm
 * @param {number} interval - minutes
 * @returns {Array<{start: string, startMin: number}>}
 */
export function generateTimeSlots(start, end, interval) {
  const slots = []
  const startMin = toMinutes(start)
  const endMin = toMinutes(end)
  for (let m = startMin; m <= endMin; m += interval) {
    slots.push({
      start: minutesToTime(m),
      startMin: m
    })
  }
  return slots
}

/**
 * Checks if a given appointment occupies a specific time slot block.
 * @param {Object} appointment - The appointment object
 * @param {number} slotStartMin - Start of block in minutes
 * @param {number} slotEndMin - End of block in minutes
 * @returns {boolean} true if occupied
 */
export function isSlotOccupied(appointment, slotStartMin, slotEndMin) {
  if (!appointment.time || appointment.duration == null) return false
  if (NON_BLOCKING_STATUSES.has(appointment.status)) return false

  const aptStart = toMinutes(appointment.time)
  const safeDuration = Math.min(Number(appointment.duration) || 60, 720)
  const aptEnd = aptStart + safeDuration

  // Overlap condition: start of slot is before end of apt, and end of slot is after start of apt
  return slotStartMin < aptEnd && slotEndMin > aptStart
}

/**
 * Calculates available time slots for a single day.
 * Implements the rule that a service of duration D must fit entirely 
 * before the closing time, and must not overlap with any existing appointments.
 * @param {Array} dayAppointments - Array of appointments for the specific day
 * @param {number} serviceDuration - Duration of the service in minutes
 * @param {Object} businessSettings - { openingTime, closingTime, slotInterval }
 * @param {boolean} isToday - If the day being calculated is today
 * @param {Date} now - Current time
 * @returns {Array<string>} Array of available time strings (HH:mm)
 */
export function calculateAvailableSlots(dayAppointments, serviceDuration, businessSettings, isToday, now = new Date()) {
  const { openingTime, closingTime, slotInterval } = businessSettings
  
  const startMinutes = toMinutes(openingTime)
  const endMinutes = toMinutes(closingTime)
  
  const availableSlots = []

  // Iterate over every potential start block
  for (let min = startMinutes; min + serviceDuration <= endMinutes; min += slotInterval) {
    const slotStart = min
    const slotEnd = min + serviceDuration

    // Validate 2-hour margin for today
    if (isToday) {
      // Slot date/time object for comparison
      const slotDate = new Date(now)
      slotDate.setHours(Math.floor(slotStart / 60), slotStart % 60, 0, 0)
      
      const minAllowedTime = new Date(now.getTime() + 2 * 60 * 60 * 1000)
      if (slotDate < minAllowedTime) {
        continue // Skip this slot, too soon
      }
    }

    // Check conflict with appointments
    const hasConflict = dayAppointments.some(apt => {
      return isSlotOccupied(apt, slotStart, slotEnd)
    })

    if (!hasConflict) {
      availableSlots.push(minutesToTime(slotStart))
    }
  }

  return availableSlots
}
