import { CATEGORIES } from '../game/board.js'

// A player's gems: six sockets in a ring, one per category, filled when won.
export default function GemBadge({ gems, size = 40 }) {
  const held = CATEGORIES.filter((c) => gems.includes(c.id)).map((c) => c.name)
  return (
    <svg
      width={size}
      height={size}
      viewBox="-20 -20 40 40"
      role="img"
      aria-label={held.length ? `Gems: ${held.join(', ')}` : 'No gems yet'}
    >
      {CATEGORIES.map((c, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 2
        const has = gems.includes(c.id)
        return (
          <rect
            key={c.id}
            x="-4.6"
            y="-4.6"
            width="9.2"
            height="9.2"
            rx="2"
            transform={`translate(${12.5 * Math.cos(angle)} ${12.5 * Math.sin(angle)}) rotate(45)`}
            fill={has ? c.color : 'none'}
            className={has ? 'gem' : 'gem empty'}
          />
        )
      })}
    </svg>
  )
}
