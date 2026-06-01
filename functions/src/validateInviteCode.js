const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { getAuth }            = require('firebase-admin/auth')
const { getFirestore }       = require('firebase-admin/firestore')
const { initializeApp }      = require('firebase-admin/app')

// Inicializar admin una sola vez (el resto de functions reutilizan esta instancia)
try { initializeApp() } catch (_) {}

const auth = getAuth()
const db   = getFirestore()

/**
 * Crea el documento /users/{uid} tras el registro.
 * Se llama desde el cliente tras createUserWithEmailAndPassword().
 */
exports.validateInviteCode = onCall({ cors: true }, async (request) => {
  const { uid, username } = request.data

  await db.collection('users').doc(uid).set({
    uid,
    username,
    email:           request.auth.token.email,
    role:            'user',
    totalPoints:     0,
    longTermPoints:  0,
    createdAt:       new Date(),
  })

  return { ok: true }
})
