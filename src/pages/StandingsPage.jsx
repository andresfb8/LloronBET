import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore'
import { isToday } from 'date-fns'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { useMatches } from '../hooks/useMatches'
import { useStandings } from '../hooks/useStandings'
import StandingsRow from '../components/standings/StandingsRow'
import Spinner from '../components/ui/Spinner'

const TABS = ['General', 'Hoy', 'Jornadas', 'Diversión']

// Misma definición que en AdminPage
const JORNADAS = [
  { key: 'Jornada 1',        label: 'Jornada 1',        filter: m => m.round === 'Fase de Grupos'        && m.matchday === 1 },
  { key: 'Jornada 2',        label: 'Jornada 2',        filter: m => m.round === 'Fase de Grupos'        && m.matchday === 2 },
  { key: 'Jornada 3',        label: 'Jornada 3',        filter: m => m.round === 'Fase de Grupos'        && m.matchday === 3 },
  { key: 'Ronda de 32',      label: 'Ronda de 32',      filter: m => m.round === 'Ronda de 32' },
  { key: 'Octavos de Final', label: 'Octavos de Final', filter: m => m.round === 'Octavos de Final' },
  { key: 'Cuartos de Final', label: 'Cuartos de Final', filter: m => m.round === 'Cuartos de Final' },
  { key: 'Semifinales',      label: 'Semifinales',      filter: m => m.round === 'Semifinales' },
  { key: 'Final',            label: 'Final',            filter: m => m.round === 'Final' || m.round === 'Tercer y Cuarto Puesto' },
]

export default function StandingsPage() {
  const { user }                       = useAuth()
  const { standings, loading }         = useStandings()
  const { matches }                    = useMatches()
  const [activeTab, setActiveTab]      = useState('General')
  const [todayPoints, setTodayPoints]  = useState(new Map())
  const [loadingToday, setLoadingToday] = useState(true)

  // Tab Jornadas state
  const [jornadaData, setJornadaData]   = useState(null)  // null = no cargado aún
  const [loadingJornadas, setLoadingJornadas] = useState(false)
  const [bonuses, setBonuses]           = useState({})

  // Cargar puntos de hoy
  useEffect(() => {
    let unsubPreds = null

    const unsubMatches = onSnapshot(
      query(collection(db, 'matches'), where('status', '==', 'FT')),
      async (snap) => {
        const todayMatchIds = snap.docs
          .filter(d => {
            const dt = d.data().datetime?.toDate?.() ?? new Date(d.data().datetime)
            return isToday(dt)
          })
          .map(d => d.id)

        if (todayMatchIds.length === 0) {
          setTodayPoints(new Map())
          setLoadingToday(false)
          return
        }

        if (unsubPreds) unsubPreds()
        unsubPreds = onSnapshot(
          query(collection(db, 'predictions'), where('matchId', 'in', todayMatchIds)),
          (predSnap) => {
            const map = new Map()
            predSnap.docs.forEach(d => {
              const p = d.data()
              if (p.points_won == null) return
              map.set(p.userId, (map.get(p.userId) ?? 0) + p.points_won)
            })
            setTodayPoints(map)
            setLoadingToday(false)
          }
        )
      }
    )

    return () => {
      unsubMatches()
      if (unsubPreds) unsubPreds()
    }
  }, [])

  // Cargar datos de jornadas (lazy, solo al activar la pestaña)
  useEffect(() => {
    if (activeTab !== 'Jornadas' || jornadaData !== null || matches.length === 0 || standings.length === 0) return

    async function loadJornadas() {
      setLoadingJornadas(true)
      try {
        // Cargar bonuses
        const bonusSnap = await getDoc(doc(db, 'config', 'bonuses'))
        const bonusData = bonusSnap.exists() ? bonusSnap.data() : {}
        setBonuses(bonusData)

        // Construir mapa uid → username
        const usersMap = new Map(standings.map(s => [s.uid ?? s.id, s.username]))

        const result = {}
        for (const jornada of JORNADAS) {
          const ftMatches = matches.filter(m => jornada.filter(m) && m.status === 'FT')
          if (ftMatches.length === 0) { result[jornada.key] = []; continue }

          const ids = ftMatches.map(m => m.id)
          const predsSnap = await getDocs(
            query(collection(db, 'predictions'), where('matchId', 'in', ids))
          )

          const ptsByUser = new Map()
          predsSnap.docs.forEach(d => {
            const p = d.data()
            if (p.points_won == null) return
            ptsByUser.set(p.userId, (ptsByUser.get(p.userId) ?? 0) + p.points_won)
          })

          result[jornada.key] = Array.from(ptsByUser.entries())
            .map(([uid, pts]) => ({ uid, username: usersMap.get(uid) ?? '—', pts }))
            .sort((a, b) => b.pts - a.pts)
        }
        setJornadaData(result)
      } finally {
        setLoadingJornadas(false)
      }
    }

    loadJornadas()
  }, [activeTab, jornadaData, matches, standings])

  const generalRows = useMemo(() =>
    [...standings].sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0)),
    [standings]
  )

  const todayRows = useMemo(() => {
    if (!standings.length) return []
    return standings
      .map(p => ({ ...p, todayPts: todayPoints.get(p.uid ?? p.id) ?? 0 }))
      .sort((a, b) => b.todayPts - a.todayPts)
  }, [standings, todayPoints])

  if (loading) return <Spinner className="mt-16" />

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      <h2 className="font-display text-2xl font-bold text-white">Clasificación</h2>

      {/* Tabs */}
      <div className="flex bg-surface rounded-xl p-1 border border-border gap-0.5">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-xs font-display font-semibold transition-colors ${
              activeTab === tab ? 'bg-primary text-white' : 'text-muted'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* General */}
      {activeTab === 'General' && (
        <div className="bg-surface border border-border rounded-xl px-4">
          {generalRows.length === 0
            ? <EmptyState text="Sin puntuaciones todavía" />
            : generalRows.map((profile, i) => (
                <StandingsRow
                  key={profile.uid ?? profile.id}
                  position={i + 1}
                  profile={profile}
                  points={profile.totalPoints ?? 0}
                  isCurrentUser={(profile.uid ?? profile.id) === user?.uid}
                />
              ))
          }
        </div>
      )}

      {/* Hoy */}
      {activeTab === 'Hoy' && (
        <div className="bg-surface border border-border rounded-xl px-4">
          {loadingToday
            ? <Spinner className="py-8" />
            : todayRows.filter(r => r.todayPts > 0).length === 0
              ? <EmptyState text="Aún no hay puntos de hoy" />
              : todayRows.filter(r => r.todayPts > 0).map((profile, i) => (
                  <StandingsRow
                    key={profile.uid ?? profile.id}
                    position={i + 1}
                    profile={profile}
                    points={profile.todayPts}
                    isCurrentUser={(profile.uid ?? profile.id) === user?.uid}
                  />
                ))
          }
        </div>
      )}

      {/* Jornadas */}
      {activeTab === 'Jornadas' && (
        loadingJornadas || jornadaData === null
          ? <Spinner className="mt-8" />
          : <JornadasTab jornadaData={jornadaData} bonuses={bonuses} currentUid={user?.uid} />
      )}

      {/* Diversión */}
      {activeTab === 'Diversión' && (
        <FunTab standings={standings} currentUid={user?.uid} />
      )}
    </div>
  )
}

