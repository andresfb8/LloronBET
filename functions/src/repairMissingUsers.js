const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { getAuth }            = require('firebase-admin/auth')
const { getFirestore }       = require('firebase-admin/firestore')

const db   = getFirestore()
const auth = getAuth()

/**
 * Detecta usuarios de Firebase Auth sin documento en /users/{uid}
 * y los crea automáticamente. Solo accesible por admins.
 */
exports.repairMissingUsers = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'No autorizado')

  const callerDoc = await db.collection('users').doc(request.auth.uid).get()
  if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Acceso denegado')
  }

  // Obtener todos los usuarios de Auth (en páginas de 1000)
  const authUsers = []
  let pageToken
  do {
    const result = await auth.listUsers(1000, pageToken)
    authUsers.push(...result.users)
    pageToken = result.pageToken
  } while (pageToken)

  if (authUsers.length === 0) return { created: 0, total: 0 }

  // Leer todos los documentos /users que existen
  const uids = authUsers.map(u => u.uid)
  // getDocs de múltiples docs en lotes de 10 (límite de getAll)
  const existingUids = new Set()
  for (let i = 0; i < uids.length; i += 10) {
    const chunk = uids.slice(i, i + 10)
    const refs  = chunk.map(uid => db.collection('users').doc(uid))
    const snaps = await db.getAll(...refs)
    snaps.forEach(s => { if (s.exists) existingUids.add(s.id) })
  }

  // Crear los documentos faltantes
  const missing = authUsers.filter(u => !existingUids.has(u.uid))

  if (missing.length === 0) return { created: 0, total: authUsers.length }

  const batch = db.batch()
  for (const u of missing) {
    const emailPrefix = (u.email ?? '').split('@')[0] || u.uid.slice(0, 8)
    const username    = u.displayName || emailPrefix
    batch.set(db.collection('users').doc(u.uid), {
      uid:            u.uid,
      username,
      email:          u.email ?? '',
      role:           'user',
      totalPoints:    0,
      longTermPoints: 0,
      createdAt:      new Date(),
    })
  }
  await batch.commit()

  return { created: missing.length, total: authUsers.length }
})
