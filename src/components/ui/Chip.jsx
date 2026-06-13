export default function Chip({ label, highlight = false }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-body ${highlight ? 'bg-odds text-selected-text font-semibold' : 'bg-odds-default text-muted'}`}>
      {label}
    </span>
  )
}
