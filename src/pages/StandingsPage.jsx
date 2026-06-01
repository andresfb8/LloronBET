import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore'
import { isToday } from 'date-fns'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { useMatches } from '../hooks/useMatches'
import { useStandings } from '../hooks/useStandings'
import StandingsRow from '../components/standings/StandingsRow'
import Spinner from '../components/ui/Spinner'

const TABS = ['General', 'Hoy', 'Jornadas', 'Diversión', 'Mis Stats', 'H2H']

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

// ── Helpers de cálculo ──────────────────────────────────────────────────────

function computeStreak(preds, matchesMap) {
  const settled = preds
    .filter(p => p.market_1x2 != null && p.points_won != null && matchesMap.has(p.matchId))
    .map(p => {
      const match = matchesMap.get(p.matchId)
      const dt    = match.datetime?.toDate ? match.datetime.toDate() : new Date(match.datetime)
      return { dt, hit: (p.points_breakdown?.market_1x2 ?? 0) > 0 }
    })
    .sort((a, b) => a.dt - b.dt)

  let streak = 0, maxStreak = 0
  for (const { hit } of settled) {
    streak = hit ? streak + 1 : 0
    if (streak > maxStreak) maxStreak = streak
  }
  return { currentStreak: streak, maxStreak, total: settled.length }
}

function computeAccuracy(preds) {
  const markets = [
    { key: 'market_1x2',       bdKey: 'market_1x2', label: '1x2 — Resultado' },
    { key: 'market_btts',      bdKey: 'btts',        label: 'Ambos Marcan' },
    { key: 'market_overunder', bdKey: 'overunder',   label: 'Over/Under 2.5' },
    { key: 'exact_score',      bdKey: 'exact_score', label: 'Marcador Exacto' },
  ]
  return markets.map(({ key, bdKey, label }) => {
    const settled = preds.filter(p => p[key] != null && p.points_won != null)
    if (settled.length === 0) return { label, correct: 0, total: 0, pct: null }
    const correct = settled.filter(p => (p.points_breakdown?.[bdKey] ?? 0) > 0).length
    return { label, correct, total: settled.length, pct: Math.round((correct / settled.length) * 100) }
  })
}

// ── Página principal ────────────────────────────────────────────────────────

