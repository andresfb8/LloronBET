export const ROUTES = {
  LOGIN:      '/login',
  REGISTER:   '/register',
  HOME:       '/',
  MATCH:      '/match',
  STANDINGS:  '/standings',
  LONGTERM:   '/longterm',
  ADMIN:      '/admin',
}

export const WC2026_TEAMS = [
  // UEFA (16)
  'Alemania', 'Austria', 'Bélgica', 'Croacia', 'Dinamarca',
  'España', 'Francia', 'Hungría', 'Inglaterra', 'Italia',
  'Países Bajos', 'Polonia', 'Portugal', 'Rumanía', 'Serbia',
  'Suiza', 'Escocia', 'Eslovenia', 'Eslovaquia', 'Albania',
  'Georgia', 'Turquía', 'Ucrania',
  // CONMEBOL (6)
  'Argentina', 'Brasil', 'Colombia', 'Uruguay', 'Ecuador', 'Venezuela',
  // CONCACAF (6)
  'Estados Unidos', 'México', 'Canadá', 'Costa Rica', 'Panamá', 'Jamaica',
  // CAF (9)
  'Marruecos', 'Senegal', 'Nigeria', 'Camerún', 'Sudáfrica',
  'Egipto', 'Mali', 'Costa de Marfil', 'Túnez',
  // AFC (8)
  'Japón', 'Corea del Sur', 'Irán', 'Arabia Saudí',
  'Australia', 'Uzbekistán', 'Catar', 'Jordania',
  // OFC (1)
  'Nueva Zelanda',
  // Interconfederación
  'Indonesia',
].sort((a, b) => a.localeCompare(b, 'es'))

// Grupos del Mundial 2026 — 12 grupos de 4 equipos
// Se configuran desde /admin y se guardan en Firestore /config/groups
export const GROUP_LABELS = ['A','B','C','D','E','F','G','H','I','J','K','L']

// Equipos anfitriones (ventaja de sede)
export const HOST_TEAMS = ['México', 'Estados Unidos', 'Canadá']

// Logros/Badges
export const BADGES = [
  { id: 'first_correct', emoji: '🎯', name: 'Bautismo de fuego', desc: 'Primera predicción de resultado correcta' },
  { id: 'first_exact',   emoji: '🦅', name: 'Ojo de águila',    desc: 'Primera exacta acertada' },
  { id: 'streak_3',      emoji: '🔥', name: 'En racha',         desc: '3 resultados consecutivos correctos' },
  { id: 'streak_5',      emoji: '⚡', name: 'Máquina',          desc: '5 resultados consecutivos correctos' },
  { id: 'perfect_match', emoji: '⭐', name: 'Partido perfecto', desc: 'Aciertas 1x2, BTTS y Over/Under en el mismo partido' },
  { id: 'three_exacts',  emoji: '🔮', name: 'Adivino',          desc: '3 marcadores exactos acertados' },
  { id: 'veteran',       emoji: '🏅', name: 'Veterano',         desc: '20 predicciones de resultado apostadas' },
]

// Puntos fijos por mercado
export const POINTS = {
  MATCH_1X2:      50,
  MATCH_BTTS:     25,
  MATCH_OVERUNDER: 15,
  MATCH_EXACT:    100,
  MATCH_QUALIFIER: 20,
  BONUS_3:         30,
  BONUS_ALL:       50,
  LT_CHAMPION:    100,
  LT_RUNNERUP:     80,
  LT_TOPSCORER:    50,
  LT_GROUP:        25,
}
