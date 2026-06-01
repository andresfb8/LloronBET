import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, isToday, isTomorrow, isYesterday, addDays, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { useMatches } from '../hooks/useMatches'
import { useUserPredictions } from '../hooks/useUserPredictions'
import MatchCard from '../components/match/MatchCard'
import Spinner from '../components/ui/Spinner'

export default function MatchListPage() {
  const navigate = useNavigate()
  const { matches, loading: loadingMatches }           = useMatches()
  const { predictionsMap, loading: loadingPredictions } = useUserPredictions()

  const { windowMatches, inauguralMatch, showPreBanner } = useMemo(() => {
    if (matches.length === 0) return { windowMatches: [], inauguralMatch: null, showPreBanner: false }

    const today      = startOfDay(new Date())
    const todayKey   = format(today, 'yyyy-MM-dd')
    const maxKey     = format(addDays(today, 2), 'yyyy-MM-dd')  // today + 2 = 3 calendar days

    // 3-day window: today, tomorrow, day after tomorrow
    const window = matches.filter(m => {
      const dt  = m.datetime?.toDate ? m.datetime.toDate() : new Date(m.datetime)
      const key = format(dt, 'yyyy-MM-dd')
      return key >= todayKey && key <= maxKey
    })

    // Earliest NS match (inaugural or next upcoming)
    const inaugural = matches
      .filter(m => m.status === 'NS')
      .sort((a, b) => {
        const dtA = a.datetime?.toDate ? a.datetime.toDate() : new Date(a.datetime)
        const dtB = b.datetime?.toDate ? b.datetime.toDate() : new Date(b.datetime)
        return dtA - dtB
      })[0] ?? null

    // Pre-tournament banner: window is empty but there are future matches
    const preBanner = window.length === 0 && inaugural !== null

    return {
      windowMatches:  window,
      inauguralMatch: inaugural,
      showPreBanner:  preBanner,
    }
  }, [matches])

  // Matches to display
  const displayMatches = windowMatches.length > 0
    ? windowMatches
    : (inauguralMatch ? [inauguralMatch] : [])

  // Group by day
  const grouped = useMemo(() => {
    const map = new Map()
    for (const match of displayMatches) {
      const dt  = match.datetime?.toDate ? match.datetime.toDate() : new Date(match.datetime)
      const key = format(dt, 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(match)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [displayMatches])

  if (loadingMatches || loadingPredictions) {
    return <Spinner className="mt-16" />
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-24 gap-2 px-6 text-center">
        <span className="text-4xl">⚽</span>
        <p className="text-white font-display text-lg font-semibold">Sin partidos todavía</p>
        <p className="text-muted text-sm">El administrador cargará los partidos antes del torneo.</p>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-6">

      {/* Banner Pre-Mundial (solo cuando aún no hay partidos en los próximos 3 días) */}
      {showPreBanner && (
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌍</span>
            <div>
              <p className="text-white font-display font-bold text-sm">Antes del pitido inicial…</p>
              <p className="text-muted text-xs mt-0.5">
                Haz tus pronósticos Pre-Mundial antes de que arranque el torneo.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/longterm')}
            className="w-full bg-primary hover:bg-primary/80 text-white font-display font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            Ir a Pre-Mundial →
          </button>
        </div>
      )}

      {/* Lista de partidos (ventana de 3 días o partido inaugural) */}
      {grouped.map(([dateKey, dayMatches]) => (
        <section key={dateKey}>
          <h3 className="text-xs font-display font-semibold uppercase tracking-widest text-muted mb-3">
            {showPreBanner
              ? `Primer partido · ${formatDayLabel(dateKey)}`
              : formatDayLabel(dateKey)
            }
          </h3>
          <div className="flex flex-col gap-2">
            {dayMatches.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predictionsMap.get(match.id) ?? null}
              />
            ))}
          </div>
        </section>
      ))}

    </div>
  )
}

function formatDayLabel(dateKey) {
  const date = new Date(dateKey + 'T12:00:00')
  if (isToday(date))     return 'Hoy'
  if (isTomorrow(date))  return 'Mañana'
  if (isYesterday(date)) return 'Ayer'
  return format(date, "EEEE d 'de' MMMM", { locale: es })
}
