const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { getFirestore }       = require('firebase-admin/firestore')
const { defineString }       = require('firebase-functions/params')

const db       = getFirestore()
const fdorgKey = defineString('FDORG_KEY')

exports.syncTopScorers = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'No autorizado')

  const userDoc = await db.collection('users').doc(request.auth.uid).get()
  if (!userDoc.exists || userDoc.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Acceso denegado')
  }

  const url = 'https://api.football-data.org/v4/competitions/WC/teams?season=2026'
  const apiRes = await fetch(url, {
    headers: { 'X-Auth-Token': fdorgKey.value() },
  })

  if (!apiRes.ok) {
    const errText = await apiRes.text()
    throw new HttpsError('internal', `Error de API (${apiRes.status}): ${errText}`)
  }

  const data = await apiRes.json()
  if (!data.teams) throw new HttpsError('internal', 'Respuesta inesperada de la API')

  const forwards = []

  for (const team of data.teams) {
    if (!team.squad || team.squad.length === 0) continue
    for (const player of team.squad) {
      // football-data.org usa 'Offence' para delanteros/atacantes
      if (player.position === 'Offence') {
        forwards.push(player.name)
      }
    }
  }

  forwards.sort((a, b) => a.localeCompare(b, 'es'))

  await db.collection('config').doc('topScorerCandidates').set({ players: forwards })

  return { message: `Sincronizados ${forwards.length} delanteros de ${data.teams.length} equipos.` }
})
