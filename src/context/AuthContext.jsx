import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase/config'
import {
  loginWithEmail,
  loginWithGoogle,
  handleGoogleRedirect,
  registerWithEmail,
  resetPassword,
  logout as logoutService,
  loadUserProfile,
} from '@/services/auth/authService'
import { queryClient } from '@/lib/queryClient'

// ─── Context Definition ───────────────────────────────────────────────────────

/**
 * @typedef {Object} AuthContextValue
 * @property {import('firebase/auth').User|null} user
 * @property {Object|null} userProfile
 * @property {string|null} role - null while loading, 'user' or 'admin' when ready
 * @property {boolean} loadingRole
 * @property {boolean} loading
 * @property {boolean} isAuthenticated
 * @property {Function} login
 * @property {Function} loginWithGoogle
 * @property {Function} register
 * @property {Function} sendPasswordReset
 * @property {Function} logout
 * @property {Function} loadProfile - manually reload Firestore profile
 */

/** @type {import('react').Context<AuthContextValue>} */
const AuthContext = createContext(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * AuthProvider — manages Firebase auth state and Firestore user profile.
 *
 * Architecture:
 * - onAuthStateChanged: ONLY sets user state. Does NOT write to Firestore.
 * - loadProfile: reads the Firestore doc. Called after login actions complete,
 *   or on session resume (page refresh). If the doc doesn't exist on a page
 *   refresh, it logs a warning but does NOT crash the app.
 * - ensureUserDoc / write operations: ONLY called from login/register actions
 *   in authService, where the auth token is guaranteed to be ready.
 */
export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [loadingRole, setLoadingRole] = useState(true)

  // Guard against stale async completions when the session changes between
  // users. `profileRequestUid` holds the UID whose profile is currently being
  // applied; a result that no longer matches is discarded.
  const googleRedirectChecked = useRef(false)
  const profileRequestUid = useRef(null)

  // ─── Load Firestore profile ─────────────────────────────────────────────────
  /**
   * Reads the Firestore profile for a Firebase user.
   * This is READ-ONLY — it never writes to Firestore.
   * Re-loads the profile every time the authenticated user changes, so the UI
   * always reflects the current session instead of the previous user's data.
   */
  const loadProfile = useCallback(async (firebaseUser) => {
    const uid = firebaseUser?.uid ?? null
    profileRequestUid.current = uid

    if (!uid) {
      setUserProfile(null)
      setLoadingRole(false)
      return
    }

    setLoadingRole(true)
    try {
      const profile = await loadUserProfile(uid)
      // Discard if a newer/loughed-in session has already requested another user.
      if (profileRequestUid.current !== uid) return
      setUserProfile(profile)
    } catch (err) {
      if (profileRequestUid.current !== uid) return
      // Firestore permission error or network issue.
      // Fall back to null — the UI will treat this as role: 'user' (safe default).
      console.error('[AuthContext] loadProfile — ERROR:', {
        name: err.name,
        message: err.message,
        code: err.code,
      })
      setUserProfile(null)
    } finally {
      if (profileRequestUid.current === uid) setLoadingRole(false)
    }
  }, [])

  // ─── Auth state listener ────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Update the current user synchronously so the UI reacts immediately.
      setUser(firebaseUser)

      // Consume a pending Google redirect result exactly once per provider mount.
      if (!googleRedirectChecked.current) {
        googleRedirectChecked.current = true
        try {
          await handleGoogleRedirect()
        } catch (err) {
          console.error('[auth] handleGoogleRedirect failed:', {
            name: err.name,
            message: err.message,
            code: err.code,
          })
        }
      }

      if (!firebaseUser) {
        // Session ended (logout) — fully clear the previous session's state.
        profileRequestUid.current = null
        setUserProfile(null)
        setLoadingRole(false)
        setLoading(false)
        return
      }

      setLoading(false)
      // Re-fetch the profile for the (possibly different) signed-in user.
      await loadProfile(firebaseUser)
    })

    return () => unsubscribe()
  }, [loadProfile])

  // ─── Auth Actions ───────────────────────────────────────────────────────────

  /**
   * Email/password login.
   * Flow: signIn → ensureUserDoc (write if new) → loadProfile (read) → done
   */
  const login = useCallback(async (email, password) => {
    const credential = await loginWithEmail(email, password)
    // After login, reload the profile into context
    await loadProfile(credential.user)
    return credential
  }, [loadProfile])

  const register = useCallback(async (email, password, displayName) => {
    const credential = await registerWithEmail(email, password, displayName)
    await loadProfile(credential.user)
    return credential
  }, [loadProfile])

  const sendPasswordReset = useCallback(async (email) => {
    await resetPassword(email)
  }, [])

  /**
   * Sign out.
   * Clears every user-related piece of state AND the React Query cache so the
   * next session never renders data/dashboards from the previous user.
   */
  const logout = useCallback(async () => {
    await logoutService()
    profileRequestUid.current = null
    setUser(null)
    setUserProfile(null)
    setLoadingRole(false)
    queryClient.clear()
  }, [])

  // ─── Context Value ──────────────────────────────────────────────────────────

  /** @type {AuthContextValue} */
  const value = {
    user,
    userProfile,
    // null while loading → components that check role must wait for loadingRole=false
    role: loadingRole ? null : (userProfile?.role ?? 'user'),
    loadingRole,
    loading,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    register,
    sendPasswordReset,
    logout,
    // expose so hooks (e.g. useUpdateUserProfile) can trigger a profile refresh
    loadProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Custom hook to consume AuthContext.
 * @returns {AuthContextValue}
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
