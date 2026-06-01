const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { getFirestore, Timestamp } = require('firebase-admin/firestore')
const { getAuth }      = require('firebase-admin/auth')
const { defineString } = require('firebase-functions/params')

const db       = getFirestore()
const fdorgKey = defineString('FDORG_KEY')

const STAGE_MAP = {
  'GROUP_STAGE':    'Fase de Grupos',
  'LAST_32':        'Ronda de 32',
  'ROUND_OF_16':    'Octavos de Final',
  'QUARTER_FINALS': 'Cuartos de Final',
  'SEMI_FINALS':    'Semifinales',
  'THIRD_PLACE':    'Tercer y Cuarto Puesto',
  'FINAL':          'Final',
}

const TEAM_ES = {
  'Germany':         'Alemania',
  'Austria':         'Austria',
  'Belgium':         'Bélgica',
  'Croatia':         'Croacia',
  'Denmark':         'Dinamarca',
  'Spain':           'España',
  'France':          'Francia',
  'Hungary':         'Hungría',
  'England':         'Inglaterra',
  'Italy':           'Italia',
  'Netherlands':     'Países Bajos',
  'Poland':          'Polonia',
  'Portugal':        'Portugal',
  'Romania':         'Rumanía',
  'Serbia':          'Serbia',
  'Switzerland':     'Suiza',
  'Scotland':        'Escocia',
  'Slovenia':        'Eslovenia',
  'Slovakia':        'Eslovaquia',
  'Albania':         'Albania',
  'Georgia':         'Georgia',
  'Türkiye':         'Turquía',
  'Turkey':          'Turquía',
  'Ukraine':         'Ucrania',
  'Argentina':       'Argentina',
  'Brazil':          'Brasil',
  'Colombia':        'Colombia',
  'Uruguay':         'Uruguay',
  'Ecuador':         'Ecuador',
  'Venezuela':       'Venezuela',
  'United States':   'Estados Unidos',
  'USA':             'Estados Unidos',
  'Mexico':          'México',
  'Canada':          'Canadá',
  'Costa Rica':      'Costa Rica',
  'Panama':          'Panamá',
  'Jamaica':         'Jamaica',
  'Morocco':         'Marruecos',
  'Senegal':         'Senegal',
  'Nigeria':         'Nigeria',
  'Cameroon':        'Camerún',
  'South Africa':    'Sudáfrica',
  'Egypt':           'Egipto',
  'Mali':            'Mali',
  "Côte d'Ivoire":   'Costa de Marfil',
  'Tunisia':         'Túnez',
  'Japan':           'Japón',
  'Korea Republic':  'Corea del Sur',
  'South Korea':     'Corea del Sur',
  'Iran':            'Irán',
  'Saudi Arabia':    'Arabia Saudí',
  'Australia':       'Australia',
  'Uzbekistan':      'Uzbekistán',
  'Qatar':           'Catar',
  'Jordan':          'Jordania',
  'New Zealand':     'Nueva Zelanda',
  'Indonesia':       'Indonesia',
}

exports.syncMatches = onCall({ cors: true }, async (request) => {
  // Verificar que el llamante es admin
  if (!request.auth) throw new HttpsError('unauthenticated', 'No autorizado')

  const userDoc = await db.collection('users').doc(request.auth.uid).get()
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Acceso denegado')
  }

  const url = 'https://api.football-data.org/v4/competitions/WC/matches?season=2026'
  const apiRes = await fetch(url, {
    headers: { 'X-Auth-Token': fdorgKey.value() },
  })

  if (!apiRes.ok) {
    const errText = await apiRes.text()
    throw new HttpsError('internal', `Error de API (${apiRes.status}): ${errText}`)
  }

  const data = await apiRes.json()
  if (!data.matches) throw new HttpsError('internal', 'Respuesta inesperada de la API')

  let batch    = db.batch()
  let count    = 0
  let batchOps = 0
  const groupsMap = {}  // { 'A': Set<teamName>, ... }

  for (const fixture of data.matches) {
    const matchId  = String(fixture.id)
    const ref      = db.collection('matches').doc(matchId)

    const homeName = TEAM_ES[fixture.homeTeam.name] || fixture.homeTeam.name
    const awayName = TEAM_ES[fixture.awayTeam.name] || fixture.awayTeam.name
    const group    = fixture.group ? fixture.group.replace('GROUP_', '') : null
    const round    = STAGE_MAP[fixture.stage] || fixture.stage

    // Acumular grupos para reconstruir /config/groups al final
    if (group && fixture.homeTeam.name !== 'TBD' && fixture.awayTeam.name !== 'TBD') {
      if (!groupsMap[group]) groupsMap[group] = new Set()
      groupsMap[group].add(homeName)
      groupsMap[group].add(awayName)
    }

    // Campos que siempre se actualizan (nombres de equipos, fechas, estructura del torneo)
    const updateData = {
      matchId,
      homeTeam:  homeName,
      awayTeam:  awayName,
      homeFlag:  fixture.homeTeam.crest || null,
      awayFlag:  fixture.awayTeam.crest || null,
      group,
      round,
      matchday:  fixture.matchday ?? null,
      datetime:  Timestamp.fromDate(new Date(fixture.utcDate)),
    }

    // Solo inicializar status/finalScore en partidos no comenzados.
    // Si el partido ya está en curso o terminado, NO sobreescribir esos campos
    // (los gestiona checkLiveResults y el admin desde TabResultados).
    if (['SCHEDULED', 'TIMED'].includes(fixture.status)) {
      updateData.status     = 'NS'
      updateData.finalScore = null
    }

    batch.set(ref, updateData, { merge: true })

    count++
    batchOps++

    if (batchOps === 490) {
      await batch.commit()
      batch    = db.batch()
      batchOps = 0
    }
  }

  if (batchOps > 0) await batch.commit()

  // Reconstruir /config/groups automáticamente desde los partidos
  if (Object.keys(groupsMap).length > 0) {
    const groupsConfig = {}
    for (const [k, teams] of Object.entries(groupsMap)) {
      groupsConfig[k] = Array.from(teams).sort((a, b) => a.localeCompare(b, 'es'))
    }
    await db.collection('config').doc('groups').set(groupsConfig)
  }

  return { message: `Sincronizados ${count} partidos y ${Object.keys(groupsMap).length} grupos.` }
})
