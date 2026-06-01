import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, db, fns } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubProfile = null

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        // fire-and-forget: cuenta cada carga de la app como una visita
        updateDoc(doc(db, 'users', firebaseUser.uid), { visitCount: increment(1) }).catch(() => {})
      }

      if (unsubProfile) { unsubProfile(); unsubProfile = null }

      if (firebaseUser) {
        unsubProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
          setProfile(snap.exists() ? snap.data() : null)
          setLoading(false)
        })
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      unsubAuth()
      if (unsubProfile) unsubProfile()
    }
  }, [])

  async function signIn(email, password) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function signUp(email, password, username) {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    const validate = httpsCallable(fns, 'validateInviteCode')
    await validate({
      uid: credential.user.uid,
      username,
    })
  }

  async function signOut() {
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
