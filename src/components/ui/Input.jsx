export default function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm text-muted">{label}</label>}
      <input
        className={`bg-odds-default border border-border rounded-lg px-3 py-2 text-white placeholder:text-muted focus:outline-none focus:border-primary transition-colors ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-live">{error}</span>}
    </div>
  )
}
