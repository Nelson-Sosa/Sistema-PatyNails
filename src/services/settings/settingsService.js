import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS, BENEFITS } from '@/constants/app'
import { toMinutes, minutesToTime, WEEK_DAY_KEYS } from '@/services/scheduleService'

const SETTINGS_DOC_ID = 'salon'
const PAYMENTS_DOC_ID = 'payments'
const BUSINESS_DOC_ID = 'business'

function settingsRef() {
  return doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID)
}

function paymentsSettingsRef() {
  return doc(db, COLLECTIONS.SETTINGS, PAYMENTS_DOC_ID)
}

function businessSettingsRef() {
  return doc(db, COLLECTIONS.SETTINGS, BUSINESS_DOC_ID)
}

export async function getSettings() {
  const snap = await getDoc(settingsRef())
  if (!snap.exists()) return {}
  return snap.data()
}

export async function getBenefitsSettings() {
  const snap = await getDoc(settingsRef())
  if (!snap.exists()) {
    return {
      enabled: true,
      rewardEveryVisits: BENEFITS.DEFAULT_REWARD_EVERY_VISITS,
      rewardType: BENEFITS.REWARD_TYPE,
      rewardDescription: BENEFITS.REWARD_DESCRIPTION,
      showProgress: true,
    }
  }

  const data = snap.data()
  const benefitsProgram = data.loyaltyProgram || {}
  return {
    enabled: benefitsProgram.enabled ?? true,
    rewardEveryVisits: benefitsProgram.rewardEveryVisits ?? BENEFITS.DEFAULT_REWARD_EVERY_VISITS,
    rewardIncrement: benefitsProgram.rewardIncrement ?? BENEFITS.DEFAULT_REWARD_INCREMENT,
    rewardType: benefitsProgram.rewardType ?? BENEFITS.REWARD_TYPE,
    rewardDescription: benefitsProgram.rewardDescription ?? BENEFITS.REWARD_DESCRIPTION,
    showProgress: benefitsProgram.showProgress ?? true,
  }
}

export async function updateSettings(data) {
  const ref = settingsRef()
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
  } else {
    await setDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  }
}

