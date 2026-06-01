export default function OddsButton({ label, selected, disabled, onClick }) {
  const base = 'flex items-center justify-center rounded-lg px-3 py-3 min-w-[72px] flex-1 transition-all duration-150 select-none'

  if (disabled) {
    return (
      <div className={`${base} bg-odds-default opacity-50 cursor-not-allowed`}>
        <span className="text-muted text-sm font-body font-semibold">{label}</span>
      </div>
    )
  }

  if (selected) {
    return (
      <button
        onClick={onClick}
        className={`${base} bg-selected shadow-[0_0_12px_rgba(255,223,27,0.4)] active:scale-95`}
      >
        <span className="text-selected-text text-sm font-body font-semibold">{label}</span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`${base} bg-odds-default hover:bg-[#2a3d2e] active:scale-95`}
    >
      <span className="text-muted text-sm font-body font-semibold">{label}</span>
    </button>
  )
}
