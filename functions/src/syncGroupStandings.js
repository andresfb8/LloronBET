const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { getFirestore }       = require('firebase-admin/firestore')
const { defineString }       = require('firebase-functions/params')

const db       = getFirestore()
const fdorgKey = defineString('FDORG_KEY')

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

exports.syncGroupStandings = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'No autorizado')

  const userDoc = await db.collection('users').doc(request.auth.uid).get()
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Acceso denegado')
  }

  const url = 'https://api.football-data.org/v4/competitions/WC/standings?season=2026'
  const apiRes = await fetch(url, {
    headers: { 'X-Auth-Token': fdorgKey.value() },
  })

  if (!apiRes.ok) {
    const errText = await apiRes.text()
    throw new HttpsError('internal', `Error de API (${apiRes.status}): ${errText}`)
  }

  const data = await apiRes.json()
  if (!data.standings || data.standings.length === 0) {
    throw new HttpsError('not-found', 'Clasificación de grupos no disponible todavía.')
  }

  const groupResults = {}

  for (const standing of data.standings) {
    if (standing.type !== 'TOTAL') continue
    const groupKey = standing.group?.replace('GROUP_', '')
    if (!groupKey || !standing.table || standing.table.length < 2) continue

    // Los dos primeros clasificados (positions 1 y 2)
    const top2 = standing.table
      .filter(row => row.position <= 2)
      .sort((a, b) => a.position - b.position)
      .map(row => TEAM_ES[row.team.name] || row.team.name)

    groupResults[groupKey] = top2
  }

  if (Object.keys(groupResults).length === 0) {
    throw new HttpsError('not-found', 'No hay grupos con clasificados todavía.')
  }

  return {
    groupResults,
    message: `Clasificados sincronizados para ${Object.keys(groupResults).length} grupos.`,
  }
})
