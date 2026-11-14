// The board as a graph: NODES (id, x, y, type, category) and ADJ (id -> neighbour ids).
// Shape: a figure-eight track. The two loops cross at the hub, and each loop has a
// shortcut running across its widest point. Coordinates are in SVG units (see VIEW).
//
// Changing anything here changes the board, so bump SAVE_VERSION in reducer.js
// to stop old saved games pointing at squares that no longer exist.

export const CATEGORIES = [
  { id: 'places', name: 'Places', icon: '🌏', color: '#2ec4b6' },
  { id: 'screen', name: 'Screen & Music', icon: '🎬', color: '#9b7bff' },
  { id: 'history', name: 'History', icon: '🏛️', color: '#ff5d5d' },
  { id: 'books', name: 'Books & Art', icon: '📚', color: '#ffb627' },
  { id: 'science', name: 'Science & Nature', icon: '🔬', color: '#4d9dff' },
  { id: 'sport', name: 'Sport & Games', icon: '⚽', color: '#6fd63f' },
]
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id)
export const CATEGORY = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))

export const HUB = 'hub'
export const VIEW = { w: 344, h: 444 }

const CX = VIEW.w / 2
const CY = VIEW.h / 2
const HALF_WIDTH = 150
const HALF_HEIGHT = 200
const LOOP_EDGES = 18 // steps around one loop, hub to hub
const SHORTCUT_SQUARES = 6
const SHORTCUT_ENDS = [5, 13] // loop positions the shortcut joins (the widest points)
const GEM_AT = [5, 9, 13] // loop positions of the gem squares
const ROLL_AGAIN_AT = { n: [2, 7, 11, 16], s: [3, 7, 11, 15] }

// Points spaced evenly (by distance along the curve) around the top loop,
// relative to the hub. The bottom loop is the same shape flipped.
function loopPoints() {
  const SAMPLES = 2000
  const pts = [[0, 0]]
  const dist = [0]
  for (let i = 1; i <= SAMPLES; i++) {
    const t = (Math.PI * i) / SAMPLES
    const p = [HALF_WIDTH * Math.sin(2 * t), -HALF_HEIGHT * Math.sin(t)]
    dist.push(dist[i - 1] + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]))
    pts.push(p)
  }
  return Array.from({ length: LOOP_EDGES - 1 }, (_, k) => {
    const target = ((k + 1) * dist[SAMPLES]) / LOOP_EDGES
    return pts[dist.findIndex((d) => d >= target)]
  })
}

const round = (n) => Math.round(n * 10) / 10

function build() {
  const nodes = [{ id: HUB, x: CX, y: CY, type: 'hub', category: null }]
  const edges = []
  let plain = 0 // ordinary category squares so far; categories are dealt out in rotation
  let gems = 0

  const add = (id, x, y, type) => {
    let category = null
    if (type === 'gem') category = CATEGORY_IDS[gems++]
    if (type === 'category') category = CATEGORY_IDS[plain++ % CATEGORY_IDS.length]
    nodes.push({ id, x: round(x), y: round(y), type, category })
  }

  for (const [side, flip] of [['n', 1], ['s', -1]]) {
    const pts = loopPoints().map(([x, y]) => [CX + x, CY + y * flip])
    pts.forEach(([x, y], i) => {
      const k = i + 1
      const type = GEM_AT.includes(k) ? 'gem' : ROLL_AGAIN_AT[side].includes(k) ? 'roll' : 'category'
      add(side + k, x, y, type)
      edges.push([k === 1 ? HUB : side + (k - 1), side + k])
    })
    edges.push([side + (LOOP_EDGES - 1), HUB])

    const [from, to] = SHORTCUT_ENDS.map((k) => pts[k - 1])
    let prev = side + SHORTCUT_ENDS[0]
    for (let j = 1; j <= SHORTCUT_SQUARES; j++) {
      const f = j / (SHORTCUT_SQUARES + 1)
      const id = `${side}x${j}`
      add(id, from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f, 'category')
      edges.push([prev, id])
      prev = id
    }
    edges.push([prev, side + SHORTCUT_ENDS[1]])
  }

  const adj = Object.fromEntries(nodes.map((n) => [n.id, []]))
  for (const [a, b] of edges) {
    adj[a].push(b)
    adj[b].push(a)
  }
  return { nodes, edges, adj }
}

const built = build()
export const NODES = built.nodes
export const EDGES = built.edges
export const ADJ = built.adj
export const NODE = Object.fromEntries(NODES.map((n) => [n.id, n]))
