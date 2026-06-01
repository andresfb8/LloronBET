import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const SECTIONS = [
  {
    title: '🎯 Cómo funciona',
    items: [
      {
        q: '¿Qué es LloronBET?',
        a: 'Una quiniela privada para seguir el Mundial 2026 con tus amigos. Predices resultados de los partidos y ganas puntos fijos según los mercados que aciertes. No hay dinero real de por medio.',
      },
      {
        q: '¿Cómo me registro?',
        a: 'Ve a la pantalla de registro, introduce tu nombre, email y contraseña. Solo pueden registrarse las personas que el organizador haya invitado.',
      },
      {
        q: '¿Qué puedo predecir en cada partido?',
        a: 'Hasta 4 mercados por partido:\n• Ganador del partido (1X2) — 50 pts\n• Ambos equipos marcan (SÍ / NO) — 25 pts\n• Total de goles (Más o Menos de 2.5) — 15 pts\n• Marcador exacto — 100 pts\n\nEn partidos eliminatorios hay un 5.º mercado: ¿Quién Clasifica? — 20 pts',
      },
      {
        q: '¿Puedo cambiar mi predicción?',
        a: 'Sí, puedes modificarla todas las veces que quieras mientras el mercado esté abierto. Una vez cerrado, ya no se puede editar.',
      },
    ],
  },
  {
    title: '⏱️ Cierre de mercados',
    items: [
      {
        q: '¿Hasta cuándo puedo predecir?',
        a: 'El mercado cierra automáticamente 5 minutos antes del pitido inicial. Pasado ese límite, el formulario se bloquea y ya no se aceptan predicciones.',
      },
      {
        q: '¿Qué partidos se muestran en la pantalla principal?',
        a: 'Solo los partidos de los próximos 3 días (hoy, mañana y pasado mañana). Así no se satura la pantalla con cien partidos a la vez.\n\nAntes de que arranque el torneo, la app muestra el primer partido y un acceso directo a Pre-Mundial para que no te olvides de hacer tus pronósticos a largo plazo.',
      },
      {
        q: '¿Me avisa si tengo un partido sin apostar?',
        a: 'Sí. Si hay un partido que empieza en menos de 60 minutos y aún no has apostado, aparece un aviso ⚡ en la pantalla principal con un botón directo al partido.',
      },
      {
        q: '¿Puedo ver las predicciones de los demás?',
        a: 'No hasta que el mercado cierre. Una vez cerrado, se muestran todas las predicciones del grupo para ese partido, junto con un resumen visual de cuántos eligieron cada opción (local / empate / visitante, BTTS, Over/Under).',
      },
      {
        q: '¿Qué pasa si el partido se cancela?',
        a: 'No se calculan puntos y las predicciones quedan como nulas. No sumas ni restas.',
      },
    ],
  },
  {
    title: '🏆 Sistema de puntuación',
    items: [
      {
        q: '¿Cómo se calculan los puntos?',
        a: 'Los puntos son fijos: cada mercado que aciertes suma una cantidad determinada, independientemente de si el resultado era sorpresivo o esperado.\n\nEjemplo: predices que España gana → si aciertan, ganas 50 pts. Da igual si era favorita o no.',
      },
      {
        q: '¿Qué puntos da cada mercado?',
        a: '• Ganador (1X2): 50 pts\n• Ambos Marcan (BTTS): 25 pts\n• Total Goles (O/U 2.5): 15 pts\n• Marcador Exacto: 100 pts\n• ¿Quién Clasifica? (eliminatorias): 20 pts',
      },
      {
        q: '¿Qué es el bonus?',
        a: 'Si aciertas 3 o más mercados en el mismo partido, ganas un bonus de +30 pts.\n\nSi aciertas TODOS los mercados del partido (4 en fase de grupos, 5 en eliminatoria), el bonus sube a +50 pts, reemplazando al +30.',
      },
      {
        q: '¿Puedo predecir solo algún mercado?',
        a: 'Sí, cada mercado es independiente. Puedes apostar solo al ganador, solo al marcador exacto, o en todos a la vez. No es obligatorio rellenarlos todos.',
      },
      {
        q: '¿La prórroga y los penaltis cuentan?',
        a: 'No. Solo cuentan los 90 minutos más el tiempo de descuento. Los goles en prórroga o penaltis no afectan a ningún mercado.',
      },
      {
        q: '¿Qué pasa si predigo "Empate" y luego hay penaltis?',
        a: "Si el marcador a los 90' es empate, ganas los 50 pts del 1X2 aunque después haya prórroga o penaltis. Lo que cuenta siempre es el resultado al final del tiempo reglamentario.",
      },
    ],
  },
  {
    title: '🌍 Mercados Pre-Mundial',
    items: [
      {
        q: '¿Qué son los mercados Pre-Mundial?',
        a: 'Son predicciones a largo plazo que se rellenan antes de que empiece el torneo: Campeón, Subcampeón, Bota de Oro y qué equipos clasifican de cada grupo.',
      },
      {
        q: '¿Cuántos puntos dan?',
        a: '• Campeón: 100 pts\n• Subcampeón: 80 pts\n• Bota de Oro: 50 pts\n• Clasificados por grupo: 25 pts por cada equipo acertado',
      },
      {
        q: '¿Cuándo se cierran?',
        a: 'El administrador los bloquea manualmente antes del primer partido. Una vez bloqueados ya no se pueden modificar.',
      },
      {
        q: '¿Cuándo se saben los puntos Pre-Mundial?',
        a: 'En dos fases:\n• Al terminar la fase de grupos: el admin calcula los puntos de clasificados por grupo.\n• Al terminar el torneo: el admin calcula los puntos de campeón, subcampeón y bota de oro.\n\nAmbas se calculan de forma independiente y sin doble conteo.',
      },
    ],
  },
  {
    title: '⚔️ Partidos Eliminatorios',
    items: [
      {
        q: '¿Qué es el mercado "¿Quién Clasifica?"?',
        a: 'En los partidos de fase eliminatoria (Ronda de 32, Octavos, Cuartos, Semis y Final) aparece un mercado extra: predices qué equipo pasa a la siguiente ronda.\n\nEste mercado no tiene empate: siempre clasifica uno de los dos, aunque el partido vaya a prórroga o penaltis.',
      },
      {
        q: '¿Cuántos puntos da?',
        a: 'Acertar quién clasifica da 20 pts fijos. También cuenta para el bonus: si lo aciertas junto a otros 2 mercados del mismo partido, sumas el bonus de +30 pts.',
      },
      {
        q: '¿Cuándo cierra este mercado?',
        a: 'Igual que el resto: 5 minutos antes del pitido inicial.',
      },
    ],
  },
  {
    title: '📊 Clasificación',
    items: [
      {
        q: '¿Cómo funciona la tabla General?',
        a: 'Suma de todos los puntos ganados desde el inicio del torneo, incluyendo partidos, bonus de jornada y mercados Pre-Mundial. Se actualiza automáticamente en cuanto termina un partido.',
      },
      {
        q: '¿Qué muestra la tab "Hoy"?',
        a: 'Solo los puntos conseguidos en los partidos terminados hoy. Útil para ver quién lo está haciendo mejor en el día.',
      },
      {
        q: '¿Qué son las Jornadas?',
        a: 'Hay un mini-ranking para cada fase del torneo (Jornada 1, 2, 3, Ronda de 32, Octavos, Cuartos, Semis y Final). El jugador con más puntos en cada jornada recibe un bonus de +200 pts. Si hay empate, todos los empatados se llevan el bonus.',
      },
      {
        q: '¿Qué hay en "Diversión"?',
        a: 'Rankings sin impacto en la puntuación, solo por el honor:\n• 🔥 Rachas en 1x2: quién lleva más resultados consecutivos correctos\n• 📱 Más enganchado: el que más veces ha abierto la app\n• 🤔 Más indeciso: el que más veces ha cambiado sus predicciones',
      },
      {
        q: '¿Qué es "Mis Stats"?',
        a: 'Una tab personal con tus estadísticas: racha actual de aciertos en 1x2, tu mejor racha histórica, y el porcentaje de acierto en cada mercado (1x2, BTTS, Over/Under y Exacta).',
      },
      {
        q: '¿Qué es "H2H" (Head to Head)?',
        a: 'Puedes seleccionar dos jugadores cualesquiera y ver una comparativa directa: puntos totales, % de acierto en 1x2, y el resultado del duelo directo en los partidos donde ambos apostaron resultado (cuántos ganó cada uno).',
      },
    ],
  },
  {
    title: '👤 Perfil e historial',
    items: [
      {
        q: '¿Dónde veo todas mis predicciones pasadas?',
        a: 'En tu perfil, pulsa "Mi historial de predicciones". Verás todas tus apuestas ordenadas por fecha, con filtros por resultado: Todos, Acertados, Fallados y Pendientes.',
      },
      {
        q: '¿Qué son los logros?',
        a: 'Insignias que se desbloquean automáticamente cuando cumples ciertos hitos:\n• 🎯 Bautismo de fuego: primera predicción de resultado correcta\n• 🦅 Ojo de águila: primera exacta acertada\n• 🔥 En racha: 3 resultados consecutivos correctos\n• ⚡ Máquina: 5 resultados consecutivos correctos\n• ⭐ Partido perfecto: aciertas 1x2, BTTS y Over/Under en el mismo partido\n• 🔮 Adivino: 3 marcadores exactos acertados\n• 🏅 Veterano: 20 predicciones de resultado apostadas',
      },
      {
        q: '¿Cómo me entero de que he desbloqueado un logro?',
        a: 'La próxima vez que abras la app después de conseguirlo, aparece un banner en la parte inferior de la pantalla con el nombre y descripción del logro. Solo aparece una vez.',
      },
    ],
  },
]

