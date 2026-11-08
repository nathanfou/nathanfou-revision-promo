import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from './useMediaQuery'

/** Compteur qui monte (ease-out cubique), comme dans la maquette. Respecte "réduire les animations". */
export function useCountUp(target: number, durationMs = 1400) {
  const reduce = useReducedMotion()
  const [value, setValue] = useState(0)
  const current = useRef(0)
  useEffect(() => {
    const from = current.current
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const k = reduce ? 1 : Math.min(1, (t - start) / durationMs)
      const v = from + (target - from) * (1 - Math.pow(1 - k, 3))
      current.current = v
      setValue(v)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs, reduce])
  return Math.round(value)
}