/* ─── Tab Jornadas ─── */
function JornadasTab({ jornadaData, bonuses, currentUid }) {
  const [openKey, setOpenKey] = useState(null)

  // Auto-abrir la primera jornada con datos
  const firstWithData = JORNADAS.find(j => (jornadaData[j.key] ?? []).length > 0)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted px-1">El líder de cada jornada recibe <span className="text-odds font-semibold">+200 pts</span> extra (otorgados por el admin al cierre de la jornada).</p>

      {JORNADAS.map(jornada => {
        const rank       = jornadaData[jornada.key] ?? []
        const closed     = !!bonuses[jornada.key]
        const hasFt      = rank.length > 0
        const isOpen     = openKey === jornada.key || (!openKey && jornada.key === firstWithData?.key)
        const winnerUids = bonuses[jornada.key] ?? []

        return (
          <div key={jornada.key} className="bg-surface border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left"
              onClick={() => setOpenKey(isOpen ? null : jornada.key)}
            >
              <span className="font-display font-semibold text-sm text-white">{jornada.label}</span>
              <div className="flex items-center gap-2">
                {closed && <span className="text-xs bg-win/20 text-win font-display font-semibold px-2 py-0.5 rounded-full">🏆 +200 asignados</span>}
                {!closed && hasFt && <span className="text-xs bg-odds/20 text-odds font-display font-semibold px-2 py-0.5 rounded-full">⏳ En curso</span>}
                {!hasFt && <span className="text-xs text-muted font-display">Pendiente</span>}
                <span className={`text-muted text-sm transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
              </div>
            </button>

            {/* Ranking */}
            {isOpen && hasFt && (
              <div className="border-t border-border px-4 pb-2">
                {rank.map((r, i) => {
                  const isWinner  = winnerUids.includes(r.uid)
                  const isMe      = r.uid === currentUid
                  return (
                    <div
                      key={r.uid}
                      className={`flex items-center gap-3 py-2.5 border-b border-border last:border-0 ${isMe ? 'bg-primary/10 -mx-4 px-4 rounded-lg' : ''}`}
                    >
                      <span className={`font-display font-bold text-base w-6 text-center flex-shrink-0 ${i === 0 ? 'text-[#FFD700]' : i === 1 ? 'text-[#C0C0C0]' : i === 2 ? 'text-[#CD7F32]' : 'text-muted'}`}>
                        {i + 1}
                      </span>
                      <span className={`font-body font-semibold text-sm flex-1 truncate ${isMe ? 'text-odds' : 'text-white'}`}>
                        {r.username}
                        {isMe && <span className="text-xs text-muted font-normal ml-1">(tú)</span>}
                      </span>
                      <div className="flex items-center gap-2">
                        {isWinner && <span className="text-xs font-display font-bold text-win">+200 pts</span>}
                        <span className="font-display font-bold text-base text-white tabular-nums">{r.pts}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {isOpen && !hasFt && (
              <div className="border-t border-border px-4 py-4">
                <p className="text-muted text-sm text-center">No hay partidos terminados en esta jornada todavía.</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Tab Diversión ─── */
function FunTab({ standings, currentUid }) {
  const byVisits = useMemo(() =>
    [...standings]
      .map(p => ({ ...p, visits: p.visitCount ?? 0 }))
      .sort((a, b) => b.visits - a.visits)
      .filter(p => p.visits > 0),
    [standings]
  )

  const byChanges = useMemo(() =>
    [...standings]
      .map(p => ({ ...p, changes: p.predictionChanges ?? 0 }))
      .sort((a, b) => b.changes - a.changes)
      .filter(p => p.changes > 0),
    [standings]
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Más enganchado */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <div>
          <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted">🔥 Más enganchado</span>
          <p className="text-xs text-muted mt-0.5">Veces que ha abierto la app</p>
        </div>
        {byVisits.length === 0
          ? <p className="text-muted text-sm text-center py-2">Sin datos todavía</p>
          : <div className="flex flex-col">
              {byVisits.map((p, i) => {
                const isMe = (p.uid ?? p.id) === currentUid
                return (
                  <div key={p.uid ?? p.id} className={`flex items-center gap-3 py-2.5 border-b border-border last:border-0 ${isMe ? 'bg-primary/10 -mx-4 px-4 rounded-lg' : ''}`}>
                    <span className={`font-display font-bold text-base w-6 text-center flex-shrink-0 ${i === 0 ? 'text-[#FFD700]' : i === 1 ? 'text-[#C0C0C0]' : i === 2 ? 'text-[#CD7F32]' : 'text-muted'}`}>{i + 1}</span>
                    <span className={`font-body font-semibold text-sm flex-1 truncate ${isMe ? 'text-odds' : 'text-white'}`}>
                      {p.username}{isMe && <span className="text-xs text-muted font-normal ml-1">(tú)</span>}
                    </span>
                    <span className="font-display font-bold text-sm text-muted tabular-nums">{p.visits} visitas</span>
                  </div>
                )
              })}
            </div>
        }
      </div>

      {/* Más indeciso */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <div>
          <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted">🤔 Más indeciso</span>
          <p className="text-xs text-muted mt-0.5">Veces que ha cambiado una predicción ya guardada</p>
        </div>
        {byChanges.length === 0
          ? <p className="text-muted text-sm text-center py-2">Sin cambios todavía</p>
          : <div className="flex flex-col">
              {byChanges.map((p, i) => {
                const isMe = (p.uid ?? p.id) === currentUid
                return (
                  <div key={p.uid ?? p.id} className={`flex items-center gap-3 py-2.5 border-b border-border last:border-0 ${isMe ? 'bg-primary/10 -mx-4 px-4 rounded-lg' : ''}`}>
                    <span className={`font-display font-bold text-base w-6 text-center flex-shrink-0 ${i === 0 ? 'text-[#FFD700]' : i === 1 ? 'text-[#C0C0C0]' : i === 2 ? 'text-[#CD7F32]' : 'text-muted'}`}>{i + 1}</span>
                    <span className={`font-body font-semibold text-sm flex-1 truncate ${isMe ? 'text-odds' : 'text-white'}`}>
                      {p.username}{isMe && <span className="text-xs text-muted font-normal ml-1">(tú)</span>}
                    </span>
                    <span className="font-display font-bold text-sm text-muted tabular-nums">{p.changes} cambios</span>
                  </div>
                )
              })}
            </div>
        }
      </div>
    </div>
  )
}

function EmptyState({ text }) {
  return (
    <div className="py-10 text-center text-muted text-sm">{text}</div>
  )
}