export default function FaqPage() {
  const [open, setOpen] = useState(null)
  const navigate = useNavigate()

  function toggle(key) {
    setOpen(prev => prev === key ? null : key)
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-5 max-w-lg mx-auto pb-24">
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Preguntas frecuentes</h2>
        <p className="text-muted text-sm mt-1">Todo lo que necesitas saber para jugar</p>
      </div>

      {SECTIONS.map(section => (
        <div key={section.title} className="flex flex-col gap-2">
          <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted px-1">
            {section.title}
          </h3>
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {section.items.map((item, i) => {
              const key    = `${section.title}-${i}`
              const isOpen = open === key
              return (
                <div key={key} className="border-b border-border last:border-0">
                  <button
                    onClick={() => toggle(key)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left gap-3"
                  >
                    <span className={`text-sm font-body font-semibold leading-snug ${isOpen ? 'text-odds' : 'text-white'}`}>
                      {item.q}
                    </span>
                    <span className={`text-muted flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-45 text-odds' : ''}`}>
                      ✕
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4">
                      {item.a.split('\n').map((line, j) => (
                        <p key={j} className={`text-sm font-body leading-relaxed ${line.startsWith('•') ? 'text-muted pl-2' : 'text-muted'} ${j > 0 ? 'mt-1' : ''}`}>
                          {line}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Resumen de puntuación */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted">
          📋 Tabla de puntuación
        </h3>
        <div className="flex flex-col gap-1">
          {[
            ['Ganador del partido (1X2)',  '50 pts'],
            ['Ambos Marcan (BTTS)',        '25 pts'],
            ['Total Goles (O/U 2.5)',      '15 pts'],
            ['Marcador Exacto',           '100 pts'],
            ['¿Quién Clasifica? (KO)',     '20 pts'],
            ['Bonus 3 aciertos',          '+30 pts'],
            ['Bonus todos los aciertos',  '+50 pts'],
            ['Bonus jornada (1.º de fase)','+200 pts'],
            ['Campeón del Mundo',         '100 pts'],
            ['Subcampeón',                 '80 pts'],
            ['Bota de Oro',                '50 pts'],
            ['Clasificados por grupo',  '25 pts c/u'],
          ].map(([market, pts]) => (
            <div key={market} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-white font-body">{market}</span>
              <span className="font-display font-bold text-sm text-odds">{pts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
