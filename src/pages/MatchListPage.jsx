import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, isTomorrow, isYesterday, addDays, startOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { useMatches } from '../hooks/useMatches'
import { useUserPredictions } from '../hooks/useUserPredictions'
import MatchCard from '../components/match/MatchCard'
import Spinner from '../components/ui/Spinner'

export default function MatchListPage() {
  const navigate = useNavigate()
  const { matches, loading: loadingMatches }           = useMatches()
  const { predictionsMap, loading: loadingPredictions } = useUserPredictions()
  const [now, setNow] = useState(() => Date.now())

  // Refresh countdown every 30s
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const { windowMatches, inauguralMatch, showPreBanner } = useMemo(() => {
    if (matches.length === 0) return { windowMatches: [], inauguralMatch: null, showPreBanner: false }

    const today      = startOfDay(new Date())
    const todayKey   = format(today, 'yyyy-MM-dd')
    const maxKey     = format(addDays(today, 2), 'yyyy-MM-dd')

    const window = matches.filter(m => {
      const dt  = m.datetime?.toDate ? m.datetime.toDate() : new Date(m.datetime)
      const key = format(dt, 'yyyy-MM-dd')
      return key >= todayKey && key <= maxKey
    })

    const inaugural = matches
      .filter(m => m.status === 'NS')
      .sort((a, b) => {
        const dtA = a.datetime?.toDate ? a.datetime.toDate() : new Date(a.datetime)
        const dtB = b.datetime?.toDate ? b.datetime.toDate() : new Date(b.datetime)
        return dtA - dtB
      })[0] ?? null

    const preBanner = window.length === 0 && inaugural !== null

    return { windowMatches: window, inauguralMatch: inaugural, showPreBanner: preBanner }
  }, [matches])

  // Matches closing in <60 min without a prediction
  const urgentMatches = useMemo(() => {
    return windowMatches.filter(m => {
      if (predictionsMap.has(m.id)) return false
      if (m.status !== 'NS') return false
      const dt      = m.datetime?.toDate ? m.datetime.toDate() : new Date(m.datetime)
      const minsLeft = (dt.getTime() - now) / 60_000
      return minsLeft > 0 && minsLeft < 60
    })
  }, [windowMatches, predictionsMap, now])

  const displayMatches = windowMatches.length > 0
    ? windowMatches
    : (inauguralMatch ? [inauguralMatch] : [])

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

      {/* Banners de urgencia: partidos en <60 min sin apostar */}
      {urgentMatches.map(m => {
        const dt      = m.datetime?.toDate ? m.datetime.toDate() : new Date(m.datetime)
        const minsLeft = Math.ceil((dt.getTime() - now) / 60_000)
        return (
          <div key={m.id} className="bg-odds/10 border border-odds/40 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base shrink-0">⚡</span>
              <div className="min-w-0">
                <p className="text-white font-body font-semibold text-sm truncate">{m.homeTeam} vs {m.awayTeam}</p>
                <p className="text-odds text-xs font-display font-semibold">Empieza en {minsLeft} min</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/match/${m.id}`)}
              className="shrink-0 bg-odds text-bg font-display font-bold text-xs px-3 py-1.5 rounded-lg"
            >
              Apostar →
            </button>
          </div>
        )
      })}

      {/* Banner Pre-Mundial */}
      {showPreBanner && (
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌍</span>
            <div>
              <p className="text-white font-display font-bold text-sm">Antes del pitido inicial…</p>
              <p className="text-muted text-xs mt-0.5">Haz tus pronósticos Pre-Mundial antes de que arranque el torneo.</p>
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

      {/* Lista de partidos */}
      {grouped.map(([dateKey, dayMatches]) => (
        <section key={dateKey}>
          <h3 className="text-xs font-display font-semibold uppercase tracking-widest text-muted mb-3">
            {showPreBanner ? `Primer partido · ${formatDayLabel(dateKey)}` : formatDayLabel(dateKey)}
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
  if (isTomorrow(date))  return 'Mañana'
  if (isYesterday(date)) return 'Ayer'
  return format(date, "EEEE d 'de' MMMM", { locale: es })
}
