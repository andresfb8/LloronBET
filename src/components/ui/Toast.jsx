import { useEffect } from 'react'

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const id = setTimeout(onClose, 3000)
    return () => clearTimeout(id)
  }, [onClose])

  const colors = {
    success: 'bg-win text-bg',
    error:   'bg-live text-white',
    info:    'bg-primary text-white',
  }

  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl font-body font-semibold text-sm shadow-lg ${colors[type]} animate-[slideUp_0.2s_ease]`}>
      {message}
    </div>
  )
}
