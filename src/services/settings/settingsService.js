import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS, BENEFITS, LOYALTY } from '@/constants/app'
import { getRewardLabel } from '@/utils/loyalty'
import { toMinutes, minutesToTime, WEEK_DAY_KEYS } from '@/services/scheduleService'

const SETTINGS_DOC_ID = 'salon'
const PAYMENTS_DOC_ID = 'payments'
const BUSINESS_DOC_ID = 'business'

/**
 * Default loyalty program configuration.
 * The normalized shape exposed by `mapBenefitsSettings` always includes both the
 * new configurable fields (accumulation, condition, benefit, repeat, validity)
 * and legacy aliases (rewardEveryVisits, rewardIncrement, rewardType,
 * rewardDescription) so existing consumers keep working unchanged.
 */
export const DEFAULT_LOYALTY_PROGRAM = {
  enabled: true,
  accumulation: LOYALTY.ACCUMULATION.VISITS,
  condition: LOYALTY.DEFAULT_CONDITION,
  benefit: {
    type: LOYALTY.BENEFIT.DISCOUNT,
    discountPercent: LOYALTY.DEFAULT_DISCOUNT_PERCENT,
    freeServiceId: LOYALTY.FREE_SERVICE_ANY,
    freeServiceName: '',
  },
  repeat: false,
  validity: {
    enabled: false,
    days: LOYALTY.DEFAULT_VALIDITY_DAYS,
  },
  showProgress: true,
}

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
    return mapBenefitsSettings({ loyaltyProgram: DEFAULT_LOYALTY_PROGRAM })
  }

  return mapBenefitsSettings(snap.data())
}

/**
 * Map the settings document to the benefits settings shape (with defaults).
 *
 * Reads the configurable loyalty program (accumulation, condition, benefit,
 * repeat, validity) and falls back to the legacy flat fields
 * (rewardEveryVisits / rewardType / rewardDescription) for backward
 * compatibility with documents written before the configurable program.
 *
 * @param {Object} data
 */
function mapBenefitsSettings(data) {
  const lp = data?.loyaltyProgram || {}

  const accumulation =
    lp.accumulation ?? LOYALTY.ACCUMULATION.VISITS
  const condition = Number(
    lp.condition ?? lp.rewardEveryVisits ?? BENEFITS.DEFAULT_REWARD_EVERY_VISITS
  )
  const benefitType = lp.benefit?.type ?? lp.rewardType ?? BENEFITS.REWARD_TYPE
  const discountPercent = Number(
    lp.benefit?.discountPercent ?? LOYALTY.DEFAULT_DISCOUNT_PERCENT
  )
  const freeServiceId = lp.benefit?.freeServiceId ?? LOYALTY.FREE_SERVICE_ANY
  const freeServiceName = lp.benefit?.freeServiceName ?? ''
  const repeat = lp.repeat ?? false
  const validity = {
    enabled: lp.validity?.enabled ?? false,
    days: Number(lp.validity?.days ?? LOYALTY.DEFAULT_VALIDITY_DAYS),
  }
  const enabled = lp.enabled ?? true
  const showProgress = lp.showProgress ?? true

  const benefit = {
    type: benefitType,
    discountPercent:
      benefitType === LOYALTY.BENEFIT.FREE_SERVICE ? LOYALTY.DEFAULT_DISCOUNT_PERCENT : discountPercent,
    freeServiceId:
      benefitType === LOYALTY.BENEFIT.FREE_SERVICE ? freeServiceId : LOYALTY.FREE_SERVICE_ANY,
    freeServiceName:
      benefitType === LOYALTY.BENEFIT.FREE_SERVICE ? freeServiceName : '',
  }

  const normalized = {
    enabled,
    accumulation,
    condition,
    benefit,
    repeat,
    validity,
    showProgress,
  }

  return {
    ...normalized,
    // Legacy aliases kept so existing consumers (reward engine, dashboard
    // cards) continue working without changes.
    rewardEveryVisits: condition,
    rewardIncrement: condition,
    rewardType: benefitType,
    rewardDescription: getRewardLabel(normalized),
  }
}