export default function StandingsPage() {
  const { user }                        = useAuth()
  const { standings, loading }          = useStandings()
  const { matches }                     = useMatches()
  const [activeTab, setActiveTab]       = useState('General')
  const [todayPoints, setTodayPoints]   = useState(new Map())
  const [loadingToday, setLoadingToday] = useState(true)

  const [jornadaData, setJornadaData]         = useState(null)
  const [loadingJornadas, setLoadingJornadas] = useState(false)
  const [bonuses, setBonuses]                 = useState({})

  const [streakData, setStreakData]         = useState(null)
  const [loadingStreaks, setLoadingStreaks] = useState(false)

  const [misStatsData, setMisStatsData]       = useState(null)
  const [loadingMisStats, setLoadingMisStats] = useState(false)

  const matchesMap = useMemo(() => {
    const m = new Map()
    matches.forEach(match => m.set(match.id, match))
    return m
  }, [matches])

  // Puntos de hoy
  useEffect(() => {
    let unsubPreds = null
    const unsubMatches = onSnapshot(
      query(collection(db, 'matches'), where('status', '==', 'FT')),
      async (snap) => {
        const todayIds = snap.docs
          .filter(d => {
            const dt = d.data().datetime?.toDate?.() ?? new Date(d.data().datetime)
            return isToday(dt)
          })
          .map(d => d.id)

        if (todayIds.length === 0) {
          setTodayPoints(new Map())
          setLoadingToday(false)
          return
        }

        if (unsubPreds) unsubPreds()
        unsubPreds = onSnapshot(
          query(collection(db, 'predictions'), where('matchId', 'in', todayIds)),
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
    return () => { unsubMatches(); if (unsubPreds) unsubPreds() }
  }, [])

  // Jornadas (lazy)
  useEffect(() => {
    if (activeTab !== 'Jornadas' || jornadaData !== null || matches.length === 0 || standings.length === 0) return
    async function load() {
      setLoadingJornadas(true)
      try {
        const bonusSnap = await getDoc(doc(db, 'config', 'bonuses'))
        setBonuses(bonusSnap.exists() ? bonusSnap.data() : {})
        const usersMap  = new Map(standings.map(s => [s.uid ?? s.id, s.username]))
        const result    = {}
        for (const jornada of JORNADAS) {
          const ftMatches = matches.filter(m => jornada.filter(m) && m.status === 'FT')
          if (ftMatches.length === 0) { result[jornada.key] = []; continue }
          const ids      = ftMatches.map(m => m.id)
          const predSnap = await getDocs(query(collection(db, 'predictions'), where('matchId', 'in', ids)))
          const ptsByUser = new Map()
          predSnap.docs.forEach(d => {
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
    load()
  }, [activeTab, jornadaData, matches, standings])

  // Rachas para Diversión (lazy)
  useEffect(() => {
    if (activeTab !== 'Diversión' || streakData !== null || matchesMap.size === 0) return
    async function load() {
      setLoadingStreaks(true)
      try {
        const snap     = await getDocs(collection(db, 'predictions'))
        const allPreds = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        const byUser   = new Map()
        for (const p of allPreds) {
          if (!byUser.has(p.userId)) byUser.set(p.userId, [])
          byUser.get(p.userId).push(p)
        }
        const result = new Map()
        for (const [uid, preds] of byUser.entries()) {
          result.set(uid, computeStreak(preds, matchesMap))
        }
        setStreakData(result)
      } finally {
        setLoadingStreaks(false)
      }
    }
    load()
  }, [activeTab, streakData, matchesMap])

  // Mis Stats (lazy)
  useEffect(() => {
    if (activeTab !== 'Mis Stats' || misStatsData !== null || !user || matchesMap.size === 0) return
    async function load() {
      setLoadingMisStats(true)
      try {
        const snap  = await getDocs(query(collection(db, 'predictions'), where('userId', '==', user.uid)))
        const preds = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setMisStatsData({ accuracy: computeAccuracy(preds), streak: computeStreak(preds, matchesMap) })
      } finally {
        setLoadingMisStats(false)
      }
    }
    load()
  }, [activeTab, misStatsData, user, matchesMap])

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

      {/* Tabs — scroll horizontal */}
      <div className="flex gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-display font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
              activeTab === tab ? 'bg-primary text-white' : 'bg-surface border border-border text-muted'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

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

      {activeTab === 'Jornadas' && (
        loadingJornadas || jornadaData === null
          ? <Spinner className="mt-8" />
          : <JornadasTab jornadaData={jornadaData} bonuses={bonuses} currentUid={user?.uid} />
      )}

      {activeTab === 'Diversión' && (
        <FunTab
          standings={standings}
          currentUid={user?.uid}
          streakData={streakData}
          loadingStreaks={loadingStreaks}
        />
      )}

      {activeTab === 'Mis Stats' && (
        loadingMisStats || misStatsData === null
          ? <Spinner className="mt-8" />
          : <MisStatsTab data={misStatsData} />
      )}

      {activeTab === 'H2H' && (
        <H2HTab standings={standings} matchesMap={matchesMap} />
      )}
    </div>
  )
}

/* ─── Tab Jornadas ─── */
function JornadasTab({ jornadaData, bonuses, currentUid }) {
  const [openKey, setOpenKey] = useState(null)
  const firstWithData = JORNADAS.find(j => (jornadaData[j.key] ?? []).length > 0)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted px-1">El líder de cada jornada recibe <span className="text-odds font-semibold">+200 pts</span> extra.</p>
      {JORNADAS.map(jornada => {
        const rank       = jornadaData[jornada.key] ?? []
        const closed     = !!bonuses[jornada.key]
        const hasFt      = rank.length > 0
        const isOpen     = openKey === jornada.key || (!openKey && jornada.key === firstWithData?.key)
        const winnerUids = bonuses[jornada.key] ?? []

        return (
          <div key={jornada.key} className="bg-surface border border-border rounded-xl overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3 text-left"
              onClick={() => setOpenKey(isOpen ? null : jornada.key)}>
              <span className="font-display font-semibold text-sm text-white">{jornada.label}</span>
              <div className="flex items-center gap-2">
                {closed  && <span className="text-xs bg-win/20 text-win font-display font-semibold px-2 py-0.5 rounded-full">🏆 +200 asignados</span>}
                {!closed && hasFt && <span className="text-xs bg-odds/20 text-odds font-display font-semibold px-2 py-0.5 rounded-full">⏳ En curso</span>}
                {!hasFt  && <span className="text-xs text-muted font-display">Pendiente</span>}
                <span className={`text-muted text-sm transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
              </div>
            </button>
            {isOpen && hasFt && (
              <div className="border-t border-border px-4 pb-2">
                {rank.map((r, i) => {
                  const isWinner = winnerUids.includes(r.uid)
                  const isMe     = r.uid === currentUid
                  return (
                    <div key={r.uid} className={`flex items-center gap-3 py-2.5 border-b border-border last:border-0 ${isMe ? 'bg-primary/10 -mx-4 px-4 rounded-lg' : ''}`}>
                      <span className={`font-display font-bold text-base w-6 text-center flex-shrink-0 ${i === 0 ? 'text-[#FFD700]' : i === 1 ? 'text-[#C0C0C0]' : i === 2 ? 'text-[#CD7F32]' : 'text-muted'}`}>{i + 1}</span>
                      <span className={`font-body font-semibold text-sm flex-1 truncate ${isMe ? 'text-odds' : 'text-white'}`}>
                        {r.username}{isMe && <span className="text-xs text-muted font-normal ml-1">(tú)</span>}
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
                <p className="text-muted text-sm text-center">Sin partidos terminados todavía.</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Tab Diversión ─── */
function FunTab({ standings, currentUid, streakData, loadingStreaks }) {
  const byVisits = useMemo(() =>
    [...standings].map(p => ({ ...p, visits: p.visitCount ?? 0 }))
      .sort((a, b) => b.visits - a.visits).filter(p => p.visits > 0),
    [standings]
  )
  const byChanges = useMemo(() =>
    [...standings].map(p => ({ ...p, changes: p.predictionChanges ?? 0 }))
      .sort((a, b) => b.changes - a.changes).filter(p => p.changes > 0),
    [standings]
  )
  const byStreak = useMemo(() => {
    if (!streakData) return []
    return standings
      .map(p => {
        const uid = p.uid ?? p.id
        const sk  = streakData.get(uid)
        return { ...p, currentStreak: sk?.currentStreak ?? 0, maxStreak: sk?.maxStreak ?? 0 }
      })
      .sort((a, b) => b.currentStreak - a.currentStreak || b.maxStreak - a.maxStreak)
      .filter(p => p.maxStreak > 0)
  }, [standings, streakData])

  function RankRow({ p, i, right }) {
    const isMe = (p.uid ?? p.id) === currentUid
    return (
      <div className={`flex items-center gap-3 py-2.5 border-b border-border last:border-0 ${isMe ? 'bg-primary/10 -mx-4 px-4 rounded-lg' : ''}`}>
        <span className={`font-display font-bold text-base w-6 text-center flex-shrink-0 ${i === 0 ? 'text-[#FFD700]' : i === 1 ? 'text-[#C0C0C0]' : i === 2 ? 'text-[#CD7F32]' : 'text-muted'}`}>{i + 1}</span>
        <span className={`font-body font-semibold text-sm flex-1 truncate ${isMe ? 'text-odds' : 'text-white'}`}>
          {p.username}{isMe && <span className="text-xs text-muted font-normal ml-1">(tú)</span>}
        </span>
        <span className="font-display font-bold text-sm text-muted tabular-nums">{right}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Rachas */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <div>
          <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted">🔥 Rachas en 1x2</span>
          <p className="text-xs text-muted mt-0.5">Aciertos consecutivos en el resultado del partido</p>
        </div>
        {loadingStreaks
          ? <Spinner className="py-4" />
          : byStreak.length === 0
            ? <p className="text-muted text-sm text-center py-2">Sin rachas todavía</p>
            : <div className="flex flex-col">
                {byStreak.map((p, i) => (
                  <RankRow key={p.uid ?? p.id} p={p} i={i}
                    right={<>{p.currentStreak} actual · <span className="text-xs">máx {p.maxStreak}</span></>}
                  />
                ))}
              </div>
        }
      </div>

      {/* Más enganchado */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <div>
          <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted">📱 Más enganchado</span>
          <p className="text-xs text-muted mt-0.5">Veces que ha abierto la app</p>
        </div>
        {byVisits.length === 0
          ? <p className="text-muted text-sm text-center py-2">Sin datos</p>
          : <div className="flex flex-col">
              {byVisits.map((p, i) => <RankRow key={p.uid ?? p.id} p={p} i={i} right={`${p.visits} visitas`} />)}
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
          ? <p className="text-muted text-sm text-center py-2">Sin cambios</p>
          : <div className="flex flex-col">
              {byChanges.map((p, i) => <RankRow key={p.uid ?? p.id} p={p} i={i} right={`${p.changes} cambios`} />)}
            </div>
        }
      </div>
    </div>
  )
}

/* ─── Tab Mis Stats ─── */
function MisStatsTab({ data }) {
  const { accuracy, streak } = data
  const hasData = accuracy.some(m => m.total > 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Racha */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted">🔥 Tu racha en 1x2</span>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-odds-default rounded-xl p-3 text-center">
            <p className="text-xs text-muted mb-1">Racha actual</p>
            <p className="font-display font-bold text-4xl text-win">{streak.currentStreak}</p>
          </div>
          <div className="bg-odds-default rounded-xl p-3 text-center">
            <p className="text-xs text-muted mb-1">Mejor racha</p>
            <p className="font-display font-bold text-4xl text-odds">{streak.maxStreak}</p>
          </div>
        </div>
        {streak.total > 0 && (
          <p className="text-xs text-muted text-center">Sobre {streak.total} apuesta{streak.total !== 1 ? 's' : ''} de resultado liquidada{streak.total !== 1 ? 's' : ''}</p>
        )}
      </div>

      {/* % por mercado */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-4">
        <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted">📊 % de aciertos por mercado</span>
        {!hasData
          ? <p className="text-muted text-sm text-center py-2">Sin predicciones liquidadas todavía</p>
          : accuracy.filter(m => m.total > 0).map(({ label, correct, total, pct }) => (
              <div key={label} className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-body font-semibold text-white">{label}</span>
                  <span className="text-sm font-display font-bold text-white">
                    {pct}% <span className="text-xs text-muted font-normal">({correct}/{total})</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-odds-default overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))
        }
      </div>
    </div>
  )
}

/* ─── Tab H2H ─── */
function H2HTab({ standings, matchesMap }) {
  const [uid1, setUid1] = useState('')
  const [uid2, setUid2] = useState('')
  const [data1, setData1] = useState(null)
  const [data2, setData2] = useState(null)
  const [loading, setLoading] = useState(false)

  const user1 = standings.find(s => (s.uid ?? s.id) === uid1)
  const user2 = standings.find(s => (s.uid ?? s.id) === uid2)

  useEffect(() => {
    if (!uid1 || !uid2 || uid1 === uid2) { setData1(null); setData2(null); return }
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [snap1, snap2] = await Promise.all([
          getDocs(query(collection(db, 'predictions'), where('userId', '==', uid1))),
          getDocs(query(collection(db, 'predictions'), where('userId', '==', uid2))),
        ])
        if (cancelled) return
        const preds1 = snap1.docs.map(d => ({ id: d.id, ...d.data() }))
        const preds2 = snap2.docs.map(d => ({ id: d.id, ...d.data() }))
        setData1({ preds: preds1, accuracy: computeAccuracy(preds1), streak: computeStreak(preds1, matchesMap) })
        setData2({ preds: preds2, accuracy: computeAccuracy(preds2), streak: computeStreak(preds2, matchesMap) })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [uid1, uid2, matchesMap])

  // Duelo en partidos donde ambos apostaron 1x2 y está liquidado
  const duel = useMemo(() => {
    if (!data1 || !data2) return null
    const map1 = new Map(data1.preds.map(p => [p.matchId, p]))
    let w1 = 0, w2 = 0, draws = 0, total = 0
    for (const p2 of data2.preds) {
      const p1 = map1.get(p2.matchId)
      if (!p1 || p1.market_1x2 == null || p2.market_1x2 == null) continue
      if (p1.points_won == null || p2.points_won == null) continue
      const hit1 = (p1.points_breakdown?.market_1x2 ?? 0) > 0
      const hit2 = (p2.points_breakdown?.market_1x2 ?? 0) > 0
      total++
      if (hit1 && !hit2) w1++
      else if (hit2 && !hit1) w2++
      else draws++
    }
    return { w1, w2, draws, total }
  }, [data1, data2])

  const selectClass = "w-full bg-odds-default border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary"

  return (
    <div className="flex flex-col gap-4">
      {/* Selectores */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted">Selecciona dos jugadores</span>
        <select value={uid1} onChange={e => setUid1(e.target.value)} className={selectClass}>
          <option value="">Jugador 1</option>
          {standings.map(s => {
            const id = s.uid ?? s.id
            return <option key={id} value={id} disabled={id === uid2}>{s.username}</option>
          })}
        </select>
        <div className="text-center text-muted font-display font-bold text-sm">VS</div>
        <select value={uid2} onChange={e => setUid2(e.target.value)} className={selectClass}>
          <option value="">Jugador 2</option>
          {standings.map(s => {
            const id = s.uid ?? s.id
            return <option key={id} value={id} disabled={id === uid1}>{s.username}</option>
          })}
        </select>
      </div>

      {uid1 && uid2 && uid1 === uid2 && (
        <p className="text-center text-muted text-sm">Elige dos jugadores distintos.</p>
      )}

      {loading && <Spinner className="mt-4" />}

      {!loading && data1 && data2 && user1 && user2 && (
        <>
          {/* Puntos totales */}
          <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
            <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted">Puntos totales</span>
            <div className="grid grid-cols-3 items-center gap-2">
              <div className="text-center">
                <p className="font-display font-bold text-2xl text-white">{(user1.totalPoints ?? 0).toFixed(1)}</p>
                <p className="text-xs text-muted truncate">{user1.username}</p>
              </div>
              <p className="text-center text-muted font-display font-bold text-xs">pts</p>
              <div className="text-center">
                <p className="font-display font-bold text-2xl text-white">{(user2.totalPoints ?? 0).toFixed(1)}</p>
                <p className="text-xs text-muted truncate">{user2.username}</p>
              </div>
            </div>
          </div>

          {/* Duelo en 1x2 comunes */}
          {duel && duel.total > 0 && (
            <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
              <div>
                <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted">Duelo directo en 1x2</span>
                <p className="text-xs text-muted mt-0.5">En los {duel.total} partidos donde ambos apostaron resultado</p>
              </div>
              <div className="grid grid-cols-3 items-center gap-2 text-center">
                <div>
                  <p className={`font-display font-bold text-3xl ${duel.w1 > duel.w2 ? 'text-win' : 'text-white'}`}>{duel.w1}</p>
                  <p className="text-xs text-muted truncate">{user1.username}</p>
                </div>
                <div>
                  <p className="font-display font-bold text-xl text-muted">{duel.draws}</p>
                  <p className="text-xs text-muted">Empate</p>
                </div>
                <div>
                  <p className={`font-display font-bold text-3xl ${duel.w2 > duel.w1 ? 'text-win' : 'text-white'}`}>{duel.w2}</p>
                  <p className="text-xs text-muted truncate">{user2.username}</p>
                </div>
              </div>
            </div>
          )}

          {/* % acierto 1x2 + racha */}
          <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
            <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted">Estadísticas</span>
            {[
              { label: '% acierto 1x2', v1: data1.accuracy[0].pct, v2: data2.accuracy[0].pct, suffix: '%' },
              { label: 'Racha actual',   v1: data1.streak.currentStreak, v2: data2.streak.currentStreak, suffix: '' },
              { label: 'Mejor racha',    v1: data1.streak.maxStreak,     v2: data2.streak.maxStreak,     suffix: '' },
            ].map(({ label, v1, v2, suffix }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`font-display font-bold text-sm w-10 text-center ${v1 != null && v1 > v2 ? 'text-win' : 'text-white'}`}>
                  {v1 != null ? `${v1}${suffix}` : '—'}
                </span>
                <span className="flex-1 text-xs text-muted text-center">{label}</span>
                <span className={`font-display font-bold text-sm w-10 text-center ${v2 != null && v2 > v1 ? 'text-win' : 'text-white'}`}>
                  {v2 != null ? `${v2}${suffix}` : '—'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function EmptyState({ text }) {
  return <div className="py-10 text-center text-muted text-sm">{text}</div>
}
