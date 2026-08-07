import {
  doc, getDoc, updateDoc, collection, query, where,
  getDocs, orderBy, limit, runTransaction, onSnapshot, Timestamp, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS, BENEFITS, LOYALTY } from '@/constants/app'
import { getBenefitsSettings } from '@/services/settings/settingsService'
import { formatPhoneStoragePY } from '@/utils/formatters'
import { getRewardLabel } from '@/utils/loyalty'

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
 * Field that holds the accumulated counter on client/user documents, based on
 * the configured accumulation mode (visits vs completed services).
 * @param {string} accumulation
 * @returns {string}
 */
function counterField(accumulation) {
  return accumulation === LOYALTY.ACCUMULATION.SERVICES ? 'totalServices' : 'totalVisits'
}

/**
 * Normalize the raw settings into the shape the engine needs (with safe
 * defaults), so legacy documents keep working.
 * @param {Object} settings
 */
function engineConfig(settings) {
  return {
    enabled: settings?.enabled ?? true,
    accumulation: settings?.accumulation ?? LOYALTY.ACCUMULATION.VISITS,
    condition: Number(
      settings?.condition ?? settings?.rewardEveryVisits ?? BENEFITS.DEFAULT_REWARD_EVERY_VISITS
    ),
    benefit: settings?.benefit ?? {
      type: settings?.rewardType ?? LOYALTY.BENEFIT.DISCOUNT,
      discountPercent: LOYALTY.DEFAULT_DISCOUNT_PERCENT,
    },
    repeat: settings?.repeat ?? false,
    validity: settings?.validity ?? { enabled: false, days: LOYALTY.DEFAULT_VALIDITY_DAYS },
  }
}

/**
 * Grant a reward on a client document, mutating the counters object.
 * Returns whether a reward was granted and its type.
 *
 * @param {Object} clientData - current client/user data (will be mutated)
 * @param {Object} config - normalized engine config
 * @returns {{rewardGranted: boolean, rewardType: string|null}}
 */
function applyReward(clientData, config) {
  const counter = clientData[counterField(config.accumulation)] ?? clientData.totalVisits ?? 0
  const nextRewardAt = clientData.nextRewardAt ?? config.condition

  let rewardGranted = false
  let rewardType = null

  if (counter >= nextRewardAt) {
    rewardType =
      config.benefit.type === LOYALTY.BENEFIT.FREE_SERVICE
        ? LOYALTY.BENEFIT.FREE_SERVICE
        : LOYALTY.BENEFIT.DISCOUNT

    if (rewardType === LOYALTY.BENEFIT.FREE_SERVICE) {
      clientData.freeServiceRewards = (clientData.freeServiceRewards ?? 0) + 1
    } else {
      clientData.freeServices = (clientData.freeServices ?? 0) + 1
    }

    clientData.lastRewardAt = Timestamp.now()
    clientData.nextRewardAt =
      config.repeat ? counter + config.condition : nextRewardAt + config.condition

    if (config.validity.enabled && config.validity.days > 0) {
      clientData.rewardsExpireAt = Timestamp.fromDate(
        new Date(Date.now() + config.validity.days * 24 * 60 * 60 * 1000)
      )
    }
    rewardGranted = true
  }

  return { rewardGranted, rewardType }
}

/**
 * Build the loyalty history record for a completed visit.
 * @param {Object} args
 */
function buildVisitHistory({
  clientId, appointmentId, appointment, visitNumber, rewardGranted, rewardType, config,
}) {
  return {
    clientId,
    appointmentId,
    type: 'visit',
    visitNumber,
    serviceName: appointment?.serviceName ?? null,
    serviceId: appointment?.serviceId ?? null,
    rewardType,
    rewardDescription: rewardGranted ? getRewardLabel(config) : null,
    rewardGranted,
    earnedAt: Timestamp.now(),
    redeemed: false,
    redeemedAt: null,
    redeemedBy: null,
  }
}

/**
 * Process a completed visit for the benefits program.
 * Called when an appointment transitions to status "done".
 * - Marks the appointment as processed (prevents double-processing)
 * - Reads the client's current counter (totalVisits, already incremented by
 *   incomeService, or totalServices for services-based accumulation)
 * - If the counter reached the configured threshold, grants the configured
 *   reward (discount or free service) and records everything atomically
 *
 * @param {string} clientId
 * @param {string} appointmentId
 * @returns {Promise<{rewardGranted: boolean, currentVisits: number, nextRewardAt: number, freeServices: number}|null>}
 */
