import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS, BENEFITS } from '@/constants/app'

const SETTINGS_DOC_ID = 'salon'
const PAYMENTS_DOC_ID = 'payments'

function settingsRef() {
  return doc(db, COLLECTIONS.SETTINGS, SETTINGS_DOC_ID)
}

function paymentsSettingsRef() {
  return doc(db, COLLECTIONS.SETTINGS, PAYMENTS_DOC_ID)
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
  qrPublicId: '',
  qrUrl: '',
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
