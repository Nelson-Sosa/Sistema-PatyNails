import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS, BENEFITS } from '@/constants/app'

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
 * Read business settings from Firestore (settings/business).
 * Returns defaults if the document doesn't exist.
 * @returns {Promise<Object>}
 */
export async function getBusinessSettings() {
  const snap = await getDoc(businessSettingsRef())
  if (!snap.exists()) return { ...DEFAULT_BUSINESS_SETTINGS }
  return { ...DEFAULT_BUSINESS_SETTINGS, ...snap.data() }
}

/**
 * Save business settings to Firestore (settings/business).
 * @param {Object} config
 */
export async function updateBusinessSettings(config) {
  const ref = businessSettingsRef()
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, { ...config, updatedAt: serverTimestamp() })
  } else {
    await setDoc(ref, { ...config, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  }
}

