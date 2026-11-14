import { CATEGORY, EDGES, NODE, NODES, VIEW } from '../game/board.js'

const label = (node) =>
  node.type === 'hub'
    ? 'the crossing'
    : node.type === 'roll'
      ? 'roll again'
      : `${CATEGORY[node.category].name}${node.type === 'gem' ? ' gem square' : ''}`

function Square({ node, dim }) {
  const color = node.category ? CATEGORY[node.category].color : undefined
  return (
    <g transform={`translate(${node.x} ${node.y})`} opacity={dim ? 0.35 : 1} className="square">
      {node.type === 'hub' && (
        <>
          <circle r="21" className="hub" />
          <text className="glyph hub-glyph">★</text>
        </>
      )}
      {node.type === 'roll' && (
        <>
          <circle r="13.5" className="roll-again" />
          <text className="glyph">🎲</text>
        </>
      )}
      {node.type === 'category' && (
        <>
          <circle r="13.5" fill={color} />
          <text className="glyph">{CATEGORY[node.category].icon}</text>
        </>
      )}
      {node.type === 'gem' && (
        <>
          <rect x="-15" y="-15" width="30" height="30" rx="6" transform="rotate(45)" fill={color} className="gem-square" />
          <text className="glyph">{CATEGORY[node.category].icon}</text>
        </>
      )}
    </g>
  )
}

// Where a player's token sits on its square. Tokens sharing a square fan out in a ring.
function tokenPosition(player, players) {
  const node = NODE[player.pos]
  const mates = players.filter((p) => p.pos === player.pos)
  if (mates.length === 1) return node
  const angle = (2 * Math.PI * mates.indexOf(player)) / mates.length - Math.PI / 2
  const spread = Math.max(9, 2.6 * mates.length) // wider ring when the square is crowded
  return { x: node.x + spread * Math.cos(angle), y: node.y + spread * Math.sin(angle) }
}

export default function Board({ players, current, reachable, onMove }) {
  const choosing = reachable.length > 0
  // Draw the current player's token last so it is always on top.
  const order = players.map((_, i) => i).sort((a, b) => (a === current) - (b === current))

  return (
    <svg className="board" viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} role="group" aria-label="Game board">
      {EDGES.map(([a, b]) => (
        <line key={a + b} x1={NODE[a].x} y1={NODE[a].y} x2={NODE[b].x} y2={NODE[b].y} className="track" />
      ))}

      {NODES.map((node) => (
        <Square key={node.id} node={node} dim={choosing && !reachable.includes(node.id)} />
      ))}

      {order.map((i) => {
        const p = players[i]
        const { x, y } = tokenPosition(p, players)
        return (
          <g key={i} className="token" style={{ transform: `translate(${x}px, ${y}px)` }}>
            {i === current && <circle r="11.5" className="token-ring" />}
            <circle r="8" fill={p.color} className="token-body" />
            <text className="token-initial">{[...p.name][0].toUpperCase()}</text>
          </g>
        )
      })}

      {reachable.map((id) => (
        <g key={id} transform={`translate(${NODE[id].x} ${NODE[id].y})`}>
          <circle r="19" className="target-ring" />
          {/* r=22 gives a 44px tap target at phone size */}
          <circle
            r="22"
            className="target-hit"
            role="button"
            tabIndex="0"
            aria-label={`Move to ${label(NODE[id])}`}
            onClick={() => onMove(id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onMove(id)}
          />
        </g>
      ))}
    </svg>
  )
}
