const { onSchedule }   = require('firebase-functions/v2/scheduler')
const { getFirestore } = require('firebase-admin/firestore')
const { defineString } = require('firebase-functions/params')
const { format }       = require('date-fns')

const db       = getFirestore()
const fdorgKey = defineString('FDORG_KEY')

exports.checkLiveResults = onSchedule('every 15 minutes', async () => {
  // 1. Obtener los partidos NS/LIVE que estamos siguiendo
  const snap = await db.collection('matches')
    .where('status', 'in', ['NS', 'LIVE'])
    .get()

  if (snap.empty) return

  const docMap = new Map(snap.docs.map(d => [d.id, d.ref]))

  // 2. Consultar la API con los partidos de hoy en estados activos/terminados
  const today = format(new Date(), 'yyyy-MM-dd')
  const url   = `https://api.football-data.org/v4/competitions/WC/matches?status=IN_PLAY,PAUSED,FINISHED&dateFrom=${today}&dateTo=${today}&season=2026`

  const apiRes = await fetch(url, {
    headers: { 'X-Auth-Token': fdorgKey.value() },
  })

  if (!apiRes.ok) return

  const data = await apiRes.json()
  if (!data.matches || data.matches.length === 0) return

  const batch = db.batch()
  let updated = 0

  for (const fixture of data.matches) {
    const matchId = String(fixture.id)
    const docRef  = docMap.get(matchId)
    if (!docRef) continue   // no está en nuestra BD

    const update = {}

    if (fixture.status === 'FINISHED') {
      const ft = fixture.score?.fullTime
      if (ft && ft.home !== null && ft.away !== null) {
        update.status     = 'FT'
        update.finalScore = { home: ft.home, away: ft.away }

        // Auto-setear qualifier en partidos KO (la Cloud Function calculatePoints lo usa)
        if (fixture.stage !== 'GROUP_STAGE' && fixture.score?.winner) {
          if (fixture.score.winner === 'HOME_TEAM') update.qualifier = 'home'
          else if (fixture.score.winner === 'AWAY_TEAM') update.qualifier = 'away'
        }
      } else {
        // FINISHED sin marcador todavía (lag de la API): mantener LIVE para
        // reintentar en la próxima ejecución, no marcar FT a ciegas.
        update.status = 'LIVE'
      }
    } else if (['IN_PLAY', 'PAUSED'].includes(fixture.status)) {
      update.status = 'LIVE'
    }

    if (Object.keys(update).length === 0) continue

    batch.update(docRef, update)
    updated++
  }

  if (updated > 0) await batch.commit()
})
