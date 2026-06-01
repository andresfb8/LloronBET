import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'

export function usePrediction(matchId) {
  const { user } = useAuth()
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!user || !matchId) { setLoading(false); return }
    const predId = `${user.uid}_${matchId}`
    const unsub = onSnapshot(doc(db, 'predictions', predId), (snap) => {
      setPrediction(snap.exists() ? { id: snap.id, ...snap.data() } : null)
      setLoading(false)
    })
    return unsub
  }, [user, matchId])

  return { prediction, loading }
}
