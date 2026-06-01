export default function MatchStatusBadge({ status }) {
  if (status === 'LIVE') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-display font-semibold text-live">
        <span className="w-1.5 h-1.5 rounded-full bg-live animate-pulse" />
        LIVE
      </span>
    )
  }
  if (status === 'FT') {
    return (
      <span className="text-xs font-display font-semibold text-win">FT</span>
    )
  }
  if (status === 'CANC') {
    return (
      <span className="text-xs font-display font-semibold text-muted">CANC</span>
    )
  }
  // NS
  return (
    <span className="text-xs font-display font-semibold text-muted">NS</span>
  )
}