export async function updateBenefitsSettings(config) {
  const ref = settingsRef()
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, {
      loyaltyProgram: config,
      updatedAt: serverTimestamp(),
    })
  } else {
    await setDoc(ref, {
      loyaltyProgram: config,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }
}

// ─── Payment Settings (settings/payments — independent document) ──────────────

/**
 * Default payment settings returned when the document doesn't exist yet.
 */
const DEFAULT_PAYMENT_SETTINGS = {
  enabled: false,
  percentage: 25,
  provider: 'manual_transfer',
  bank: '',
  owner: '',
  accountNumber: '',
  accountAlias: '',
  instructions: '',
  paymentTimeoutMinutes: 30,
}

/**
 * Read payment settings from Firestore (settings/payments).
 * Returns sensible defaults if the document doesn't exist yet.
 * @returns {Promise<Object>}
 */
export async function getPaymentSettings() {
  const snap = await getDoc(paymentsSettingsRef())
  if (!snap.exists()) return { ...DEFAULT_PAYMENT_SETTINGS }
  return { ...DEFAULT_PAYMENT_SETTINGS, ...snap.data() }
}

/**
 * Save payment settings to Firestore (settings/payments).
 * Creates the document if it doesn't exist.
 * @param {Object} config
 */
export async function updatePaymentSettings(config) {
  const ref = paymentsSettingsRef()
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, { ...config, updatedAt: serverTimestamp() })
  } else {
    await setDoc(ref, { ...config, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  }
}

// ─── Business Settings (settings/business — independent document) ──────────────

const DEFAULT_BUSINESS_SETTINGS = {
  openingTime: '07:00',
  closingTime: '19:00',
  slotInterval: 30,
  minimumAppointmentDuration: 30,
  timezone: 'America/Asuncion',
  workingDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday
}

/**
 * Normalize a raw weekly schedule ensuring every day exists.
 * Handles partial schedules (only some days present) by filling the rest
 * with closed days.
 * @param {Object} weeklySchedule - { monday: { enabled, blocks }, ... }
 * @returns {Object} normalized weekly schedule
 */
function normalizeWeeklySchedule(weeklySchedule) {
  const result = {}
  WEEK_DAY_KEYS.forEach((key) => {
    const day = weeklySchedule?.[key]
    const blocks = Array.isArray(day?.blocks)
      ? day.blocks
          .filter(
            (b) =>
              b &&
              typeof b.start === 'string' &&
              typeof b.end === 'string' &&
              toMinutes(b.start) < toMinutes(b.end)
          )
          .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
      : []
    result[key] = {
      enabled: !!day?.enabled && blocks.length > 0,
      blocks,
    }
  })
  return result
}

/**
 * Build a weekly schedule from the legacy flat model
 * ({ openingTime, closingTime, workingDays }).
 * Used as automatic migration when `weeklySchedule` doesn't exist yet,
 * so the admin doesn't have to reconfigure everything.
 * @param {Object} data - legacy settings snapshot
 * @returns {Object} weeklySchedule
 */
function buildWeeklyScheduleFromLegacy(data) {
  const opening = data?.openingTime ?? data?.openingHour ?? '07:00'
  const closing = data?.closingTime ?? data?.closingHour ?? '19:00'
  const workingDays = Array.isArray(data?.workingDays)
    ? data.workingDays
    : [1, 2, 3, 4, 5, 6]

  const result = {}
  WEEK_DAY_KEYS.forEach((key, idx) => {
    const enabled = workingDays.includes(idx)
    result[key] = {
      enabled,
      blocks: enabled ? [{ start: opening, end: closing }] : [],
    }
  })
  return result
}

/**
 * Derive the legacy flat fields (openingTime, closingTime, workingDays) from a
 * weekly schedule so old consumers keep working and the document stays consistent.
 * @param {Object} weeklySchedule
 * @returns {{ openingTime: string, closingTime: string, workingDays: number[] }}
 */
function deriveLegacyFromSchedule(weeklySchedule) {
  let minStart = null
  let maxEnd = null
  const workingDays = []

  WEEK_DAY_KEYS.forEach((key, idx) => {
    const day = weeklySchedule?.[key]
    if (!day?.enabled || !Array.isArray(day.blocks) || day.blocks.length === 0) return
    workingDays.push(idx)
    for (const block of day.blocks) {
      const s = toMinutes(block.start)
      const e = toMinutes(block.end)
      if (minStart === null || s < minStart) minStart = s
      if (maxEnd === null || e > maxEnd) maxEnd = e
    }
  })

  return {
    openingTime: minutesToTime(minStart ?? 7 * 60),
    closingTime: minutesToTime(maxEnd ?? 19 * 60),
    workingDays: workingDays.length ? workingDays : [1, 2, 3, 4, 5, 6],
  }
}

/**
 * Read business settings from Firestore (settings/business).
 * Returns defaults if the document doesn't exist.
 *
 * The returned object always includes a normalized `weeklySchedule` (7 days).
 * If the document only has the legacy flat fields, the schedule is generated
 * automatically from them (migration).
 * @returns {Promise<Object>}
 */
export async function getBusinessSettings() {
  const snap = await getDoc(businessSettingsRef())
  const data = snap.exists() ? snap.data() : {}

  const merged = { ...DEFAULT_BUSINESS_SETTINGS, ...data }

  // Legacy alias support (openingHour/closingHour/interval/minimumDuration)
  if (!merged.openingTime && merged.openingHour) merged.openingTime = merged.openingHour
  if (!merged.closingTime && merged.closingHour) merged.closingTime = merged.closingHour
  if (!merged.slotInterval && merged.interval) merged.slotInterval = merged.interval
  if (!merged.minimumAppointmentDuration && merged.minimumDuration) {
    merged.minimumAppointmentDuration = merged.minimumDuration
  }

  merged.weeklySchedule = normalizeWeeklySchedule(
    data.weeklySchedule || buildWeeklyScheduleFromLegacy(data)
  )

  return merged
}

/**
 * Save business settings to Firestore (settings/business).
 * Keeps the legacy flat fields in sync with the weekly schedule so existing
 * functionality and older documents remain compatible.
 * @param {Object} config
 */
export async function updateBusinessSettings(config) {
  const ref = businessSettingsRef()
  const snap = await getDoc(ref)

  let payload = { ...config }

  if (payload.weeklySchedule) {
    payload.weeklySchedule = normalizeWeeklySchedule(payload.weeklySchedule)
    const derived = deriveLegacyFromSchedule(payload.weeklySchedule)
    payload = {
      ...payload,
      openingTime: derived.openingTime,
      closingTime: derived.closingTime,
      workingDays: derived.workingDays,
    }
  }

  if (snap.exists()) {
    await updateDoc(ref, { ...payload, updatedAt: serverTimestamp() })
  } else {
    await setDoc(ref, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  }
}

