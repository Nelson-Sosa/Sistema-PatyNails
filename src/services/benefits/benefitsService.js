import {
  doc, getDoc, updateDoc, addDoc, collection, query, where,
  getDocs, orderBy, limit, runTransaction, Timestamp, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS, BENEFITS } from '@/constants/app'
import { getBenefitsSettings } from '@/services/settings/settingsService'
import { formatPhoneStoragePY } from '@/utils/formatters'

/**
 * Normalize a phone number so it can be used as a stable identifier for guest
 * loyalty records (stored as the id of a doc in /clients). Mirrors the format
 * used for registered users' phones.
 * @param {string} phone
 * @returns {string}
 */
function normalizePhone(phone) {
  return formatPhoneStoragePY(phone)
}

/**
 * Process a completed visit for the benefits program.
 * Called when an appointment transitions to status "done".
 * - Marks the appointment as processed (prevents double-processing)
 * - Reads the client's current totalVisits (already incremented by incomeService)
 * - If totalVisits >= nextRewardAt, grants a 20% discount
 * - Records everything atomically in a transaction
 *
 * @param {string} clientId
 * @param {string} appointmentId
 * @returns {Promise<{rewardGranted: boolean, currentVisits: number, nextRewardAt: number, freeServices: number}|null>}
 *
 * NOTE: `freeServices` in the DB represents the count of available 20% discounts.
 */
export async function processCompletedVisit(clientId, appointmentId) {
  if (!clientId || !appointmentId) return null

  const benefitsSettings = await getBenefitsSettings()
  if (!benefitsSettings.enabled) return null

  const rewardEvery = benefitsSettings.rewardEveryVisits
  const rewardIncrement = benefitsSettings.rewardIncrement || rewardEvery

  const appointmentRef = doc(db, COLLECTIONS.APPOINTMENTS, appointmentId)

  try {
    return await runTransaction(db, async (transaction) => {
      const apptSnap = await transaction.get(appointmentRef)
      if (!apptSnap.exists()) return null
      if (apptSnap.data().visitProcessed) return null

      const userRef = doc(db, COLLECTIONS.USERS, clientId)
      const userSnap = await transaction.get(userRef)
      let clientRef, clientData
      if (userSnap.exists()) {
        clientRef = userRef
        clientData = userSnap.data()
      } else {
        clientRef = doc(db, COLLECTIONS.CLIENTS, clientId)
        const clientSnap = await transaction.get(clientRef)
        if (!clientSnap.exists()) return null
        clientData = clientSnap.data()
      }

      const currentVisits = clientData.totalVisits ?? 0
      let freeServices = clientData.freeServices ?? 0
      let nextRewardAt = clientData.nextRewardAt ?? rewardEvery
      let lastRewardAt = clientData.lastRewardAt ?? null
      let rewardGranted = false

      if (currentVisits >= nextRewardAt) {
        freeServices += 1
        lastRewardAt = Timestamp.now()
        nextRewardAt = nextRewardAt + rewardIncrement
        rewardGranted = true
      }

      transaction.update(clientRef, {
        freeServices,
        nextRewardAt,
        lastRewardAt,
        updatedAt: serverTimestamp(),
      })

      transaction.update(appointmentRef, { visitProcessed: true })

      const historyRef = doc(collection(db, COLLECTIONS.LOYALTY_HISTORY))
      transaction.set(historyRef, {
        clientId,
        appointmentId,
        type: 'visit',
        visitNumber: currentVisits,
        rewardType: rewardGranted ? 'discount' : null,
        rewardGranted,
        earnedAt: Timestamp.now(),
        redeemed: false,
        redeemedAt: null,
        redeemedBy: null,
      })

      return { rewardGranted, currentVisits, nextRewardAt, freeServices }
    })
  } catch (err) {
    console.error('[benefits] processCompletedVisit error:', err)
    return null
  }
}

/**
 * Redeem a 20% discount for a client.
 * Deducts one discount and records the redemption in history.
 *
 * @param {string} clientId
 * @param {string} adminUid
 * @returns {Promise<{success: boolean}>}
 */
