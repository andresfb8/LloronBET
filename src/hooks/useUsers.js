import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

// Devuelve un Map de uid → profile para todos los usuarios
export function useUsers() {
  const [usersMap, setUsersMap] = useState(new Map())
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const map = new Map()
      snap.docs.forEach(d => map.set(d.id, d.data()))
      setUsersMap(map)
      setLoading(false)
    })
    return unsub
  }, [])

  return { usersMap, loading }
}
