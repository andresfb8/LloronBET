import { formatDistanceToNow, isPast, subMinutes } from 'date-fns'
import { es } from 'date-fns/locale'

export function isMarketOpen(datetime) {
  if (!datetime) return false
  const closeTime = subMinutes(datetime.toDate ? datetime.toDate() : new Date(datetime), 5)
  return !isPast(closeTime)
}

export function formatOdds(value) {
  if (!value) return '—'
  return Number(value).toFixed(2)
}

export function getMatchResult(finalScore) {
  if (!finalScore) return null
  if (finalScore.home > finalScore.away) return 'home'
  if (finalScore.home < finalScore.away) return 'away'
  return 'draw'
}

export function isBtts(finalScore) {
  if (!finalScore) return null
  return finalScore.home >= 1 && finalScore.away >= 1 ? 'yes' : 'no'
}

export function isOver(finalScore, line = 2.5) {
  if (!finalScore) return null
  return (finalScore.home + finalScore.away) > line ? 'over' : 'under'
}
