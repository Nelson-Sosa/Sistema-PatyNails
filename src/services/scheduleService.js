import { APPOINTMENT_STATUS } from '@/constants/app'

const NON_BLOCKING_STATUSES = new Set([
  APPOINTMENT_STATUS.CANCELLED,
  APPOINTMENT_STATUS.NO_SHOW,
])

/**
 * Week day keys indexed by JS Date#getDay() (0 = Sunday ... 6 = Saturday).
 * Used both by the Firestore model (named days) and the availability engine.
 */
export const WEEK_DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6] // Monday to Saturday

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
 * Normalize raw blocks: drop invalid/empty ones and sort by start time.
 * @param {Array} blocks - [{ start: "HH:mm", end: "HH:mm" }, ...]
 * @returns {Array<{start: string, end: string}>}
 */
function normalizeBlocks(blocks) {
  if (!Array.isArray(blocks)) return []
  return blocks
    .filter((b) => b && typeof b.start === 'string' && typeof b.end === 'string' && toMinutes(b.start) < toMinutes(b.end))
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
}

/**
 * Build a fallback weekly schedule from the legacy flat model.
 * Used only when settings lack a weeklySchedule (defensive path).
 * @param {Object} settings
 * @returns {Object} normalized weekly schedule
 */
function buildScheduleFromLegacy(settings = {}) {
  const opening = settings.openingTime ?? settings.openingHour ?? '07:00'
  const closing = settings.closingTime ?? settings.closingHour ?? '19:00'
  const workingDays = Array.isArray(settings.workingDays)
    ? settings.workingDays
    : DEFAULT_WORKING_DAYS

  const result = {}
  WEEK_DAY_KEYS.forEach((key, idx) => {
    const enabled = workingDays.includes(idx)
    result[key] = { enabled, blocks: enabled ? [{ start: opening, end: closing }] : [] }
  })
  return result
}

/**
 * Returns a normalized weekly schedule (all 7 days present) for any settings
 * object — migrated or legacy.
 * @param {Object} settings - business settings (weeklySchedule or legacy fields)
 * @returns {Object} { sunday: { enabled, blocks }, ..., saturday: {...} }
 */
export function getWeeklySchedule(settings = {}) {
  const legacy = settings.weeklySchedule
  if (!legacy || typeof legacy !== 'object') {
    return buildScheduleFromLegacy(settings)
  }

  const result = {}
  WEEK_DAY_KEYS.forEach((key) => {
    const day = legacy[key]
    result[key] = {
      enabled: !!(day && day.enabled),
      blocks: normalizeBlocks(day?.blocks),
    }
  })
  return result
}

/**
 * Returns the schedule for a specific date (JS Date).
 * @param {Object} settings
 * @param {Date} date
 * @returns {{ enabled: boolean, blocks: Array<{start: string, end: string}> }}
 */
export function getDaySchedule(settings, date) {
  const schedule = getWeeklySchedule(settings)
  const idx = date.getDay ? date.getDay() : new Date(date).getDay()
  return schedule[WEEK_DAY_KEYS[idx]]
}

/**
 * Returns the blocks for a specific date.
 * @param {Object} settings
 * @param {Date} date
 * @returns {Array<{start: string, end: string}>}
 */
export function getDayBlocks(settings, date) {
  return getDaySchedule(settings, date).blocks
}

/**
 * Whether the given date is an enabled working day.
 * @param {Object} settings
 * @param {Date} date
 * @returns {boolean}
 */
export function isDayEnabled(settings, date) {
  return getDaySchedule(settings, date).enabled
}

/**
 * Whether a minute value falls inside any block.
 * @param {number} minutes - minutes since midnight
 * @param {Array<{start: string, end: string}>} blocks
 * @returns {boolean}
 */
export function isMinuteInBlocks(minutes, blocks) {
  return blocks.some((b) => {
    const s = toMinutes(b.start)
    const e = toMinutes(b.end)
    return minutes >= s && minutes < e
  })
}

/**
 * Whether an appointment (start + duration) fits entirely inside a single block.
 * @param {number} startMin - appointment start in minutes
 * @param {number} duration - appointment duration in minutes
 * @param {Array<{start: string, end: string}>} blocks
 * @returns {boolean}
 */
export function appointmentFitsInBlocks(startMin, duration, blocks) {
  return blocks.some((b) => {
    const s = toMinutes(b.start)
    const e = toMinutes(b.end)
    return startMin >= s && startMin + duration <= e
  })
}

/**
 * Validates that a service can start at a given date/time according to the
 * weekly blocks. Enforces: day enabled, time inside a block, slot alignment
 * with the interval, and the service fitting entirely within the block.
 *
 * @param {Object} settings - business settings
 * @param {Date} date - appointment date
 * @param {string} startTime - "HH:mm"
 * @param {number} duration - service duration in minutes
 * @returns {{ valid: boolean, reason?: 'CLOSED'|'NOT_ALIGNED'|'DOES_NOT_FIT'|'OUTSIDE_BLOCKS' }}
 */
