import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS } from '@/constants/app'

const notificationsRef = () => collection(db, COLLECTIONS.NOTIFICATIONS)

export async function createNotification({ title, message, type, entityId, entityType }) {
  const payload = {
    title,
    message,
    type,
    read: false,
    entityId: entityId ?? null,
    entityType: entityType ?? null,
    createdAt: serverTimestamp(),
  }
  const ref = await addDoc(notificationsRef(), payload)
  return ref.id
}

export async function getRecentNotifications(max = 50) {
  const q = query(
    notificationsRef(),
    orderBy('createdAt', 'desc'),
    limit(max)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getUnreadCount() {
  const q = query(
    notificationsRef(),
    where('read', '==', false)
  )
  const snap = await getDocs(q)
  return snap.size
}

/**
 * Subscribe to the most recent notifications in real time.
 * @param {number} max - Maximum number of notifications to return (default 50)
 * @param {(data: Array) => void} onNext
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeRecentNotifications(max = 50, onNext, onError) {
  const q = query(
    notificationsRef(),
    orderBy('createdAt', 'desc'),
    limit(max)
  )
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  )
}

/**
 * Subscribe to the unread notification count in real time.
 * Updates the badge instantly when new notifications arrive or are marked read.
 * @param {(count: number) => void} onNext
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeUnreadCount(onNext, onError) {
  const q = query(
    notificationsRef(),
    where('read', '==', false)
  )
  return onSnapshot(q, (snap) => onNext(snap.size), onError)
}

export async function markAsRead(id) {
  const ref = doc(db, COLLECTIONS.NOTIFICATIONS, id)
  await updateDoc(ref, { read: true })
}

export async function markAllAsRead() {
  const q = query(
    notificationsRef(),
    where('read', '==', false)
  )
  const snap = await getDocs(q)
  const updates = snap.docs.map((d) => updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, d.id), { read: true }))
  await Promise.all(updates)
}
