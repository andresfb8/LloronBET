import { getMatchResult, isBtts, isOver } from './marketHelpers'

export function calculatePoints(prediction, finalScore) {
  if (!finalScore || !prediction) return null

  const result = getMatchResult(finalScore)
  const btts   = isBtts(finalScore)
  const ou     = isOver(finalScore)

  const breakdown = {
    market_1x2:      0,
    btts:            0,
    overunder:       0,
    exact_score:     0,
  }

  const odds = prediction.odds_at_close || {}

  if (prediction.market_1x2 && prediction.market_1x2 === result && odds['1x2']) {
    breakdown.market_1x2 = odds['1x2'] * 10
  }
  if (prediction.market_btts && prediction.market_btts === btts && odds.btts) {
    breakdown.btts = odds.btts * 10
  }
  if (prediction.market_overunder && prediction.market_overunder === ou && odds.overunder) {
    breakdown.overunder = odds.overunder * 10
  }
  if (
    prediction.exact_score &&
    prediction.exact_score.home === finalScore.home &&
    prediction.exact_score.away === finalScore.away
  ) {
    breakdown.exact_score = 25
  }

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0)
  return { points_won: total, points_breakdown: breakdown }
}
