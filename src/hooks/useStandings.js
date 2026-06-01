import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'

export function useStandings() {
  const [standings, setStandings] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('totalPoints', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setStandings(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [])

  return { standings, loading }
}
