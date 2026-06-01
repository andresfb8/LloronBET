export default function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'px-4 py-2 rounded-lg font-body font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary:   'bg-primary hover:bg-primary-dark text-white',
    secondary: 'bg-surface border border-border text-white hover:bg-odds-default',
    danger:    'bg-live text-white hover:opacity-90',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