export async function processCompletedVisit(clientId, appointmentId) {
  if (!clientId || !appointmentId) return null

  const config = engineConfig(await getBenefitsSettings())
  if (!config.enabled) return null

  const appointmentRef = doc(db, COLLECTIONS.APPOINTMENTS, appointmentId)

  try {
    return await runTransaction(db, async (transaction) => {
      const apptSnap = await transaction.get(appointmentRef)
      if (!apptSnap.exists()) return null
      if (apptSnap.data().visitProcessed) return null
      const appointment = apptSnap.data()

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

      // totalVisits is already incremented by incomeService; totalServices is
      // kept in sync here for services-based accumulation.
      const totalVisits = clientData.totalVisits ?? 0
      const totalServices = (clientData.totalServices ?? 0) + 1
      clientData.totalServices = totalServices
      clientData.totalVisits = totalVisits

      const { rewardGranted, rewardType } = applyReward(clientData, config)

      const finalPayload = {
        totalVisits,
        totalServices,
        freeServices: clientData.freeServices ?? 0,
        freeServiceRewards: clientData.freeServiceRewards ?? 0,
        nextRewardAt: clientData.nextRewardAt ?? config.condition,
        lastRewardAt: clientData.lastRewardAt ?? null,
        updatedAt: serverTimestamp(),
      }
      if (config.validity.enabled) {
        finalPayload.rewardsExpireAt = clientData.rewardsExpireAt ?? null
      }

      transaction.update(clientRef, finalPayload)

      transaction.update(appointmentRef, { visitProcessed: true })

      const historyRef = doc(collection(db, COLLECTIONS.LOYALTY_HISTORY))
      transaction.set(historyRef, buildVisitHistory({
        clientId,
        appointmentId,
        appointment,
        visitNumber: totalVisits,
        rewardGranted,
        rewardType,
        config,
      }))

      return {
        rewardGranted,
        currentVisits: totalVisits,
        nextRewardAt: finalPayload.nextRewardAt,
        freeServices: finalPayload.freeServices,
      }
    })
  } catch (err) {
    console.error('[benefits] processCompletedVisit error:', err)
    return null
  }
}

/**
 * Redeem an available reward (discount or free service) for a client.
 * Deducts one reward of the given type and records the redemption in history.
 * Refuses to redeem when the reward pool has expired (validity window).
 *
 * @param {string} clientId
 * @param {string} adminUid
 * @param {string} [type] - LOYALTY.BENEFIT.DISCOUNT or LOYALTY.BENEFIT.FREE_SERVICE
 * @returns {Promise<{success: boolean, reason?: string}>}
 */
export async function redeemReward(clientId, adminUid, type = LOYALTY.BENEFIT.DISCOUNT) {
  if (!clientId) return { success: false, reason: 'no-client' }

  const config = engineConfig(await getBenefitsSettings())
  if (!config.enabled) return { success: false, reason: 'disabled' }

  const field =
    type === LOYALTY.BENEFIT.FREE_SERVICE ? 'freeServiceRewards' : 'freeServices'

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
        if (!clientSnap.exists()) return { success: false, reason: 'no-client' }
        clientData = clientSnap.data()
      }

      const available = clientData[field] ?? 0
      if (available < 1) return { success: false, reason: 'no-rewards' }

      if (config.validity.enabled && clientData.rewardsExpireAt) {
        const expireAt = clientData.rewardsExpireAt
        const expireTime = expireAt.toDate
          ? expireAt.toDate().getTime()
          : expireAt.seconds
            ? expireAt.seconds * 1000
            : new Date(expireAt).getTime()
        if (Date.now() > expireTime) {
          return { success: false, reason: 'expired' }
        }
      }

      transaction.update(clientRef, {
        [field]: available - 1,
        updatedAt: serverTimestamp(),
      })

      const historyRef = doc(collection(db, COLLECTIONS.LOYALTY_HISTORY))
      transaction.set(historyRef, {
        clientId,
        appointmentId: null,
        type: 'redemption',
        visitNumber: clientData.totalVisits ?? 0,
        rewardType: type,
        rewardDescription: getRewardLabel(config),
        rewardGranted: true,
        earnedAt: Timestamp.now(),
        redeemed: true,
        redeemedAt: Timestamp.now(),
        redeemedBy: adminUid || null,
      })

      return { success: true, [field]: available - 1 }
    })
  } catch (err) {
    console.error('[benefits] redeemReward error:', err)
    return { success: false, reason: 'error' }
  }
}

/**
 * Redeem a discount reward for a client (backward-compatible wrapper).
 * @param {string} clientId
 * @param {string} adminUid
 * @returns {Promise<{success: boolean}>}
 */
