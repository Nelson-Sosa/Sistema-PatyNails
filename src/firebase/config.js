import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

/**
 * Firebase configuration loaded from Vite environment variables.
 * All variables must be prefixed with VITE_ to be exposed to the client.
 * Set these in your .env.local file (never commit real values to the repo).
 */
const FALLBACK = {
  apiKey: 'AIzaSyBFgbvH-c7WboK3Gsym_GeP5eYheI3sQzU',
  authDomain: 'patynails-244c1.firebaseapp.com',
  projectId: 'patynails-244c1',
  storageBucket: 'patynails-244c1.firebasestorage.app',
  messagingSenderId: '770322899269',
  appId: '1:770322899269:web:cea6d2ab8205f0315a5e2c',
  measurementId: 'G-4D56E71HPM',
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || FALLBACK.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || FALLBACK.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || FALLBACK.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || FALLBACK.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || FALLBACK.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || FALLBACK.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || FALLBACK.measurementId,
}

// Validate before initializing
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain) {
  console.error(
    '[FIREBASE] Configuración inválida:',
    { apiKey: !!firebaseConfig.apiKey, projectId: !!firebaseConfig.projectId, authDomain: !!firebaseConfig.authDomain }
  )
} else {
  console.log('[FIREBASE] Inicializando con projectId:', firebaseConfig.projectId)
}

// Prevent re-initialization in HMR (Hot Module Replacement) environments
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Initialize and export Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

export default app
