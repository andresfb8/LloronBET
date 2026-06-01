import OddsButton from './OddsButton'

export default function MarketSelector({ title, pts, options, selected, disabled, onChange }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-display font-semibold uppercase tracking-widest text-muted">{title}</span>
        {pts != null && (
          <span className="text-xs font-display font-semibold text-odds">+{pts} pts</span>
        )}
      </div>
      <div className="flex gap-2">
        {options.map(({ value, label }) => (
          <OddsButton
            key={value}
            label={label}
            selected={selected === value}
            disabled={disabled}
            onClick={() => !disabled && onChange(selected === value ? null : value)}
          />
        ))}
      </div>
    </div>
  )
}
