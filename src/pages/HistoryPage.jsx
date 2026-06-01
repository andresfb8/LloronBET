import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { useMatches } from '../hooks/useMatches'
import Spinner from '../components/ui/Spinner'

const TABS = ['Todos', 'Acertados', 'Fallados', 'Pendientes']

const LABEL_1X2 = { home: 'Local', draw: 'Empate', away: 'Visitante' }

export default function HistoryPage() {
  const { user }                = useAuth()
  const navigate                = useNavigate()
  const { matches, loading: loadingMatches } = useMatches()
  const [preds, setPreds]       = useState([])
  const [loadingPreds, setLoadingPreds] = useState(true)
  const [activeTab, setActiveTab] = useState('Todos')

  useEffect(() => {
    getDocs(query(collection(db, 'predictions'), where('userId', '==', user.uid)))
      .then(snap => setPreds(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .finally(() => setLoadingPreds(false))
  }, [user.uid])

  const matchesMap = useMemo(() => {
    const m = new Map()
    matches.forEach(match => m.set(match.id, match))
    return m
  }, [matches])

  const enriched = useMemo(() => {
    return preds
      .map(p => ({ ...p, match: matchesMap.get(p.matchId) }))
      .filter(p => p.match)
      .sort((a, b) => {
        const dtA = a.match.datetime?.toDate ? a.match.datetime.toDate() : new Date(a.match.datetime)
        const dtB = b.match.datetime?.toDate ? b.match.datetime.toDate() : new Date(b.match.datetime)
        return dtB - dtA
      })
  }, [preds, matchesMap])

  const filtered = useMemo(() => {
    if (activeTab === 'Acertados')  return enriched.filter(p => p.points_won != null && p.points_won > 0)
    if (activeTab === 'Fallados')   return enriched.filter(p => p.points_won != null && p.points_won === 0)
    if (activeTab === 'Pendientes') return enriched.filter(p => p.points_won == null)
    return enriched
  }, [enriched, activeTab])

  const loading = loadingMatches || loadingPreds

  return (
    <div className="px-4 py-4 flex flex-col gap-4 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/profile')} className="text-muted hover:text-white transition-colors text-lg">‹</button>
        <h2 className="font-display text-xl font-bold text-white">Mi historial</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-display font-semibold transition-colors ${
              activeTab === tab ? 'bg-primary text-white' : 'bg-surface border border-border text-muted'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner className="mt-8" />
      ) : filtered.length === 0 ? (
        <div className="text-center mt-12">
          <p className="text-muted text-sm">Sin predicciones en esta categoría.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          {filtered.map((p, i) => {
            const match   = p.match
            const dt      = match.datetime?.toDate ? match.datetime.toDate() : new Date(match.datetime)
            const dateStr = format(dt, "d MMM · HH:mm", { locale: es })
            const pick    = p.market_1x2 ? LABEL_1X2[p.market_1x2] : '—'
            const pts     = p.points_won

            return (
              <button
                key={p.id}
                onClick={() => navigate(`/match/${match.id}`)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-odds-default transition-colors ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-semibold text-white truncate">
                    {match.homeTeam} vs {match.awayTeam}
                  </p>
                  <p className="text-xs text-muted capitalize">{dateStr}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  <span className="text-xs font-display font-semibold text-muted bg-odds-default px-2 py-0.5 rounded-full">
                    {pick}
                  </span>
                  <span className={`text-sm font-display font-bold w-12 text-right ${
                    pts == null    ? 'text-muted' :
                    pts > 0        ? 'text-win'   : 'text-live'
                  }`}>
                    {pts == null ? '·' : pts > 0 ? `+${pts}` : '0'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
