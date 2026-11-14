import { useEffect, useRef, useState } from 'react'

const L = 14, M = 30, R = 46 // pip columns/rows on a 60x60 face
const PIPS = {
  1: [[M, M]],
  2: [[L, L], [R, R]],
  3: [[L, L], [M, M], [R, R]],
  4: [[L, L], [R, L], [L, R], [R, R]],
  5: [[L, L], [R, L], [M, M], [L, R], [R, R]],
  6: [[L, L], [R, L], [L, M], [R, M], [L, R], [R, R]],
}
const randomFace = () => 1 + Math.floor(Math.random() * 6)

// Tap to roll. The face tumbles for a moment, then `onRolled(value)` reports the result.
// `value` is the roll held in game state (so a resumed game shows the right face).
export default function Die({ value, canRoll, onStart, onRolled }) {
  const [face, setFace] = useState(value ?? 6)
  const [rolling, setRolling] = useState(false)
  const timers = useRef([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const roll = () => {
    if (!canRoll || rolling) return
    const result = randomFace()
    setRolling(true)
    onStart()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tumbles = reduced ? 0 : 8
    timers.current = []
    for (let i = 0; i < tumbles; i++) timers.current.push(setTimeout(() => setFace(randomFace()), i * 70))
    timers.current.push(
      setTimeout(() => {
        setFace(result)
        setRolling(false)
        onRolled(result)
      }, tumbles * 70),
    )
  }

  const shown = rolling ? face : (value ?? face)
  return (
    <button
      type="button"
      className={`die${rolling ? ' rolling' : ''}${canRoll && !rolling ? ' ready' : ''}`}
      onClick={roll}
      disabled={!canRoll || rolling}
      aria-label={canRoll ? 'Roll the die' : `Die showing ${shown}`}
    >
      <svg viewBox="0 0 60 60" aria-hidden="true">
        <rect x="2" y="2" width="56" height="56" rx="13" className="die-face" />
        {PIPS[shown].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="5.5" className="die-pip" />
        ))}
      </svg>
    </button>
  )
}
