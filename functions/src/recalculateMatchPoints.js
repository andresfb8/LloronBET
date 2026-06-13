const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { getFirestore } = require('firebase-admin/firestore')
const { computeMatchPoints } = require('./calculatePoints')

const db = getFirestore()

// Recalcula los puntos de un partido ya finalizado (status FT con finalScore).
// Solo admin. Aplica el delta respecto a points_won actual para no contar
// puntos dos veces — sirve tanto para reparar partidos atascados como para
// recalcular tras una corrección manual del marcador.
exports.recalculateMatchPoints = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'No autorizado')

  const callerDoc = await db.collection('users').doc(request.auth.uid).get()
  if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Acceso denegado')
  }

  const { matchId } = request.data
  if (!matchId) throw new HttpsError('invalid-argument', 'Falta matchId')

  const matchSnap = await db.collection('matches').doc(matchId).get()
  if (!matchSnap.exists) throw new HttpsError('not-found', 'Partido no encontrado')

  const match = matchSnap.data()
  if (match.status !== 'FT' || !match.finalScore) {
    throw new HttpsError('failed-precondition', 'El partido no está finalizado con marcador')
  }

  const { processed, totalPoints } = await computeMatchPoints(matchId, match, { applyDelta: true })

  console.log(`recalculateMatchPoints: match ${matchId} — ${processed} predicciones, ${totalPoints} puntos totales`)

  return { message: `Recalculado: ${processed} predicciones, ${totalPoints} puntos totales para ${matchId}.` }
})
