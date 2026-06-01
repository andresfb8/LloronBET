const { onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

const db = getFirestore()

const POINTS = {
  '1x2':     50,
  btts:      25,
  overunder: 15,
  exact:    100,
  qualifier: 20,
  bonus3:    30,
  bonusAll:  50,
}

function getResult(score) {
  if (score.home > score.away) return 'home'
  if (score.home < score.away) return 'away'
  return 'draw'
}

function isBtts(score) {
  return score.home >= 1 && score.away >= 1 ? 'yes' : 'no'
}

function isOver(score, line = 2.5) {
  return (score.home + score.away) > line ? 'over' : 'under'
}

exports.calculatePoints = onDocumentUpdated('matches/{matchId}', async (event) => {
  const before = event.data.before.data()
  const after  = event.data.after.data()

  // Solo actuar cuando el partido pasa a FT
  if (before.status === 'FT' || after.status !== 'FT') return
  if (!after.finalScore) return

  const { matchId } = event.params
  const score = after.finalScore

  const result    = getResult(score)
  const btts      = isBtts(score)
  const ou        = isOver(score)
  const isKnockout = !!after.qualifier
  const maxMarkets = isKnockout ? 5 : 4

  const predsSnap = await db.collection('predictions')
    .where('matchId', '==', matchId)
    .get()

  const batch = db.batch()

  for (const predDoc of predsSnap.docs) {
    const pred = predDoc.data()

    const breakdown = {
      market_1x2:  0,
      btts:        0,
      overunder:   0,
      exact_score: 0,
      qualifier:   0,
      bonus:       0,
    }

    if (pred.market_1x2 === result)   breakdown.market_1x2  = POINTS['1x2']
    if (pred.market_btts === btts)    breakdown.btts         = POINTS.btts
    if (pred.market_overunder === ou) breakdown.overunder    = POINTS.overunder

    if (
      pred.exact_score &&
      pred.exact_score.home === score.home &&
      pred.exact_score.away === score.away
    ) {
      breakdown.exact_score = POINTS.exact
    }

    if (isKnockout && after.qualifier && pred.market_qualifier === after.qualifier) {
      breakdown.qualifier = POINTS.qualifier
    }

    // Count correct markets (bonus logic)
    const correctCount = [
      breakdown.market_1x2,
      breakdown.btts,
      breakdown.overunder,
      breakdown.exact_score,
      breakdown.qualifier,
    ].filter(v => v > 0).length

    if (correctCount >= 3) breakdown.bonus = POINTS.bonus3
    if (correctCount === maxMarkets) breakdown.bonus = POINTS.bonusAll  // overrides bonus3

    const pointsWon = Object.values(breakdown).reduce((a, b) => a + b, 0)

    batch.update(predDoc.ref, {
      points_won:       pointsWon,
      points_breakdown: breakdown,
    })

    const userRef = db.collection('users').doc(pred.userId)
    batch.update(userRef, {
      totalPoints: FieldValue.increment(pointsWon),
    })
  }

  await batch.commit()
})