export async function redeemDiscount(clientId, adminUid) {
  return redeemReward(clientId, adminUid, LOYALTY.BENEFIT.DISCOUNT)
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

/**
 * Subscribe to the benefits history for a client in real time.
 * Updates instantly when a visit is completed or a reward is redeemed.
 *
 * @param {string} clientId
 * @param {(data: Array) => void} onNext
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeBenefitsHistory(clientId, onNext, onError) {
  if (!clientId) {
    onNext([])
    return () => {}
  }
  const ref = collection(db, COLLECTIONS.LOYALTY_HISTORY)
  const q = query(ref, where('clientId', '==', clientId), orderBy('earnedAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  )
}

/**
 * Subscribe to the most recent benefits event for a client in real time.
 * Useful for showing the current reward status badge on the client profile.
 *
 * @param {string} clientId
 * @param {(data: Object|null) => void} onNext
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeLastBenefitsEvent(clientId, onNext, onError) {
  if (!clientId) {
    onNext(null)
    return () => {}
  }
  const ref = collection(db, COLLECTIONS.LOYALTY_HISTORY)
  const q = query(ref, where('clientId', '==', clientId), orderBy('earnedAt', 'desc'), limit(1))
  return onSnapshot(q, (snap) => {
    onNext(snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() })
  }, onError)
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

  const config = engineConfig(await getBenefitsSettings())
  if (!config.enabled) return null

  const clientPhone = normalizePhone(phone)

  const appointmentRef = doc(db, COLLECTIONS.APPOINTMENTS, appointmentId)
  const clientRef = doc(db, COLLECTIONS.CLIENTS, clientPhone)

  try {
    return await runTransaction(db, async (transaction) => {
      const apptSnap = await transaction.get(appointmentRef)
      if (!apptSnap.exists()) return null
      if (apptSnap.data().visitProcessed) return null
      const appointment = apptSnap.data()

      const clientSnap = await transaction.get(clientRef)
      const isNew = !clientSnap.exists()
      const clientData = isNew ? {} : clientSnap.data()

      const totalVisits = (clientData.totalVisits ?? 0) + 1
      const totalServices = (clientData.totalServices ?? 0) + 1
      clientData.totalVisits = totalVisits
      clientData.totalServices = totalServices

      const { rewardGranted, rewardType } = applyReward(clientData, config)

      const clientPayload = {
        name: appointment.clientName || clientData.name || '',
        phone: clientPhone,
        whatsapp: clientPhone,
        notes: clientData.notes || '',
        totalVisits,
        totalServices,
        freeServices: clientData.freeServices ?? 0,
        freeServiceRewards: clientData.freeServiceRewards ?? 0,
        nextRewardAt: clientData.nextRewardAt ?? config.condition,
        lastRewardAt: clientData.lastRewardAt ?? null,
        ...(config.validity.enabled ? { rewardsExpireAt: clientData.rewardsExpireAt ?? null } : {}),
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
      transaction.set(historyRef, buildVisitHistory({
        clientId: clientPhone,
        appointmentId,
        appointment,
        visitNumber: totalVisits,
        rewardGranted,
        rewardType,
        config,
      }))

      return {
        rewardGranted,
        currentVisits: totalVisits,
        nextRewardAt: clientPayload.nextRewardAt,
        freeServices: clientPayload.freeServices,
      }
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
        totalServices: (user.totalServices ?? 0) + (guest.totalServices ?? 0),
        freeServices: (user.freeServices ?? 0) + (guest.freeServices ?? 0),
        freeServiceRewards: (user.freeServiceRewards ?? 0) + (guest.freeServiceRewards ?? 0),
        nextRewardAt: guest.nextRewardAt ?? user.nextRewardAt ?? BENEFITS.DEFAULT_REWARD_EVERY_VISITS,
        lastRewardAt: guest.lastRewardAt ?? user.lastRewardAt ?? null,
        rewardsExpireAt: guest.rewardsExpireAt ?? user.rewardsExpireAt ?? null,
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

// ─── Loyalty Program Stats (Admin Panel) ──────────────────────────────────────

/**
 * Subscribe to aggregate loyalty reward stats for the admin panel.
 * Counts every granted reward from the audit history by type, plus redemptions.
 *
 * @param {(data: Object) => void} onNext
 *   Receives { totalGranted, discountsGranted, freeServicesGranted, redemptions }
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeLoyaltyStats(onNext, onError) {
  const q = query(
    collection(db, COLLECTIONS.LOYALTY_HISTORY),
    where('rewardGranted', '==', true)
  )

  return onSnapshot(
    q,
    (snap) => {
      const stats = {
        totalGranted: 0,
        discountsGranted: 0,
        freeServicesGranted: 0,
        redemptions: 0,
      }
      snap.docs.forEach((d) => {
        const data = d.data()
        if (data.type === 'redemption') {
          stats.redemptions += 1
          return
        }
        stats.totalGranted += 1
        if (data.rewardType === LOYALTY.BENEFIT.FREE_SERVICE) {
          stats.freeServicesGranted += 1
        } else {
          stats.discountsGranted += 1
        }
      })
      onNext(stats)
    },
    onError
  )
}
