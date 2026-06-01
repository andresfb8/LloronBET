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
function isBtts(score)  { return score.home >= 1 && score.away >= 1 ? 'yes' : 'no' }
function isOver(score)  { return (score.home + score.away) > 2.5 ? 'over' : 'under' }

// ── Badge logic ────────────────────────────────────────────────────────────

function maxStreak(preds, matchesMap) {
  const settled = preds
    .filter(p => p.market_1x2 != null && matchesMap.has(p.matchId))
    .map(p => {
      const ts = matchesMap.get(p.matchId).datetime
      const dt = ts?.toDate ? ts.toDate() : new Date(ts)
      return { dt, hit: (p.points_breakdown?.market_1x2 ?? 0) > 0 }
    })
    .sort((a, b) => a.dt - b.dt)

  let streak = 0, max = 0
  for (const { hit } of settled) {
    streak = hit ? streak + 1 : 0
    if (streak > max) max = streak
  }
  return max
}

function earnedBadges(preds, matchesMap) {
  const out = []
  if (preds.some(p => (p.points_breakdown?.market_1x2  ?? 0) > 0)) out.push('first_correct')
  if (preds.some(p => (p.points_breakdown?.exact_score ?? 0) > 0)) out.push('first_exact')

  const ms = maxStreak(preds, matchesMap)
  if (ms >= 3) out.push('streak_3')
  if (ms >= 5) out.push('streak_5')

  if (preds.some(p =>
    (p.points_breakdown?.market_1x2 ?? 0) > 0 &&
    (p.points_breakdown?.btts        ?? 0) > 0 &&
    (p.points_breakdown?.overunder   ?? 0) > 0
  )) out.push('perfect_match')

  if (preds.filter(p => (p.points_breakdown?.exact_score ?? 0) > 0).length >= 3)
    out.push('three_exacts')

  if (preds.filter(p => p.market_1x2 != null).length >= 20)
    out.push('veteran')

  return out
}

async function checkBadges(userId) {
  try {
    // Load all user's predictions
    const predsSnap = await db.collection('predictions').where('userId', '==', userId).get()
    const settled   = predsSnap.docs.map(d => d.data()).filter(p => p.points_won != null)

    // Load match timestamps needed for streak
    const matchIds = [...new Set(settled.filter(p => p.market_1x2 != null).map(p => p.matchId))]
    const matchesMap = new Map()
    if (matchIds.length > 0) {
      const refs  = matchIds.map(id => db.collection('matches').doc(id))
      const snaps = await db.getAll(...refs)
      snaps.forEach(s => { if (s.exists) matchesMap.set(s.id, s.data()) })
    }

    const earned = earnedBadges(settled, matchesMap)

    const userSnap     = await db.collection('users').doc(userId).get()
    const currentBadges = userSnap.data()?.badges ?? []
    const newBadges     = earned.filter(b => !currentBadges.includes(b))

    if (newBadges.length > 0) {
      await db.collection('users').doc(userId).update({
        badges:    FieldValue.arrayUnion(...newBadges),
        newBadges: FieldValue.arrayUnion(...newBadges),
      })
    }
  } catch (err) {
    console.error(`Badge check failed for ${userId}:`, err)
  }
}

// ── Main trigger ───────────────────────────────────────────────────────────

exports.calculatePoints = onDocumentUpdated('matches/{matchId}', async (event) => {
  const before = event.data.before.data()
  const after  = event.data.after.data()

  if (before.status === 'FT' || after.status !== 'FT') return
  if (!after.finalScore) return

  const { matchId } = event.params
  const score       = after.finalScore
  const result      = getResult(score)
  const btts        = isBtts(score)
  const ou          = isOver(score)
  const isKnockout  = !!after.qualifier
  const maxMarkets  = isKnockout ? 5 : 4

  const predsSnap = await db.collection('predictions').where('matchId', '==', matchId).get()
  const batch     = db.batch()

  for (const predDoc of predsSnap.docs) {
    const pred = predDoc.data()

    const breakdown = { market_1x2: 0, btts: 0, overunder: 0, exact_score: 0, qualifier: 0, bonus: 0 }

    if (pred.market_1x2 === result)   breakdown.market_1x2  = POINTS['1x2']
    if (pred.market_btts === btts)    breakdown.btts         = POINTS.btts
    if (pred.market_overunder === ou) breakdown.overunder    = POINTS.overunder

    if (pred.exact_score &&
        pred.exact_score.home === score.home &&
        pred.exact_score.away === score.away) {
      breakdown.exact_score = POINTS.exact
    }

    if (isKnockout && after.qualifier && pred.market_qualifier === after.qualifier) {
      breakdown.qualifier = POINTS.qualifier
    }

    const correctCount = [
      breakdown.market_1x2, breakdown.btts, breakdown.overunder,
      breakdown.exact_score, breakdown.qualifier,
    ].filter(v => v > 0).length

    if (correctCount >= 3)            breakdown.bonus = POINTS.bonus3
    if (correctCount === maxMarkets)  breakdown.bonus = POINTS.bonusAll

    const pointsWon = Object.values(breakdown).reduce((a, b) => a + b, 0)

    batch.update(predDoc.ref, { points_won: pointsWon, points_breakdown: breakdown })
    batch.update(db.collection('users').doc(pred.userId), {
      totalPoints: FieldValue.increment(pointsWon),
    })
  }

  await batch.commit()

  // Check badges for all affected users (non-blocking on main points flow)
  const userIds = [...new Set(predsSnap.docs.map(d => d.data().userId))]
  await Promise.all(userIds.map(checkBadges))
})
