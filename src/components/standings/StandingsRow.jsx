export default function StandingsRow({ position, profile, points, isCurrentUser }) {
  const initials = profile.username?.slice(0, 2).toUpperCase() ?? '??'

  const posColor =
    position === 1 ? 'text-[#FFD700]' :
    position === 2 ? 'text-[#C0C0C0]' :
    position === 3 ? 'text-[#CD7F32]' :
    'text-muted'

  return (
    <div className={`flex items-center gap-3 py-3 border-b border-border last:border-0 ${isCurrentUser ? 'bg-primary/10 -mx-4 px-4 rounded-lg' : ''}`}>
      {/* Position */}
      <span className={`font-display font-bold text-lg w-7 text-center flex-shrink-0 ${posColor}`}>
        {position}
      </span>

      {/* Avatar */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-display font-bold text-sm ${isCurrentUser ? 'bg-primary text-white' : 'bg-odds-default text-muted'}`}>
        {initials}
      </div>

      {/* Name */}
      <span className={`font-body font-semibold text-sm flex-1 truncate ${isCurrentUser ? 'text-odds' : 'text-white'}`}>
        {profile.username}
        {isCurrentUser && <span className="text-xs text-muted font-normal ml-1">(tú)</span>}
      </span>

      {/* Points */}
      <span className="font-display font-bold text-lg text-white tabular-nums">
        {points.toFixed(1)}
      </span>
    </div>
  )
}
