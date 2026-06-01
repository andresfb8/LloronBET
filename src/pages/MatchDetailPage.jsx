import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, setDoc, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { isMarketOpen } from '../utils/marketHelpers'
import { POINTS } from '../utils/constants'
import MarketSelector from '../components/match/MarketSelector'
import ExactScoreInput from '../components/match/ExactScoreInput'
import MatchStatusBadge from '../components/match/MatchStatusBadge'
import CountdownTimer from '../components/ui/CountdownTimer'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Toast from '../components/ui/Toast'
import { useUsers } from '../hooks/useUsers'

export default function MatchDetailPage() {
  const { matchId } = useParams()
  const { user }    = useAuth()
  const navigate    = useNavigate()

  const { usersMap } = useUsers()
  const [match, setMatch]           = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [allPreds, setAllPreds]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [toast, setToast]           = useState(null)

  // Form state
  const [market1x2, setMarket1x2]             = useState(null)
  const [marketBtts, setMarketBtts]           = useState(null)
  const [marketOu, setMarketOu]               = useState(null)
  const [exactScore, setExactScore]           = useState({ home: '', away: '' })
  const [marketQualifier, setMarketQualifier] = useState(null)

  useEffect(() => {
    async function load() {
      const snap = await getDoc(doc(db, 'matches', matchId))
      if (!snap.exists()) { navigate('/'); return }
      const m = { id: snap.id, ...snap.data() }
      setMatch(m)

      // Predicción propia
      const predSnap = await getDoc(doc(db, 'predictions', `${user.uid}_${matchId}`))
      if (predSnap.exists()) {
        const p = predSnap.data()
        setPrediction(p)
        setMarket1x2(p.market_1x2 ?? null)
        setMarketBtts(p.market_btts ?? null)
        setMarketOu(p.market_overunder ?? null)
        setExactScore(p.exact_score ?? { home: '', away: '' })
        setMarketQualifier(p.market_qualifier ?? null)
      }

      // Si el mercado ya cerró, cargar predicciones de todos
      if (!isMarketOpen(m.datetime)) {
        const q = query(collection(db, 'predictions'), where('matchId', '==', matchId))
        const predsSnap = await getDocs(q)
        setAllPreds(predsSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      }

      setLoading(false)
    }
    load()
  }, [matchId, user, navigate])

  const marketClosed = match ? !isMarketOpen(match.datetime) : true
  const isFinished   = match?.status === 'FT'
  const isLive       = match?.status === 'LIVE'
  const isKnockout   = match?.round && match.round !== 'Fase de Grupos'

  async function handleSave() {
    if (marketClosed || saving) return
    setSaving(true)
    try {
      const exactFinal = (exactScore.home !== '' && exactScore.away !== '')
        ? { home: Number(exactScore.home), away: Number(exactScore.away) }
        : null

      // Contar cambios de predicción (solo updates, no primer guardado)
      if (prediction) {
        updateDoc(doc(db, 'users', user.uid), { predictionChanges: increment(1) }).catch(() => {})
      }

      await setDoc(doc(db, 'predictions', `${user.uid}_${matchId}`), {
        predictionId:     `${user.uid}_${matchId}`,
        userId:           user.uid,
        matchId,
        timestamp:        new Date(),
        market_1x2:       market1x2       ?? null,
        market_btts:      marketBtts      ?? null,
        market_overunder: marketOu        ?? null,
        market_qualifier: marketQualifier ?? null,
        exact_score:      exactFinal,
        points_won:       null,
        points_breakdown: null,
      })
      setToast({ message: 'Predicción guardada', type: 'success' })
    } catch {
      setToast({ message: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const closeToast = useCallback(() => setToast(null), [])

  if (loading) return <Spinner className="mt-16" />

  const datetime = match.datetime?.toDate ? match.datetime.toDate() : new Date(match.datetime)
  const dateStr  = format(datetime, "EEEE d 'de' MMMM · HH:mm", { locale: es })

  return (
    <div className="px-4 py-4 flex flex-col gap-5 max-w-lg mx-auto">

      {/* Header */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        {/* Teams */}
        <div className="flex items-center justify-between gap-2">
          <TeamBlock flag={match.homeFlag} name={match.homeTeam} />
          <div className="flex flex-col items-center gap-1">
            {(isLive || isFinished) && match.finalScore ? (
              <span className={`font-display font-bold text-3xl tabular-nums ${isLive ? 'text-live' : 'text-white'}`}>
                {match.finalScore.home}–{match.finalScore.away}
              </span>
            ) : (
              <span className="font-display text-sm text-muted">VS</span>
            )}
            <MatchStatusBadge status={match.status} />
          </div>
          <TeamBlock flag={match.awayFlag} name={match.awayTeam} align="right" />
        </div>

        {/* Date + countdown */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted capitalize">{dateStr}</span>
          {!marketClosed && <CountdownTimer datetime={match.datetime} />}
          {marketClosed && !isFinished && !isLive && (
            <span className="text-xs font-display font-semibold text-live">MERCADO CERRADO</span>
          )}
        </div>
      </div>

      {/* Markets */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-5">
        <MarketSelector
          title="Ganador del Partido"
          pts={POINTS.MATCH_1X2}
          options={[
            { value: 'home', label: 'Local' },
            { value: 'draw', label: 'Empate' },
            { value: 'away', label: 'Visitante' },
          ]}
          selected={market1x2}
          disabled={marketClosed}
          onChange={setMarket1x2}
        />

        <div className="h-px bg-border" />

        <MarketSelector
          title="Ambos Marcan"
          pts={POINTS.MATCH_BTTS}
          options={[
            { value: 'yes', label: 'SÍ' },
            { value: 'no',  label: 'NO' },
          ]}
          selected={marketBtts}
          disabled={marketClosed}
          onChange={setMarketBtts}
        />

        <div className="h-px bg-border" />

        <MarketSelector
          title="Total de Goles"
          pts={POINTS.MATCH_OVERUNDER}
          options={[
            { value: 'over',  label: 'Más 2.5' },
            { value: 'under', label: 'Menos 2.5' },
          ]}
          selected={marketOu}
          disabled={marketClosed}
          onChange={setMarketOu}
        />

        <div className="h-px bg-border" />

        <ExactScoreInput
          value={exactScore}
          onChange={setExactScore}
          disabled={marketClosed}
          pts={POINTS.MATCH_EXACT}
        />

        {isKnockout && (
          <>
            <div className="h-px bg-border" />
            <MarketSelector
              title="¿Quién Clasifica?"
              pts={POINTS.MATCH_QUALIFIER}
              options={[
                { value: 'home', label: match.homeTeam },
                { value: 'away', label: match.awayTeam },
              ]}
              selected={marketQualifier}
              disabled={marketClosed}
              onChange={setMarketQualifier}
            />
          </>
        )}

        {/* Bonus info */}
        <div className="bg-odds-default rounded-lg px-3 py-2.5 text-center">
          <p className="text-xs text-muted font-body">
            Bonus{' '}
            <span className="text-odds font-semibold">+{POINTS.BONUS_3} pts</span>{' '}
            con 3 aciertos ·{' '}
            <span className="text-odds font-semibold">+{POINTS.BONUS_ALL} pts</span>{' '}
            con todos
          </p>
        </div>
      </div>

      {/* Save button */}
      {!marketClosed && (
        <Button
          className="w-full py-4 text-base"
          onClick={handleSave}
          disabled={saving || (!market1x2 && !marketBtts && !marketOu && !marketQualifier && exactScore.home === '' && exactScore.away === '')}
        >
          {saving ? 'Guardando...' : prediction ? 'Actualizar predicción' : 'Guardar predicción'}
        </Button>
      )}

      {/* Resumen de distribución (post-close) */}
      {marketClosed && allPreds.length > 0 && (
        <PredictionSummary preds={allPreds} match={match} />
      )}

      {/* All predictions (post-close) */}
      {marketClosed && allPreds.length > 0 && (
        <AllPredictions preds={allPreds} match={match} currentUid={user.uid} usersMap={usersMap} />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
    </div>
  )
}

function TeamBlock({ flag, name, align = 'left' }) {
  return (
    <div className={`flex flex-col items-center gap-1.5 flex-1 ${align === 'right' ? 'items-end' : 'items-start'}`}>
      {flag
        ? <img src={flag} alt={name} className="w-10 h-10 rounded object-cover" />
        : <span className="w-10 h-10 rounded bg-border" />
      }
      <span className="font-body font-semibold text-sm text-white text-center leading-tight">{name}</span>
    </div>
  )
}

function PredictionSummary({ preds, match }) {
  const markets = [
    {
      key:    'market_1x2',
      label:  'Ganador',
      opts:   [{ v: 'home', l: 'Local' }, { v: 'draw', l: 'Empate' }, { v: 'away', l: 'Visitante' }],
    },
    {
      key:    'market_btts',
      label:  'Ambos Marcan',
      opts:   [{ v: 'yes', l: 'Sí' }, { v: 'no', l: 'No' }],
    },
    {
      key:    'market_overunder',
      label:  'Total Goles',
      opts:   [{ v: 'over', l: 'Más 2.5' }, { v: 'under', l: 'Menos 2.5' }],
    },
  ]

  const rows = markets.map(({ key, label, opts }) => {
    const voters = preds.filter(p => p[key] != null)
    if (voters.length === 0) return null
    const counts = opts.map(o => ({ ...o, n: voters.filter(p => p[key] === o.v).length }))
    const total  = voters.length
    return { label, counts, total }
  }).filter(Boolean)

  if (rows.length === 0) return null

  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-4">
      <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted">
        Distribución del grupo
      </h3>
      {rows.map(({ label, counts, total }) => (
        <div key={label} className="flex flex-col gap-1.5">
          <p className="text-xs text-muted font-display font-semibold">{label}</p>
          <div className="flex gap-2 items-center">
            {counts.map(({ v, l, n }) => {
              const pct = total > 0 ? Math.round((n / total) * 100) : 0
              return (
                <div key={v} className="flex-1 flex flex-col gap-1">
                  <div className="h-2 rounded-full bg-odds-default overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted">{l}</span>
                    <span className="text-xs font-display font-bold text-white">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function AllPredictions({ preds, match, currentUid, usersMap }) {
  const LABELS = { home: 'Local', draw: 'Empate', away: 'Visitante', yes: 'SÍ', no: 'NO', over: 'Más', under: 'Menos' }
  const qualifierLabel = q => q === 'home' ? match.homeTeam : match.awayTeam

  const sorted = [...preds].sort((a, b) => (b.points_won ?? 0) - (a.points_won ?? 0))

  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
      <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted">
        Predicciones ({preds.length})
      </h3>
      <div className="flex flex-col">
        {sorted.map(p => {
          const isMe    = p.userId === currentUid
          const uname   = usersMap.get(p.userId)?.username ?? '—'
          return (
            <div
              key={p.id}
              className={`flex items-center justify-between py-2.5 border-b border-border last:border-0 ${isMe ? 'text-odds' : 'text-white'}`}
            >
              <span className="font-body font-semibold text-sm w-24 truncate">
                {isMe ? `${uname} (tú)` : uname}
              </span>
              <div className="flex gap-2 flex-1 justify-center flex-wrap">
                {p.market_1x2       && <Chip label={LABELS[p.market_1x2]} />}
                {p.market_btts      && <Chip label={`BTTS ${LABELS[p.market_btts]}`} />}
                {p.market_overunder && <Chip label={LABELS[p.market_overunder]} />}
                {p.market_qualifier && <Chip label={`Clasifica: ${qualifierLabel(p.market_qualifier)}`} />}
                {p.exact_score      && <Chip label={`${p.exact_score.home}–${p.exact_score.away}`} highlight />}
              </div>
              <span className={`font-display font-bold text-sm w-16 text-right ${p.points_won ? 'text-win' : 'text-muted'}`}>
                {p.points_won != null ? `+${p.points_won}` : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Chip({ label, highlight = false }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-body ${highlight ? 'bg-odds text-selected-text font-semibold' : 'bg-odds-default text-muted'}`}>
      {label}
    </span>
  )
}