export async function redeemDiscount(clientId, adminUid) {
  if (!clientId) return { success: false }

  try {
    return await runTransaction(db, async (transaction) => {
      const userRef = doc(db, COLLECTIONS.USERS, clientId)
      const userSnap = await transaction.get(userRef)
      let clientRef, clientData
      if (userSnap.exists()) {
        clientRef = userRef
        clientData = userSnap.data()
      } else {
        clientRef = doc(db, COLLECTIONS.CLIENTS, clientId)
        const clientSnap = await transaction.get(clientRef)
        if (!clientSnap.exists()) return { success: false }
        clientData = clientSnap.data()
      }

      if ((clientData.freeServices ?? 0) < 1) return { success: false }

      const newFreeServices = clientData.freeServices - 1

      transaction.update(clientRef, {
        freeServices: newFreeServices,
        updatedAt: serverTimestamp(),
      })

      const historyRef = doc(collection(db, COLLECTIONS.LOYALTY_HISTORY))
      transaction.set(historyRef, {
        clientId,
        appointmentId: null,
        type: 'redemption',
        visitNumber: clientData.totalVisits ?? 0,
        rewardType: 'discount',
        rewardGranted: true,
        earnedAt: Timestamp.now(),
        redeemed: true,
        redeemedAt: Timestamp.now(),
        redeemedBy: adminUid || null,
      })

      return { success: true, freeServices: newFreeServices }
    })
  } catch (err) {
    console.error('[benefits] redeemDiscount error:', err)
    return { success: false }
  }
}

/**
 * Get benefits history for a client.
 * @param {string} clientId
 * @returns {Promise<Array>}
 */
