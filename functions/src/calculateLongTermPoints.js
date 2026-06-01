const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

const db = getFirestore()

const POINTS = {
  champion:  100,
  runnerUp:   80,
  topScorer:  50,
  group:      25,
}

exports.calculateLongTermPoints = onCall(async (request) => {
  // Verificar admin
  if (!request.auth) throw new HttpsError('unauthenticated', 'No autorizado')

  const userDoc = await db.collection('users').doc(request.auth.uid).get()
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Acceso denegado')
  }

  const { champion, runnerUp, topScorer, groupResults } = request.data
  if (!champion || !runnerUp || !topScorer) {
    throw new HttpsError('invalid-argument', 'Faltan parámetros: champion, runnerUp, topScorer')
  }

  const snap  = await db.collection('longterm').get()
  const batch = db.batch()

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    let points = 0

    if (data.champion  === champion)  points += POINTS.champion
    if (data.runnerUp  === runnerUp)  points += POINTS.runnerUp
    if (data.topScorer === topScorer) points += POINTS.topScorer

    // Clasificados por grupo: +25 por cada equipo acertado
    if (data.groupPicks && groupResults) {
      for (const [group, picks] of Object.entries(data.groupPicks)) {
        if (!Array.isArray(picks)) continue
        const realQualified = groupResults[group] ?? []
        for (const pick of picks) {
          if (realQualified.includes(pick)) points += POINTS.group
        }
      }
    }

    batch.update(docSnap.ref, { points_won: points, isLocked: true })

    const userRef = db.collection('users').doc(data.userId)
    batch.update(userRef, {
      longTermPoints: points,
      totalPoints:    FieldValue.increment(points),
    })
  }

  await batch.commit()
  return { message: `Puntos Pre-Mundial calculados para ${snap.size} usuarios.` }
})