export function canStartServiceAt(settings, date, startTime, duration) {
  const day = getDaySchedule(settings, date)
  if (!day.enabled || day.blocks.length === 0) {
    return { valid: false, reason: 'CLOSED' }
  }

  const startMin = toMinutes(startTime)
  const safeDuration = Math.max(0, Number(duration) || 0)
  const interval = settings?.slotInterval || 30

  for (const block of day.blocks) {
    const bStart = toMinutes(block.start)
    const bEnd = toMinutes(block.end)
    if (startMin < bStart || startMin >= bEnd) continue
    if ((startMin - bStart) % interval !== 0) return { valid: false, reason: 'NOT_ALIGNED' }
    if (startMin + safeDuration > bEnd) return { valid: false, reason: 'DOES_NOT_FIT' }
    return { valid: true }
  }

  return { valid: false, reason: 'OUTSIDE_BLOCKS' }
}

/**
 * Generates all time slots that START inside the given blocks, aligned to the
 * block start + interval. Slots that would start at (or past) a block end are
 * not generated — pauses between blocks are skipped automatically.
 * @param {Array<{start: string, end: string}>} blocks
 * @param {number} interval - minutes
 * @returns {Array<{start: string, startMin: number}>}
 */
export function generateTimeSlotsFromBlocks(blocks, interval) {
  const slots = []
  for (const block of normalizeBlocks(blocks)) {
    const startMin = toMinutes(block.start)
    const endMin = toMinutes(block.end)
    for (let m = startMin; m < endMin; m += interval) {
      slots.push({ start: minutesToTime(m), startMin: m })
    }
  }
  return slots
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
 * Friendly error message for a `canStartServiceAt` rejection reason.
 * @param {'CLOSED'|'NOT_ALIGNED'|'DOES_NOT_FIT'|'OUTSIDE_BLOCKS'|undefined} reason
 * @returns {string}
 */
export function getScheduleErrorMessage(reason) {
  switch (reason) {
    case 'CLOSED':
      return 'El día seleccionado está cerrado'
    case 'NOT_ALIGNED':
      return 'La hora debe coincidir con el intervalo configurado de la agenda'
    case 'DOES_NOT_FIT':
      return 'El servicio no entra completo dentro del bloque horario seleccionado'
    default:
      return 'El horario seleccionado no está dentro de los bloques de atención'
  }
}

/**
 * Earliest start / latest end (in minutes) for a given day.
 * Returns null when the day is closed.
 * @param {Object} settings
 * @param {Date} date
 * @returns {{ startMin: number, endMin: number } | null}
 */
export function getDayWorkingSpan(settings, date) {
  const blocks = getDayBlocks(settings, date)
  if (blocks.length === 0) return null
  return {
    startMin: toMinutes(blocks[0].start),
    endMin: toMinutes(blocks[blocks.length - 1].end),
  }
}

/**
 * Earliest start / latest end across all enabled days of the week.
 * Returns null when the whole week is closed.
 * @param {Object} settings
 * @returns {{ startMin: number, endMin: number } | null}
 */
export function getWeekWorkingSpan(settings) {
  const schedule = getWeeklySchedule(settings)
  let minStart = null
  let maxEnd = null

  WEEK_DAY_KEYS.forEach((key) => {
    const day = schedule[key]
    if (!day.enabled) return
    for (const block of day.blocks) {
      const s = toMinutes(block.start)
      const e = toMinutes(block.end)
      if (minStart === null || s < minStart) minStart = s
      if (maxEnd === null || e > maxEnd) maxEnd = e
    }
  })

  if (minStart === null) return null
  return { startMin: minStart, endMin: maxEnd }
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
 * Implements the rule that a service of duration D must fit entirely inside one
 * of the day's configured blocks, and must not overlap with any existing
 * appointment. Only slots aligned to the configured interval are generated.
 *
 * @param {Array} dayAppointments - Array of appointments for the specific day
 * @param {number} serviceDuration - Duration of the service in minutes
 * @param {Object} businessSettings - { slotInterval, weeklySchedule | legacy fields }
 * @param {boolean} isToday - If the day being calculated is today
 * @param {Date} now - Current time (used for the 2-hour margin when isToday)
 * @param {Date} date - The calendar date being calculated (defaults to `now`)
 * @returns {Array<string>} Array of available time strings (HH:mm)
 */
export function calculateAvailableSlots(dayAppointments, serviceDuration, businessSettings, isToday, now = new Date(), date = now) {
  const blocks = getDayBlocks(businessSettings, date)
  if (blocks.length === 0) return []

  const interval = businessSettings?.slotInterval || 30
  const availableSlots = []

  // Iterate over each configured block, generating aligned slots that fit the service
  for (const block of blocks) {
    const startMinutes = toMinutes(block.start)
    const endMinutes = toMinutes(block.end)

    for (let min = startMinutes; min + serviceDuration <= endMinutes; min += interval) {
      const slotStart = min
      const slotEnd = min + serviceDuration

      // Validate 1-hour margin for today
      if (isToday) {
        // Slot date/time object for comparison
        const slotDate = new Date(now)
        slotDate.setHours(Math.floor(slotStart / 60), slotStart % 60, 0, 0)

        if (slotDate <= now) {
          continue // Skip this slot, already passed
        }

        const minAllowedTime = new Date(now.getTime() + 1 * 60 * 60 * 1000)
        const blockEndDate = new Date(now)
        blockEndDate.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0)

        if (slotDate < minAllowedTime && minAllowedTime < blockEndDate) {
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
  }

  return availableSlots
}
