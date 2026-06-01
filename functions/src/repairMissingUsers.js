const { onRequest }     = require('firebase-functions/v2/https')
const { getAuth }       = require('firebase-admin/auth')
const { getFirestore }  = require('firebase-admin/firestore')
const { initializeApp } = require('firebase-admin/app')

try { initializeApp() } catch (_) {}

const db        = getFirestore()
const adminAuth = getAuth()

exports.repairMissingUsers = onRequest({ cors: true }, async (req, res) => {
  if (req.method === 'OPTIONS') { res.status(204).send(''); return }

  // Verificar token de Firebase Auth
  const header = req.headers.authorization ?? ''
  if (!header.startsWith('Bearer ')) { res.status(401).json({ error: 'No autorizado' }); return }

  let decoded
  try { decoded = await adminAuth.verifyIdToken(header.slice(7)) }
  catch { res.status(401).json({ error: 'Token inválido' }); return }

  // Solo admins
  const callerSnap = await db.collection('users').doc(decoded.uid).get()
  if (!callerSnap.exists || callerSnap.data().role !== 'admin') {
    res.status(403).json({ error: 'Acceso denegado' }); return
  }

  // Listar todos los usuarios de Auth
  const authUsers = []
  let pageToken
  do {
    const page = await adminAuth.listUsers(1000, pageToken)
    authUsers.push(...page.users)
    pageToken = page.pageToken
  } while (pageToken)

  if (authUsers.length === 0) { res.json({ created: 0, total: 0 }); return }

  // Detectar qué UIDs no tienen documento en Firestore
  const uids = authUsers.map(u => u.uid)
  const existingUids = new Set()
  for (let i = 0; i < uids.length; i += 10) {
    const refs  = uids.slice(i, i + 10).map(uid => db.collection('users').doc(uid))
    const snaps = await db.getAll(...refs)
    snaps.forEach(s => { if (s.exists) existingUids.add(s.id) })
  }

  const missing = authUsers.filter(u => !existingUids.has(u.uid))
  if (missing.length === 0) { res.json({ created: 0, total: authUsers.length }); return }

  // Crear los documentos faltantes
  const batch = db.batch()
  for (const u of missing) {
    const emailPrefix = (u.email ?? '').split('@')[0] || u.uid.slice(0, 8)
    batch.set(db.collection('users').doc(u.uid), {
      uid:            u.uid,
      username:       u.displayName || emailPrefix,
      email:          u.email ?? '',
      role:           'user',
      totalPoints:    0,
      longTermPoints: 0,
      createdAt:      new Date(),
    })
  }
  await batch.commit()

  res.json({ created: missing.length, total: authUsers.length })
})
