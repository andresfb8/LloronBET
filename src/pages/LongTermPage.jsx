import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import { WC2026_TEAMS, GROUP_LABELS } from '../utils/constants'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Toast from '../components/ui/Toast'

export default function LongTermPage() {
  const { user }          = useAuth()
  const [entry, setEntry] = useState(null)
  const [groups, setGroups] = useState({})
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState(null)

  const [champion, setChampion]   = useState('')
  const [runnerUp, setRunnerUp]   = useState('')
  const [topScorer, setTopScorer] = useState('')
  const [groupPicks, setGroupPicks] = useState({})
  useEffect(() => {
    async function load() {
      const [entrySnap, configSnap] = await Promise.all([
        getDoc(doc(db, 'longterm', user.uid)),
        getDoc(doc(db, 'config', 'groups')),
      ])
      if (configSnap.exists()) setGroups(configSnap.data())
      if (entrySnap.exists()) {
        const d = entrySnap.data()
        setEntry(d)
        setChampion(d.champion  ?? '')
        setRunnerUp(d.runnerUp  ?? '')
        setTopScorer(d.topScorer ?? '')
        setGroupPicks(d.groupPicks ?? {})
      }
      setLoading(false)
    }
    load()
  }, [user])

  function toggleGroupPick(group, team) {
    setGroupPicks(prev => {
      const picks = prev[group] ?? []
      if (picks.includes(team)) {
        return { ...prev, [group]: picks.filter(t => t !== team) }
      }
      if (picks.length >= 2) return prev
      return { ...prev, [group]: [...picks, team] }
    })
  }

  async function handleSave() {
    if (entry?.isLocked || saving) return
    setSaving(true)
    try {
      await setDoc(doc(db, 'longterm', user.uid), {
        userId:      user.uid,
        champion:    champion  || null,
        runnerUp:    runnerUp  || null,
        topScorer:   topScorer || null,
        groupPicks,
        submittedAt: new Date(),
        isLocked:    false,
        points_won:  null,
      })
      setToast({ message: 'Pronósticos guardados', type: 'success' })
    } catch {
      setToast({ message: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner className="mt-16" />

  const isLocked = entry?.isLocked === true

  return (
    <div className="px-4 py-4 flex flex-col gap-5 max-w-lg mx-auto">
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Pre-Mundial</h2>
        <p className="text-muted text-sm mt-1">Tus pronósticos antes de que arranque el torneo</p>
      </div>

      {isLocked && (
        <div className="bg-live/10 border border-live/30 rounded-xl p-3 text-center">
          <p className="text-live text-sm font-display font-semibold">Mercados cerrados</p>
          <p className="text-muted text-xs mt-1">Ya no puedes modificar tus pronósticos</p>
        </div>
      )}

      <Card title="Campeón del Mundo · +100 pts">
        <TeamSelect value={champion} onChange={setChampion} exclude={[runnerUp]} disabled={isLocked} placeholder="Selecciona el campeón" />
      </Card>

      <Card title="Subcampeón · +80 pts">
        <TeamSelect value={runnerUp} onChange={setRunnerUp} exclude={[champion]} disabled={isLocked} placeholder="Selecciona el subcampeón" />
      </Card>

      <Card title="Bota de Oro · +50 pts">
        <input
          type="text"
          value={topScorer}
          onChange={e => setTopScorer(e.target.value)}
          disabled={isLocked}
          placeholder="Nombre del máximo goleador"
          className="w-full bg-odds-default border border-border rounded-lg px-3 py-2.5 text-white placeholder:text-muted focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        />
      </Card>

      {GROUP_LABELS.some(g => groups[g]?.length >= 2) ? (
        <Card title="Clasificados por Grupo · +25 pts c/u">
          <p className="text-xs text-muted mb-3">Selecciona los 2 equipos que crees que pasan de cada grupo</p>
          <div className="flex flex-col gap-4">
            {GROUP_LABELS.filter(g => groups[g]?.length >= 2).map(group => (
              <GroupPicker
                key={group}
                group={group}
                teams={groups[group]}
                picks={groupPicks[group] ?? []}
                disabled={isLocked}
                onToggle={(team) => toggleGroupPick(group, team)}
              />
            ))}
          </div>
        </Card>
      ) : (
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <p className="text-muted text-sm">Los grupos se configurarán cuando se realice el sorteo.</p>
        </div>
      )}

      {!isLocked && (
        <Button className="w-full py-4 text-base" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : entry ? 'Actualizar pronósticos' : 'Guardar pronósticos'}
        </Button>
      )}

      {isLocked && entry?.points_won != null && (
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <p className="text-muted text-xs uppercase tracking-widest font-display mb-1">Puntos ganados</p>
          <p className="font-display font-bold text-3xl text-win">+{entry.points_won.toFixed(1)}</p>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
      <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted">{title}</span>
      {children}
    </div>
  )
}

function TeamSelect({ value, onChange, exclude = [], disabled, placeholder }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="w-full bg-odds-default border border-border rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm appearance-none"
    >
      <option value="">{placeholder}</option>
      {WC2026_TEAMS.filter(t => !exclude.includes(t)).map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  )
}

function GroupPicker({ group, teams, picks, disabled, onToggle }) {
  return (
    <div>
      <p className="text-xs font-display font-semibold text-muted mb-2">Grupo {group}</p>
      <div className="flex flex-wrap gap-2">
        {teams.map(team => {
          const selected = picks.includes(team)
          return (
            <button
              key={team}
              onClick={() => !disabled && onToggle(team)}
              disabled={disabled || (!selected && picks.length >= 2)}
              className={`px-3 py-1.5 rounded-lg text-xs font-body font-semibold transition-all
                ${selected
                  ? 'bg-selected text-selected-text shadow-[0_0_8px_rgba(255,223,27,0.3)]'
                  : 'bg-odds-default text-muted hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
            >
              {team}
            </button>
          )
        })}
      </div>
    </div>
  )
}
