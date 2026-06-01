export default function ExactScoreInput({ value, onChange, disabled, pts = 100 }) {
  const inputClass = `w-14 h-14 text-center font-display font-bold text-2xl bg-odds-default border-2 rounded-xl text-white
    focus:outline-none transition-colors
    ${disabled ? 'opacity-50 cursor-not-allowed border-border' : 'border-border focus:border-odds'}`

  function handleChange(field, raw) {
    const n = parseInt(raw, 10)
    if (raw === '' || (!isNaN(n) && n >= 0 && n <= 20)) {
      onChange({ ...value, [field]: raw === '' ? '' : n })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted">Marcador Exacto</span>
        <span className="text-xs font-display font-semibold text-odds">+{pts} pts si aciertas</span>
      </div>
      <div className="flex items-center gap-3 justify-center">
        <input
          type="number"
          min="0" max="20"
          value={value?.home ?? ''}
          onChange={e => handleChange('home', e.target.value)}
          disabled={disabled}
          className={inputClass}
          placeholder="0"
        />
        <span className="font-display font-bold text-2xl text-muted">–</span>
        <input
          type="number"
          min="0" max="20"
          value={value?.away ?? ''}
          onChange={e => handleChange('away', e.target.value)}
          disabled={disabled}
          className={inputClass}
          placeholder="0"
        />
      </div>
    </div>
  )
}
