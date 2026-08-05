import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { COLLECTIONS } from '@/constants/app'

const categoriesRef = () => collection(db, COLLECTIONS.SERVICE_CATEGORIES)

export async function getCategories() {
  const q = query(categoriesRef(), orderBy('order', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getActiveCategories() {
  const all = await getCategories()
  return all.filter((c) => c.active !== false)
}

export async function getCategoryById(id) {
  const ref = doc(db, COLLECTIONS.SERVICE_CATEGORIES, id)
  const snap = await getDoc(ref)
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/**
 * Subscribe to all service categories ordered by 'order' ascending.
 * Fires on every Firestore change (add / update / delete).
 * @param {(data: Array) => void} onNext
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeCategories(onNext, onError) {
  const q = query(categoriesRef(), orderBy('order', 'asc'))
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  )
}

/**
 * Subscribe to active service categories (active !== false).
 * @param {(data: Array) => void} onNext
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeActiveCategories(onNext, onError) {
  // Filter locally (same as getActiveCategories) to avoid requiring a composite index
  return subscribeCategories((all) => {
    onNext(all.filter((c) => c.active !== false))
  }, onError)
}

export async function createCategory(data) {
  const payload = {
    name: data.name,
    description: data.description ?? '',
    active: true,
    order: Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  const ref = await addDoc(categoriesRef(), payload)
  return ref.id
}

export async function updateCategory(id, data) {
  const ref = doc(db, COLLECTIONS.SERVICE_CATEGORIES, id)
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
}

export async function toggleCategoryActive(id, active) {
  return updateCategory(id, { active })
}
