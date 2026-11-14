// The rules. Everything here is pure: dice values and random numbers arrive in the
// action, so the same state + action always gives the same result (and can be tested).
import { ADJ, NODE, HUB, CATEGORY_IDS } from './board.js'

// Bump when the saved-state shape or the board layout changes. Older saves are discarded.
export const SAVE_VERSION = 1

const PHASES = ['setup', 'pass', 'roll', 'move', 'pick', 'question', 'won']

export const initialState = (settings = { quick: false, sound: true }) => ({
  v: SAVE_VERSION,
  phase: 'setup',
  players: [], // { name, color, pos, gems: [categoryId] }
  current: 0,
  roll: null,
  reachable: [],
  picker: null, // 'self' (current player picks) | 'final' (the other players pick)
  question: null, // { id, category, kind: 'normal' | 'gem' | 'final' }
  used: {}, // categoryId -> question ids already asked this game
  winner: null,
  settings,
})

export const gemsNeeded = (settings) => (settings.quick ? 3 : CATEGORY_IDS.length)

// Every square exactly `steps` moves from `start`, in any direction, never
// revisiting a square within the move (so no doubling back).
export function reachable(adj, start, steps) {
  const found = new Set()
  const seen = new Set([start])
  const walk = (node, left) => {
    if (left === 0) return found.add(node)
    for (const next of adj[node]) {
      if (seen.has(next)) continue
      seen.add(next)
      walk(next, left - 1)
      seen.delete(next)
    }
  }
  walk(start, steps)
  return [...found]
}

// Pick a question id that has not been used this game. When the category runs
// out, the used list resets and the whole pool is available again.
// `rand` is a number in [0, 1).
export function drawQuestion(ids, used, rand) {
  let fresh = ids.filter((id) => !used.includes(id))
  if (fresh.length === 0) {
    fresh = ids
    used = []
  }
  const id = fresh[Math.floor(rand * fresh.length)]
  return { id, used: [...used, id] }
}

// Is this a saved game we can safely resume? `hasQuestion(id)` says whether a
// question id still exists in the current questions file.
export function isValidSave(s, hasQuestion) {
  return Boolean(
    s &&
      s.v === SAVE_VERSION &&
      PHASES.includes(s.phase) &&
      s.phase !== 'setup' &&
      Array.isArray(s.players) &&
      s.players.length >= 2 &&
      s.players.every((p) => p && NODE[p.pos] && Array.isArray(p.gems)) &&
      s.players[s.current] &&
      Array.isArray(s.reachable) &&
      s.used &&
      s.settings &&
      (s.phase !== 'question' || (s.question && hasQuestion(s.question.id))),
  )
}

// questionIds: { categoryId: [question ids] }
export function createReducer(questionIds) {
  const ask = (state, category, kind, rand) => {
    const { id, used } = drawQuestion(questionIds[category], state.used[category] || [], rand)
    return {
      ...state,
      phase: 'question',
      picker: null,
      question: { id, category, kind },
      used: { ...state.used, [category]: used },
    }
  }

  return function reducer(state, action) {
    const player = state.players[state.current]

    switch (action.type) {
      case 'START':
        return {
          ...initialState(state.settings),
          phase: 'pass',
          players: action.players.map(({ name, color }) => ({ name, color, pos: HUB, gems: [] })),
        }

      case 'BEGIN_TURN':
        return state.phase === 'pass' ? { ...state, phase: 'roll' } : state

      case 'ROLL':
        if (state.phase !== 'roll') return state
        return { ...state, phase: 'move', roll: action.value, reachable: reachable(ADJ, player.pos, action.value) }

      case 'MOVE': {
        if (state.phase !== 'move' || !state.reachable.includes(action.node)) return state
        const moved = {
          ...state,
          roll: null,
          reachable: [],
          players: state.players.map((p, i) => (i === state.current ? { ...p, pos: action.node } : p)),
        }
        const node = NODE[action.node]
        if (node.type === 'roll') return { ...moved, phase: 'roll' }
        if (node.type === 'hub') {
          const ready = player.gems.length >= gemsNeeded(state.settings)
          return { ...moved, phase: 'pick', picker: ready ? 'final' : 'self' }
        }
        const forGem = node.type === 'gem' && !player.gems.includes(node.category)
        return ask(moved, node.category, forGem ? 'gem' : 'normal', action.rand)
      }

      case 'PICK':
        if (state.phase !== 'pick') return state
        return ask(state, action.category, state.picker === 'final' ? 'final' : 'normal', action.rand)

      case 'ANSWER': {
        if (state.phase !== 'question') return state
        const { kind, category } = state.question
        const next = { ...state, question: null }
        if (!action.correct) {
          return { ...next, phase: 'pass', current: (state.current + 1) % state.players.length }
        }
        if (kind === 'final') return { ...next, phase: 'won', winner: state.current }
        if (kind === 'gem') {
          next.players = state.players.map((p, i) =>
            i === state.current ? { ...p, gems: [...p.gems, category] } : p,
          )
        }
        return { ...next, phase: 'roll' } // correct answer: roll again
      }

      case 'SET':
        return { ...state, settings: { ...state.settings, [action.key]: action.value } }

      case 'NEW_GAME':
        return initialState(state.settings)

      case 'LOAD':
        return action.state

      default:
        return state
    }
  }
}
