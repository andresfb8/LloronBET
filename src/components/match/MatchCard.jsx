import { useNavigate } from 'react-router-dom'
import { format, differenceInSeconds, subMinutes } from 'date-fns'
import MatchStatusBadge from './MatchStatusBadge'
import CountdownTimer from '../ui/CountdownTimer'

export default function MatchCard({ match, prediction }) {
  const navigate   = useNavigate()
  const datetime   = match.datetime?.toDate ? match.datetime.toDate() : new Date(match.datetime)
  const timeStr    = format(datetime, 'HH:mm')
  const hasPred    = !!prediction
  const isFt       = match.status === 'FT'
  const isLive     = match.status === 'LIVE'

  // Show countdown if market closes within the next 24 hours
  const secsToClose = differenceInSeconds(subMinutes(datetime, 5), new Date())
  const showCountdown = secsToClose > 0 && secsToClose <= 86400 && !isFt && !isLive

  return (
    <button
      onClick={() => navigate(`/match/${match.id}`)}
      className="w-full bg-surface border border-border rounded-xl p-4 flex flex-col gap-3 active:scale-[0.98] transition-transform text-left"
    >
      {/* Top row: group/round + status + prediction badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{match.round} {match.group ? `· Grupo ${match.group}` : ''}</span>
        <div className="flex items-center gap-2">
          {hasPred ? (
            <span className="text-xs font-display font-semibold text-win">✓ Guardado</span>
          ) : (!isFt && !isLive && secsToClose > 0) ? (
            <span className="text-xs font-display font-semibold text-live bg-live/10 px-1.5 py-0.5 rounded">Pendiente</span>
          ) : null}
          <MatchStatusBadge status={match.status} />
        </div>
      </div>

      {/* Teams row */}
      <div className="flex items-center justify-between gap-2">
        {/* Home team */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {match.homeFlag
            ? <img src={match.homeFlag} alt={match.homeTeam} className="w-7 h-7 rounded-sm object-cover flex-shrink-0" />
            : <span className="w-7 h-7 rounded-sm bg-border flex-shrink-0" />
          }
          <span className="font-body font-semibold text-sm text-white truncate">{match.homeTeam}</span>
        </div>

        {/* Score / time */}
        <div className="flex-shrink-0 text-center min-w-[64px]">
          {(isLive || isFt) && match.finalScore ? (
            <span className={`font-display font-bold text-xl tabular-nums ${isLive ? 'text-live' : 'text-white'}`}>
              {match.finalScore.home} – {match.finalScore.away}
            </span>
          ) : (
            <span className="font-display text-sm text-muted tabular-nums">{timeStr}</span>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="font-body font-semibold text-sm text-white truncate text-right">{match.awayTeam}</span>
          {match.awayFlag
            ? <img src={match.awayFlag} alt={match.awayTeam} className="w-7 h-7 rounded-sm object-cover flex-shrink-0" />
            : <span className="w-7 h-7 rounded-sm bg-border flex-shrink-0" />
          }
        </div>
      </div>

      {/* Countdown (24h before market close) */}
      {showCountdown && (
        <div className="flex justify-center">
          <CountdownTimer datetime={match.datetime} />
        </div>
      )}

      {/* Points won row (only FT + prediction with points) */}
      {isFt && prediction?.points_won != null && (
        <div className="flex justify-end">
          <span className="text-xs font-display font-semibold text-win">
            +{prediction.points_won.toFixed(1)} pts
          </span>
        </div>
      )}
    </button>
  )
}
