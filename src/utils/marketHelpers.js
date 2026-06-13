import { formatDistanceToNow, isPast, subMinutes } from 'date-fns'
import { es } from 'date-fns/locale'

// Cierra el mercado 30s antes que la regla del servidor (5 min) para
// absorber pequeños desfases de reloj del cliente y evitar que un guardado
// llegue a Firestore después de que la regla `marketIsOpen` ya lo rechace.
const CLIENT_SAFETY_BUFFER_MS = 30 * 1000

export function isMarketOpen(datetime) {
  if (!datetime) return false
  const closeTime = subMinutes(datetime.toDate ? datetime.toDate() : new Date(datetime), 5)
  return Date.now() < closeTime.getTime() - CLIENT_SAFETY_BUFFER_MS
}

export function formatOdds(value) {
  if (!value) return '—'
  return Number(value).toFixed(2)
}

export const MARKET_LABELS = {
  home: 'Local', draw: 'Empate', away: 'Visitante',
  yes: 'SÍ', no: 'NO',
  over: 'Más', under: 'Menos',
}

export function qualifierLabel(match, value) {
  return value === 'home' ? match.homeTeam : match.awayTeam
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
