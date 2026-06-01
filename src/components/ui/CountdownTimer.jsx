import { useEffect, useState } from 'react'
import { differenceInSeconds, subMinutes } from 'date-fns'

export default function CountdownTimer({ datetime }) {
  const [secsLeft, setSecsLeft] = useState(null)

  useEffect(() => {
    const closeTime = subMinutes(datetime?.toDate ? datetime.toDate() : new Date(datetime), 5)

    function update() {
      setSecsLeft(differenceInSeconds(closeTime, new Date()))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [datetime])

  if (secsLeft === null) return null

  if (secsLeft <= 0) {
    return <span className="text-live font-display font-semibold text-sm">MERCADO CERRADO</span>
  }

  const h = Math.floor(secsLeft / 3600)
  const m = Math.floor((secsLeft % 3600) / 60)
  const s = secsLeft % 60

  if (h > 0) {
    return (
      <span className="text-muted text-sm">
        Cierre en {h}h {String(m).padStart(2, '0')}m
      </span>
    )
  }

  return (
    <span className="text-odds font-display font-semibold text-sm">
      Cierre en {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}
