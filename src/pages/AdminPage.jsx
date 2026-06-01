import { useEffect, useMemo, useState } from 'react'
import { collection, doc, deleteDoc, getDoc, getDocs, query, setDoc, updateDoc, increment, where, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useAuth } from '../contexts/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { useMatches } from '../hooks/useMatches'
import { GROUP_LABELS, WC2026_TEAMS } from '../utils/constants'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'
import Toast from '../components/ui/Toast'

const TABS = ['Partidos', 'Resultados', 'Pre-Mundial', 'Jornadas', 'Usuarios']

// Definición de las 8 jornadas con sus criterios de filtrado
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

const functions = getFunctions(undefined, 'us-central1')

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('Partidos')
  const [toast, setToast]         = useState(null)

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      <h2 className="font-display text-2xl font-bold text-white">Administración</h2>

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

      {activeTab === 'Partidos'    && <TabPartidos   onToast={setToast} />}
      {activeTab === 'Resultados'  && <TabResultados onToast={setToast} />}
      {activeTab === 'Pre-Mundial' && <TabPreMundial onToast={setToast} />}
      {activeTab === 'Jornadas'    && <TabJornadas   onToast={setToast} />}
      {activeTab === 'Usuarios'    && <TabUsuarios />}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

/* ─── Tab: Partidos ─── */
function TabPartidos({ onToast }) {
  const { matches } = useMatches()
  const [editing, setEditing] = useState(null)   // matchId being edited
  const [editForm, setEditForm] = useState({})
  const [syncing, setSyncing]   = useState(false)

  function startEdit(m) {
    const dt = m.datetime?.toDate ? m.datetime.toDate() : new Date(m.datetime)
    setEditForm({
      homeTeam: m.homeTeam, awayTeam: m.awayTeam,
      group:    m.group ?? '', round: m.round ?? '',
      datetime: dt.toISOString().slice(0, 16),
    })
    setEditing(m.id)
  }

  function cancelEdit() { setEditing(null); setEditForm({}) }

  function setField(field) { return e => setEditForm(p => ({ ...p, [field]: e.target.value })) }

  async function handleSave(matchId) {
    if (!editForm.datetime) { onToast({ message: 'La fecha es obligatoria', type: 'error' }); return }
    await updateDoc(doc(db, 'matches', matchId), {
      homeTeam: editForm.homeTeam,
      awayTeam: editForm.awayTeam,
      group:    editForm.group || null,
      round:    editForm.round || 'Fase de Grupos',
      datetime: Timestamp.fromDate(new Date(editForm.datetime)),
    })
    onToast({ message: 'Partido actualizado', type: 'success' })
    cancelEdit()
  }

  async function handleDelete(matchId) {
    if (!window.confirm('¿Eliminar este partido?')) return
    await deleteDoc(doc(db, 'matches', matchId))
    onToast({ message: 'Partido eliminado', type: 'success' })
    if (editing === matchId) cancelEdit()
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const syncFn = httpsCallable(functions, 'syncMatches')
      const result = await syncFn()
      onToast({ message: result.data.message, type: 'success' })
    } catch (e) {
      onToast({ message: e.message || 'Error al sincronizar', type: 'error' })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Sync button */}
      <Card title="Importar partidos desde football-data.org">
        <p className="text-xs text-muted">Importa automáticamente todos los partidos del Mundial 2026 con fechas y equipos.</p>
        <Button className="w-full" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Importando…' : 'Importar partidos'}
        </Button>
      </Card>

      {/* Match list */}
      <Card title={`Partidos existentes (${matches.length})`}>
        {matches.length === 0
          ? <p className="text-muted text-sm">Sin partidos</p>
          : <div className="flex flex-col">
              {matches.map(m => (
                <div key={m.id} className="border-b border-border last:border-0">
                  {/* Row */}
                  <div className="flex items-center justify-between py-2.5 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-body font-semibold truncate">{m.homeTeam} vs {m.awayTeam}</p>
                      <p className="text-xs text-muted">{m.round}{m.group ? ` · Grupo ${m.group}` : ''} · {m.status}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="secondary"
                        className={`text-xs py-1 px-3 ${editing === m.id ? 'border-primary text-primary' : ''}`}
                        onClick={() => editing === m.id ? cancelEdit() : startEdit(m)}
                      >
                        {editing === m.id ? 'Cancelar' : 'Editar'}
                      </Button>
                      <Button variant="secondary" className="text-xs py-1 px-3 text-live border-live/30" onClick={() => handleDelete(m.id)}>
                        Borrar
                      </Button>
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {editing === m.id && (
                    <div className="pb-3 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input label="Local"      value={editForm.homeTeam} onChange={setField('homeTeam')} />
                        <Input label="Visitante"  value={editForm.awayTeam} onChange={setField('awayTeam')} />
                        <Input label="Grupo"      value={editForm.group}    onChange={setField('group')} placeholder="A" />
                        <Input label="Ronda"      value={editForm.round}    onChange={setField('round')} />
                      </div>
                      <Input label="Fecha y hora" type="datetime-local" value={editForm.datetime} onChange={setField('datetime')} />
                      <Button className="w-full" onClick={() => handleSave(m.id)}>Guardar cambios</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
        }
      </Card>
    </div>
  )
}

/* ─── Tab: Resultados ─── */
function TabResultados({ onToast }) {
  const { matches } = useMatches()
  const [selected, setSelected]   = useState('')
  const [home, setHome]           = useState('')
  const [away, setAway]           = useState('')
  const [qualifier, setQualifier] = useState('')
  const [saving, setSaving]       = useState(false)

  const match      = matches.find(m => m.id === selected)
  const isKnockout = match?.round && match.round !== 'Fase de Grupos'

  async function handleUpdate() {
    if (!selected || home === '' || away === '') {
      onToast({ message: 'Selecciona partido y marcador', type: 'error' }); return
    }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'matches', selected), {
        status:     'FT',
        finalScore: { home: Number(home), away: Number(away) },
        ...(isKnockout && qualifier ? { qualifier } : {}),
      })
      onToast({ message: 'Resultado guardado — calculando puntos…', type: 'success' })
      setHome(''); setAway(''); setSelected(''); setQualifier('')
    } catch {
      onToast({ message: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const pending = matches.filter(m => m.status !== 'FT' && m.status !== 'CANC')

  return (
    <Card title="Actualizar resultado">
      <select
        value={selected}
        onChange={e => { setSelected(e.target.value); setQualifier('') }}
        className="w-full bg-odds-default border border-border rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
      >
        <option value="">Selecciona un partido</option>
        {pending.map(m => (
          <option key={m.id} value={m.id}>{m.homeTeam} vs {m.awayTeam}</option>
        ))}
      </select>

      {selected && (
        <>
          <div className="flex items-center gap-3">
            <input type="number" min="0" max="20" value={home} onChange={e => setHome(e.target.value)}
              placeholder="0" className="w-16 h-14 text-center font-display font-bold text-2xl bg-odds-default border-2 border-border rounded-xl text-white focus:outline-none focus:border-odds" />
            <span className="font-display font-bold text-2xl text-muted flex-1 text-center">–</span>
            <input type="number" min="0" max="20" value={away} onChange={e => setAway(e.target.value)}
              placeholder="0" className="w-16 h-14 text-center font-display font-bold text-2xl bg-odds-default border-2 border-border rounded-xl text-white focus:outline-none focus:border-odds" />
          </div>
          {isKnockout && (
            <select
              value={qualifier}
              onChange={e => setQualifier(e.target.value)}
              className="w-full bg-odds-default border border-border rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-primary text-sm"
            >
              <option value="">¿Quién clasificó? (obligatorio en eliminatoria)</option>
              <option value="home">{match.homeTeam}</option>
              <option value="away">{match.awayTeam}</option>
            </select>
          )}
        </>
      )}

      <Button className="w-full" onClick={handleUpdate} disabled={saving || !selected}>
        {saving ? 'Guardando…' : 'Marcar FT y calcular puntos'}
      </Button>
      <p className="text-xs text-muted text-center">Solo 90' + descuento. La Cloud Function calculará los puntos automáticamente.</p>
    </Card>
  )
}

/* ─── Tab: Pre-Mundial ─── */
function TabPreMundial({ onToast }) {
  const { usersMap }          = useUsers()
  const [locking, setLocking] = useState(false)
  const [groups, setGroups]   = useState({})
  const [longtermEntries, setLongtermEntries] = useState([])

  // Calcular puntos Pre-Mundial
  const [calcChampion, setCalcChampion]         = useState('')
  const [calcRunnerUp, setCalcRunnerUp]         = useState('')
  const [calcTopScorer, setCalcTopScorer]       = useState('')
  const [calcGroupResults, setCalcGroupResults] = useState({})
  const [calculating, setCalculating]           = useState(null)
  const [syncingStandings, setSyncingStandings] = useState(false)

  useEffect(() => {
    Promise.all([
      getDoc(doc(db, 'config', 'groups')),
      getDocs(collection(db, 'longterm')),
    ]).then(([groupsSnap, entriesSnap]) => {
      if (groupsSnap.exists()) setGroups(groupsSnap.data())
      setLongtermEntries(entriesSnap.docs.map(d => d.data()))
    })
  }, [])

  // Agrupar predicciones de Bota de Oro por nombre → lista de userIds
  const topScorerGroups = useMemo(() => {
    const map = new Map()
    for (const entry of longtermEntries) {
      const name = entry.topScorer?.trim()
      if (!name) continue
      if (!map.has(name)) map.set(name, [])
      map.get(name).push(entry.userId)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [longtermEntries])

  async function handleLock() {
    if (!confirm('¿Bloquear los mercados Pre-Mundial? Esta acción no se puede deshacer.')) return
    setLocking(true)
    try {
      const snap = await getDocs(collection(db, 'longterm'))
      await Promise.all(snap.docs.map(d => updateDoc(d.ref, { isLocked: true })))
      onToast({ message: `Pre-Mundial bloqueado (${snap.size} entradas)`, type: 'success' })
    } catch {
      onToast({ message: 'Error al bloquear', type: 'error' })
    } finally {
      setLocking(false)
    }
  }

  async function handleSyncStandings() {
    setSyncingStandings(true)
    try {
      const fn     = httpsCallable(functions, 'syncGroupStandings')
      const result = await fn()
      // Pre-rellenar con los top 2 de cada grupo; respetar los mejores terceros ya seleccionados
      setCalcGroupResults(prev => {
        const next = { ...prev }
        for (const [group, top2] of Object.entries(result.data.groupResults)) {
          const current = prev[group] ?? ['', '', '']
          next[group] = [top2[0] ?? '', top2[1] ?? '', current[2] ?? '']
        }
        return next
      })
      onToast({ message: result.data.message, type: 'success' })
    } catch (e) {
      onToast({ message: e.message || 'Error al sincronizar clasificados', type: 'error' })
    } finally {
      setSyncingStandings(false)
    }
  }

  function setGroupResult(group, idx, team) {
    setCalcGroupResults(prev => {
      const arr = [...(prev[group] ?? ['', '', ''])]
      arr[idx] = team
      return { ...prev, [group]: arr }
    })
  }

  async function handleCalculateGroups() {
    setCalculating('groups')
    try {
      const calcFn = httpsCallable(functions, 'calculateLongTermPoints')
      const result = await calcFn({ scope: 'groups', groupResults: calcGroupResults })
      onToast({ message: result.data.message, type: 'success' })
    } catch (e) {
      onToast({ message: e.message || 'Error al calcular', type: 'error' })
    } finally {
      setCalculating(null)
    }
  }

  async function handleCalculateFinals() {
    if (!calcChampion || !calcRunnerUp || !calcTopScorer) {
      onToast({ message: 'Completa campeón, subcampeón y bota de oro', type: 'error' }); return
    }
    setCalculating('finals')
    try {
      const calcFn = httpsCallable(functions, 'calculateLongTermPoints')
      const result = await calcFn({
        scope:     'finals',
        champion:  calcChampion,
        runnerUp:  calcRunnerUp,
        topScorer: calcTopScorer,
      })
      onToast({ message: result.data.message, type: 'success' })
    } catch (e) {
      onToast({ message: e.message || 'Error al calcular', type: 'error' })
    } finally {
      setCalculating(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Bloquear */}
      <Card title="Bloquear mercados Pre-Mundial">
        <p className="text-sm text-muted">Cierra definitivamente las predicciones Pre-Mundial para todos los usuarios.</p>
        <Button variant="danger" className="w-full" onClick={handleLock} disabled={locking}>
          {locking ? 'Bloqueando…' : 'Bloquear Pre-Mundial'}
        </Button>
      </Card>

      {/* Clasificados por grupo — al acabar la fase de grupos */}
      <Card title="Puntos fase de grupos · +25 pts c/u">
        <p className="text-xs text-muted">Calcular al terminar la fase de grupos. Se puede recalcular sin doble conteo.</p>

        {GROUP_LABELS.some(g => groups[g]?.length >= 2) ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-display font-semibold uppercase tracking-widest text-muted">Clasificados reales por grupo</p>
              <button
                onClick={handleSyncStandings}
                disabled={syncingStandings}
                className="text-xs font-display font-semibold text-primary border border-primary/40 bg-primary/10 px-2.5 py-1 rounded-lg disabled:opacity-50 shrink-0"
              >
                {syncingStandings ? 'Cargando…' : '↓ Sincronizar'}
              </button>
            </div>
            <p className="text-xs text-muted">1.º y 2.º se sincronizan solos. El mejor 3.º (opcional) se añade manualmente.</p>
            <div className="grid grid-cols-2 gap-3">
              {GROUP_LABELS.filter(g => groups[g]?.length >= 2).map(g => (
                <div key={g} className="flex flex-col gap-1.5">
                  <span className="text-xs font-display font-semibold text-muted">Grupo {g}</span>
                  {[
                    { idx: 0, label: '1.º clasificado' },
                    { idx: 1, label: '2.º clasificado' },
                    { idx: 2, label: 'Mejor 3.º (opcional)' },
                  ].map(({ idx, label }) => (
                    <select key={idx} value={calcGroupResults[g]?.[idx] ?? ''}
                      onChange={e => setGroupResult(g, idx, e.target.value)}
                      className={`bg-odds-default border rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-primary ${idx === 2 ? 'border-border/50 opacity-70' : 'border-border'}`}>
                      <option value="">— {label} —</option>
                      {(groups[g] || []).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted italic">Los grupos se configurarán cuando se realice el sorteo.</p>
        )}

        <Button className="w-full" onClick={handleCalculateGroups} disabled={!!calculating}>
          {calculating === 'groups' ? 'Calculando…' : 'Calcular puntos de grupos'}
        </Button>
      </Card>

      {/* Campeón, subcampeón, bota de oro — al terminar el torneo */}
      <Card title="Puntos finales del torneo">
        <p className="text-xs text-muted">Calcular al terminar el torneo. Independiente de los puntos de grupos.</p>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-display font-semibold uppercase tracking-widest text-muted">Campeón · +100 pts</p>
          <select value={calcChampion} onChange={e => setCalcChampion(e.target.value)}
            className="w-full bg-odds-default border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary">
            <option value="">Selecciona el campeón</option>
            {WC2026_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-display font-semibold uppercase tracking-widest text-muted">Subcampeón · +80 pts</p>
          <select value={calcRunnerUp} onChange={e => setCalcRunnerUp(e.target.value)}
            className="w-full bg-odds-default border border-border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary">
            <option value="">Selecciona el subcampeón</option>
            {WC2026_TEAMS.filter(t => t !== calcChampion).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-display font-semibold uppercase tracking-widest text-muted">Bota de Oro · +50 pts</p>
          {topScorerGroups.length === 0 ? (
            <p className="text-xs text-muted italic">Sin predicciones registradas aún.</p>
          ) : (
            <div className="flex flex-col rounded-lg border border-border overflow-hidden">
              {topScorerGroups.map(([name, uids]) => {
                const isSelected = calcTopScorer === name
                return (
                  <div key={name} className={`flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-0 ${isSelected ? 'bg-win/5' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-body font-semibold ${isSelected ? 'text-win' : 'text-white'}`}>{name}</p>
                      <p className="text-xs text-muted truncate">
                        {uids.map(uid => usersMap.get(uid)?.username ?? '?').join(', ')}
                      </p>
                    </div>
                    <button
                      onClick={() => setCalcTopScorer(isSelected ? '' : name)}
                      className={`shrink-0 text-xs font-display font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-win/20 text-win border-win/40'
                          : 'bg-odds-default text-muted border-border hover:text-white'
                      }`}
                    >
                      {isSelected ? '✓ Correcto' : 'Marcar correcto'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <Button className="w-full" onClick={handleCalculateFinals} disabled={!!calculating}>
          {calculating === 'finals' ? 'Calculando…' : 'Calcular puntos finales'}
        </Button>
        <p className="text-xs text-muted text-center">Se puede recalcular sin doble conteo. Solo suma el delta respecto al cálculo anterior.</p>
      </Card>
    </div>
  )
}

const REPAIR_URL = 'https://us-central1-lloronbet.cloudfunctions.net/repairMissingUsers'

/* ─── Tab: Usuarios ─── */
function TabUsuarios() {
  const { user }              = useAuth()
  const { usersMap, loading } = useUsers()
  const [repairing, setRepairing]     = useState(false)
  const [repairResult, setRepairResult] = useState(null)

  const users = Array.from(usersMap.values()).sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0))

  async function handleRepair() {
    setRepairing(true)
    setRepairResult(null)
    try {
      const token    = await user.getIdToken()
      const response = await fetch(REPAIR_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    '{}',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
      setRepairResult(data)
    } catch (e) {
      setRepairResult({ error: e.message || 'Error desconocido' })
    } finally {
      setRepairing(false)
    }
  }

  if (loading) return <Spinner className="mt-8" />

  return (
    <div className="flex flex-col gap-4">
      <Card title="Reparar usuarios sin perfil">
        <p className="text-xs text-muted">
          Detecta usuarios registrados en Firebase Auth que no tienen documento en Firestore y los crea automáticamente.
          Útil si alguien se registró pero no aparece en la lista.
        </p>
        <Button className="w-full" onClick={handleRepair} disabled={repairing}>
          {repairing ? 'Buscando…' : 'Reparar usuarios faltantes'}
        </Button>
        {repairResult && !repairResult.error && (
          <p className={`text-sm text-center font-body font-semibold ${repairResult.created > 0 ? 'text-win' : 'text-muted'}`}>
            {repairResult.created > 0
              ? `${repairResult.created} usuario${repairResult.created !== 1 ? 's' : ''} creado${repairResult.created !== 1 ? 's' : ''} de ${repairResult.total} en Auth`
              : `Todos los usuarios ya tienen perfil (${repairResult.total} en Auth)`}
          </p>
        )}
        {repairResult?.error && (
          <p className="text-sm text-center font-body font-semibold text-live">{repairResult.error}</p>
        )}
      </Card>

      <Card title={`Usuarios registrados (${users.length})`}>
        {users.length === 0
          ? <p className="text-muted text-sm">Sin usuarios</p>
          : <div className="flex flex-col">
              {users.map(u => (
                <div key={u.uid} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm text-white font-body font-semibold">{u.username}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-sm text-white">{(u.totalPoints ?? 0).toFixed(1)} pts</p>
                    <p className={`text-xs font-display font-semibold ${u.role === 'admin' ? 'text-odds' : 'text-muted'}`}>{u.role}</p>
                  </div>
                </div>
              ))}
            </div>
        }
      </Card>
    </div>
  )
}

/* ─── Tab: Jornadas ─── */
function TabJornadas({ onToast }) {
  const { matches }       = useMatches()
  const { usersMap }      = useUsers()
  const [bonuses, setBonuses]       = useState(null)   // null = cargando
  const [rankings, setRankings]     = useState({})     // key → [{uid, username, pts}]
  const [awarding, setAwarding]     = useState(null)   // jornada key en proceso

  // Cargar /config/bonuses y rankings de cada jornada con partidos FT
  useEffect(() => {
    async function load() {
      const bonusSnap = await getDoc(doc(db, 'config', 'bonuses'))
      const bonusData = bonusSnap.exists() ? bonusSnap.data() : {}
      setBonuses(bonusData)

      // Para cada jornada, calcular ranking si hay partidos FT
      const result = {}
      for (const jornada of JORNADAS) {
        const ftMatches = matches.filter(m => jornada.filter(m) && m.status === 'FT')
        if (ftMatches.length === 0) { result[jornada.key] = []; continue }

        const ids = ftMatches.map(m => m.id)
        // Firestore 'in' limit = 30. Nuestras jornadas tienen máx. 24 partidos — OK.
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
          .map(([uid, pts]) => ({ uid, username: usersMap.get(uid)?.username ?? '—', pts }))
          .sort((a, b) => b.pts - a.pts)
      }
      setRankings(result)
    }
    if (matches.length > 0 && usersMap.size > 0) load()
  }, [matches, usersMap])

  async function handleAward(jornada) {
    const rank = rankings[jornada.key]
    if (!rank || rank.length === 0) return
    const maxPts = rank[0].pts
    const winners = rank.filter(r => r.pts === maxPts)

    if (!confirm(`¿Otorgar +200 pts a: ${winners.map(w => w.username).join(', ')}?`)) return
    setAwarding(jornada.key)
    try {
      const batch_ops = []
      // Actualizar users
      for (const w of winners) {
        batch_ops.push(updateDoc(doc(db, 'users', w.uid), { totalPoints: increment(200) }))
      }
      // Registrar en /config/bonuses
      batch_ops.push(setDoc(doc(db, 'config', 'bonuses'), {
        ...bonuses,
        [jornada.key]: winners.map(w => w.uid),
      }))
      await Promise.all(batch_ops)
      setBonuses(prev => ({ ...prev, [jornada.key]: winners.map(w => w.uid) }))
      onToast({ message: `+200 pts otorgados en ${jornada.label}`, type: 'success' })
    } catch {
      onToast({ message: 'Error al otorgar bonus', type: 'error' })
    } finally {
      setAwarding(null)
    }
  }

  if (bonuses === null) return <Spinner className="mt-8" />

  return (
    <div className="flex flex-col gap-4">
      <Card title="Bonus +200 pts por jornada">
        <p className="text-xs text-muted">El jugador con más puntos en cada jornada se lleva +200 pts extra (cuentan en el ranking general). En caso de empate, todos los empatados reciben el bonus.</p>
      </Card>

      {JORNADAS.map(jornada => {
        const rank    = rankings[jornada.key] ?? []
        const closed  = !!bonuses[jornada.key]
        const hasFt   = rank.length > 0
        const winnerUids = bonuses[jornada.key] ?? []
        const winnerNames = winnerUids.map(uid => usersMap.get(uid)?.username ?? uid).join(', ')

        return (
          <Card key={jornada.key} title={jornada.label}>
            {closed ? (
              <div className="flex items-center gap-2 text-sm text-win font-body font-semibold">
                <span>🏆</span>
                <span>Cerrada · +200 pts → {winnerNames}</span>
              </div>
            ) : !hasFt ? (
              <p className="text-xs text-muted">Sin partidos finalizados todavía</p>
            ) : (
              <>
                {/* Mini ranking top-5 */}
                <div className="flex flex-col">
                  {rank.slice(0, 5).map((r, i) => (
                    <div key={r.uid} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted w-5 text-center">{i + 1}</span>
                        <span className="text-sm text-white font-body font-semibold">{r.username}</span>
                      </div>
                      <span className="font-display font-bold text-sm text-white">{r.pts} pts</span>
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleAward(jornada)}
                  disabled={awarding === jornada.key}
                >
                  {awarding === jornada.key ? 'Otorgando…' : `Otorgar +200 pts → ${rank[0].username}${rank.filter(r => r.pts === rank[0].pts).length > 1 ? ' + empates' : ''}`}
                </Button>
              </>
            )}
          </Card>
        )
      })}
    </div>
  )
}

/* ─── Helpers ─── */
function Card({ title, children }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
      <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted">{title}</span>
      {children}
    </div>
  )
}

