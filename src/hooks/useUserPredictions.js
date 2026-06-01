import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'

// Devuelve un Map de matchId → prediction para el usuario actual
export function useUserPredictions() {
  const { user } = useAuth()
  const [predictionsMap, setPredictionsMap] = useState(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const q = query(collection(db, 'predictions'), where('userId', '==', user.uid))
    const unsub = onSnapshot(q, (snap) => {
      const map = new Map()
      snap.docs.forEach(d => map.set(d.data().matchId, { id: d.id, ...d.data() }))
      setPredictionsMap(map)
      setLoading(false)
    })
    return unsub
  }, [user])

  return { predictionsMap, loading }
}
