export default function Spinner({ className = '' }) {
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className="w-8 h-8 border-4 border-border border-t-odds rounded-full animate-spin" />
    </div>
  )
}