/**
 * Subscribe to the benefits program settings.
 * @param {(data: Object) => void} onNext
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeBenefitsSettings(onNext, onError) {
  return onSnapshot(settingsRef(), (snap) => {
    onNext(snap.exists() ? mapBenefitsSettings(snap.data()) : mapBenefitsSettings({}))
  }, onError)
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

/**
 * Normalize a loyalty program config before persisting it, so the stored
 * document always has the full nested shape (safe against partial writes).
 * @param {Object} config
 * @returns {Object}
 */
export function normalizeLoyaltyConfig(config) {
  const base = DEFAULT_LOYALTY_PROGRAM
  const incoming = config || {}
  const benefitType =
    incoming.benefit?.type ??
    incoming.rewardType ??
    base.benefit.type

  return {
    enabled: incoming.enabled ?? base.enabled,
    accumulation:
      incoming.accumulation ?? base.accumulation,
    condition: Math.max(
      1,
      Number(incoming.condition ?? incoming.rewardEveryVisits ?? base.condition) || 1
    ),
    benefit: {
      type: benefitType,
      discountPercent: Math.min(
        100,
        Math.max(
          1,
          Number(incoming.benefit?.discountPercent ?? base.benefit.discountPercent) || 1
        )
      ),
      freeServiceId:
        benefitType === LOYALTY.BENEFIT.FREE_SERVICE
          ? incoming.benefit?.freeServiceId ?? base.benefit.freeServiceId
          : LOYALTY.FREE_SERVICE_ANY,
      freeServiceName:
        benefitType === LOYALTY.BENEFIT.FREE_SERVICE
          ? (incoming.benefit?.freeServiceName ?? '').toString()
          : '',
    },
    repeat: incoming.repeat ?? base.repeat,
    validity: {
      enabled: incoming.validity?.enabled ?? base.validity.enabled,
      days: Math.max(
        1,
        Number(incoming.validity?.days ?? base.validity.days) || 1
      ),
    },
    showProgress: incoming.showProgress ?? base.showProgress,
  }
}

export async function updateBenefitsSettings(config) {
  const ref = settingsRef()
  const snap = await getDoc(ref)
  const normalized = normalizeLoyaltyConfig(config)
  if (snap.exists()) {
    await updateDoc(ref, {
      loyaltyProgram: normalized,
      updatedAt: serverTimestamp(),
    })
  } else {
    await setDoc(ref, {
      loyaltyProgram: normalized,
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
 * Subscribe to payment settings (settings/payments), with defaults applied
 * when the document doesn't exist yet.
 * @param {(data: Object) => void} onNext
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribePaymentSettings(onNext, onError) {
  return onSnapshot(paymentsSettingsRef(), (snap) => {
    onNext(snap.exists() ? { ...DEFAULT_PAYMENT_SETTINGS, ...snap.data() } : { ...DEFAULT_PAYMENT_SETTINGS })
  }, onError)
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
  return mapBusinessSettings(snap.exists() ? snap.data() : {})
}

/**
 * Map a business settings document to its final shape (defaults merged,
 * legacy aliases honored, weeklySchedule normalized).
 * @param {Object} data
 */
function mapBusinessSettings(data) {
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
 * Subscribe to business settings (settings/business). Re-emits with the full
 * normalized shape (defaults + weeklySchedule) on every snapshot, so changes
 * to opening hours, intervals or weekly blocks apply without a reload.
 * @param {(data: Object) => void} onNext
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeBusinessSettings(onNext, onError) {
  return onSnapshot(businessSettingsRef(), (snap) => {
    onNext(mapBusinessSettings(snap.exists() ? snap.data() : {}))
  }, onError)
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