export async function getBenefitsHistory(clientId) {
  if (!clientId) return []
  const ref = collection(db, COLLECTIONS.LOYALTY_HISTORY)
  const q = query(ref, where('clientId', '==', clientId), orderBy('earnedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Get the most recent benefits event for a client.
 * @param {string} clientId
 * @returns {Promise<Object|null>}
 */
export async function getLastBenefitsEvent(clientId) {
  if (!clientId) return null
  const ref = collection(db, COLLECTIONS.LOYALTY_HISTORY)
  const q = query(ref, where('clientId', '==', clientId), orderBy('earnedAt', 'desc'), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() }
}

// ─── Guest Loyalty (Phone-Based) ─────────────────────────────────────────────

/**
 * Process a completed visit for a GUEST appointment.
 * Guests have no account, so the phone number is used as a temporary
 * identifier: visits are accumulated on a document in /clients/{phone}.
 *
 * Runs atomically in a transaction, mirroring processCompletedVisit.
 * It is invoked from updateAppointmentStatus (admin context) when a guest
 * appointment transitions to "done".
 *
 * @param {string} phone - Raw phone as entered by the guest
 * @param {string} appointmentId
 * @returns {Promise<{rewardGranted: boolean, currentVisits: number, nextRewardAt: number, freeServices: number}|null>}
 */
export async function processGuestCompletedVisit(phone, appointmentId) {
  if (!phone || !appointmentId) return null

  const benefitsSettings = await getBenefitsSettings()
  if (!benefitsSettings.enabled) return null

  const rewardEvery = benefitsSettings.rewardEveryVisits
  const rewardIncrement = benefitsSettings.rewardIncrement || rewardEvery
  const clientPhone = normalizePhone(phone)

  const appointmentRef = doc(db, COLLECTIONS.APPOINTMENTS, appointmentId)
  const clientRef = doc(db, COLLECTIONS.CLIENTS, clientPhone)

  try {
    return await runTransaction(db, async (transaction) => {
      const apptSnap = await transaction.get(appointmentRef)
      if (!apptSnap.exists()) return null
      if (apptSnap.data().visitProcessed) return null

      const clientSnap = await transaction.get(clientRef)
      const isNew = !clientSnap.exists()
      const clientData = isNew ? {} : clientSnap.data()

      const currentVisits = (clientData.totalVisits ?? 0) + 1
      let freeServices = clientData.freeServices ?? 0
      let nextRewardAt = clientData.nextRewardAt ?? rewardEvery
      let lastRewardAt = clientData.lastRewardAt ?? null
      let rewardGranted = false

      if (currentVisits >= nextRewardAt) {
        freeServices += 1
        lastRewardAt = Timestamp.now()
        nextRewardAt = nextRewardAt + rewardIncrement
        rewardGranted = true
      }

      const clientPayload = {
        name: apptSnap.data().clientName || clientData.name || '',
        phone: clientPhone,
        whatsapp: clientPhone,
        notes: clientData.notes || '',
        totalVisits: currentVisits,
        freeServices,
        nextRewardAt,
        lastRewardAt,
        whatsappOptIn: clientData.whatsappOptIn ?? false,
        phoneVerified: false,
        remindersEnabled: false,
        isGuest: true,
        updatedAt: serverTimestamp(),
      }

      if (isNew) {
        transaction.set(clientRef, {
          ...clientPayload,
          createdAt: serverTimestamp(),
        })
      } else {
        transaction.update(clientRef, clientPayload)
      }

      transaction.update(appointmentRef, { visitProcessed: true })

      const historyRef = doc(collection(db, COLLECTIONS.LOYALTY_HISTORY))
      transaction.set(historyRef, {
        clientId: clientPhone,
        appointmentId,
        type: 'visit',
        visitNumber: currentVisits,
        rewardType: rewardGranted ? 'discount' : null,
        rewardGranted,
        earnedAt: Timestamp.now(),
        redeemed: false,
        redeemedAt: null,
        redeemedBy: null,
      })

      return { rewardGranted, currentVisits, nextRewardAt, freeServices }
    })
  } catch (err) {
    console.error('[benefits] processGuestCompletedVisit error:', err)
    return null
  }
}

/**
 * Link a guest's history to a newly created user account.
 *
 * When a client who previously booked as a guest (tracked by phone) creates an
 * account with the same phone, this:
 *   1. Copies the accumulated loyalty counters (totalVisits, freeServices,
 *      nextRewardAt, lastRewardAt) from /clients/{phone} to /users/{uid}.
 *   2. Re-points their old guest appointments to the new userId (so they show
 *      up in "Mis Turnos" and continue accumulating benefits).
 *   3. Re-points loyalty history records from the phone to the uid.
 *
 * Each write is scoped by Firestore rules to the authenticated user's own data
 * (only records whose stored phone matches the user's registered phone).
 *
 * @param {string} phone - Phone used by the guest (raw format is fine)
 * @param {string} uid - The newly created user UID
 * @returns {Promise<{linked: boolean, appointments: number, history: number}>}
 */
export async function linkGuestHistory(phone, uid) {
  if (!phone || !uid) return { linked: false, appointments: 0, history: 0 }

  const clientPhone = normalizePhone(phone)

  // 1) Merge loyalty counters from /clients/{phone} into the user profile
  try {
    const guestRef = doc(db, COLLECTIONS.CLIENTS, clientPhone)
    const guestSnap = await getDoc(guestRef)
    const userRef = doc(db, COLLECTIONS.USERS, uid)
    const userSnap = await getDoc(userRef)

    if (guestSnap.exists() && userSnap.exists()) {
      const guest = guestSnap.data()
      const user = userSnap.data()

      await updateDoc(userRef, {
        totalVisits: (user.totalVisits ?? 0) + (guest.totalVisits ?? 0),
        freeServices: (user.freeServices ?? 0) + (guest.freeServices ?? 0),
        nextRewardAt: guest.nextRewardAt ?? user.nextRewardAt ?? BENEFITS.DEFAULT_REWARD_EVERY_VISITS,
        lastRewardAt: guest.lastRewardAt ?? user.lastRewardAt ?? null,
        linkedFromPhone: clientPhone,
        updatedAt: serverTimestamp(),
      })
    }
  } catch (err) {
    console.error('[benefits] linkGuestHistory — merge counters error:', err)
  }

  // 2) Re-point guest appointments by phone
  let appointmentsLinked = 0
  try {
    const raw = clientPhone.startsWith('+') ? clientPhone : null
    const queries = [clientPhone, raw].filter(Boolean).map((p) =>
      getDocs(query(collection(db, COLLECTIONS.APPOINTMENTS), where('clientPhone', '==', p)))
    )
    const snaps = await Promise.all(queries)

    const seen = new Set()
    const targets = []
    for (const snap of snaps) {
      for (const d of snap.docs) {
        const data = d.data()
        if (seen.has(d.id) || data.isGuest !== true || data.userId === uid) continue
        seen.add(d.id)
        targets.push(d)
      }
    }

    await Promise.all(targets.map((d) =>
      updateDoc(d.ref, {
        clientId: uid,
        userId: uid,
        isGuest: false,
        updatedAt: serverTimestamp(),
      })
    ))
    appointmentsLinked = targets.length
  } catch (err) {
    console.error('[benefits] linkGuestHistory — appointments error:', err)
  }

  // 3) Re-point loyalty history records by phone
  let historyLinked = 0
  try {
    const snap = await getDocs(query(
      collection(db, COLLECTIONS.LOYALTY_HISTORY),
      where('clientId', '==', clientPhone)
    ))
    const refs = snap.docs.map((d) => d.ref)
    await Promise.all(refs.map((ref) => updateDoc(ref, { clientId: uid })))
    historyLinked = refs.length
  } catch (err) {
    console.error('[benefits] linkGuestHistory — history error:', err)
  }

  return { linked: true, appointments: appointmentsLinked, history: historyLinked }
}
