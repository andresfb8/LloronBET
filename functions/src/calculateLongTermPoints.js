const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

const db = getFirestore()

const POINTS = {
  champion:  100,
  runnerUp:   80,
  topScorer:  50,
  group:      25,
}

/**
 * scope = 'groups'  → calcula solo puntos de clasificados por grupo (+25 c/u)
 * scope = 'finals'  → calcula solo campeón + subcampeón + bota de oro
 *
 * Guarda groupPoints / finalsPoints por separado para evitar doble conteo
 * si se recalcula. El delta (newPoints - prevPoints) se suma a totalPoints.
 */
exports.calculateLongTermPoints = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'No autorizado')

  const callerDoc = await db.collection('users').doc(request.auth.uid).get()
  if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Acceso denegado')
  }

  const { scope, champion, runnerUp, topScorer, groupResults } = request.data

  if (scope !== 'groups' && scope !== 'finals') {
    throw new HttpsError('invalid-argument', 'scope debe ser "groups" o "finals"')
  }
  if (scope === 'finals' && (!champion || !runnerUp || !topScorer)) {
    throw new HttpsError('invalid-argument', 'Faltan parámetros: champion, runnerUp, topScorer')
  }

  const snap  = await db.collection('longterm').get()
  const batch = db.batch()

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    let newPoints  = 0
    let updateFields = {}

    if (scope === 'groups') {
      const prev = data.groupPoints ?? 0
      if (data.groupPicks && groupResults) {
        for (const [group, picks] of Object.entries(data.groupPicks)) {
          if (!Array.isArray(picks)) continue
          const real = groupResults[group] ?? []
          for (const pick of picks) {
            if (real.includes(pick)) newPoints += POINTS.group
          }
        }
      }
      updateFields = { groupPoints: newPoints }
      const total = newPoints + (data.finalsPoints ?? 0)
      batch.update(docSnap.ref, { ...updateFields, points_won: total, isLocked: true })
      batch.update(db.collection('users').doc(data.userId), {
        longTermPoints: total,
        totalPoints:    FieldValue.increment(newPoints - prev),
      })

    } else {
      const prev = data.finalsPoints ?? 0
      if (data.champion  === champion)  newPoints += POINTS.champion
      if (data.runnerUp  === runnerUp)  newPoints += POINTS.runnerUp
      if (data.topScorer === topScorer) newPoints += POINTS.topScorer
      updateFields = { finalsPoints: newPoints }
      const total = (data.groupPoints ?? 0) + newPoints
      batch.update(docSnap.ref, { ...updateFields, points_won: total, isLocked: true })
      batch.update(db.collection('users').doc(data.userId), {
        longTermPoints: total,
        totalPoints:    FieldValue.increment(newPoints - prev),
      })
    }
  }

  await batch.commit()
  const label = scope === 'groups' ? 'grupos' : 'campeón/subcampeón/goleador'
  return { message: `Puntos Pre-Mundial (${label}) calculados para ${snap.size} usuarios.` }
})
