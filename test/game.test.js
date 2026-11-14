import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ADJ, NODES, NODE, HUB, CATEGORY_IDS } from '../src/game/board.js'
import {
  createReducer,
  drawQuestion,
  initialState,
  isValidSave,
  reachable,
  SAVE_VERSION,
} from '../src/game/reducer.js'

const questions = JSON.parse(readFileSync(new URL('../src/data/questions.json', import.meta.url)))

// A tiny pool is enough to test the rules: two questions per category.
const pool = Object.fromEntries(CATEGORY_IDS.map((c) => [c, [`${c}-a`, `${c}-b`]]))
const reducer = createReducer(pool)
const run = (state, ...actions) => actions.reduce(reducer, state)
const start = (settings) =>
  run(
    initialState(settings),
    { type: 'START', players: [{ name: 'Ann', color: '#fff' }, { name: 'Bob', color: '#000' }] },
    { type: 'BEGIN_TURN' },
  )
// Put the current player on `pos` with `gems`, ready to roll.
const place = (state, pos, gems = []) => ({
  ...state,
  players: state.players.map((p, i) => (i === state.current ? { ...p, pos, gems } : p)),
})
const sorted = (list) => [...list].sort()

test('board: every category has one gem square and the graph is connected', () => {
  const gemCats = NODES.filter((n) => n.type === 'gem').map((n) => n.category)
  assert.deepEqual(sorted(gemCats), sorted(CATEGORY_IDS))
  assert.ok(NODES.some((n) => n.type === 'roll'))
  for (const id of Object.keys(ADJ)) for (const other of ADJ[id]) assert.ok(ADJ[other].includes(id))
  const seen = new Set([HUB])
  const queue = [HUB]
  while (queue.length) for (const n of ADJ[queue.pop()]) if (!seen.has(n)) seen.add(n) && queue.push(n)
  assert.equal(seen.size, NODES.length)
})

test('reachable: exact count, any direction, no backtracking', () => {
  // A line a-b-c-d with a side branch off b.
  const adj = { a: ['b'], b: ['a', 'c', 'e'], c: ['b', 'd'], d: ['c'], e: ['b'] }
  assert.deepEqual(sorted(reachable(adj, 'a', 1)), ['b'])
  assert.deepEqual(sorted(reachable(adj, 'a', 2)), ['c', 'e']) // not back to a
  assert.deepEqual(sorted(reachable(adj, 'a', 3)), ['d'])
  assert.deepEqual(reachable(adj, 'a', 4), []) // dead end: cannot bounce back

  // On the real board: four arms leave the hub.
  assert.deepEqual(sorted(reachable(ADJ, HUB, 1)), ['n1', 'n17', 's1', 's17'])
  assert.deepEqual(sorted(reachable(ADJ, HUB, 5)), ['n13', 'n5', 's13', 's5'])
  // From a shortcut junction a 2 can go three ways, and never returns to the start.
  assert.deepEqual(sorted(reachable(ADJ, 'n5', 2)), ['n3', 'n7', 'nx2'])
  // Every square always has somewhere to go for every roll.
  for (const n of NODES) for (let roll = 1; roll <= 6; roll++) {
    const targets = reachable(ADJ, n.id, roll)
    assert.ok(targets.length > 0)
    assert.ok(!targets.includes(n.id))
  }
})

test('rolling sets the reachable squares and only those can be moved to', () => {
  const rolled = run(start(), { type: 'ROLL', value: 1 })
  assert.equal(rolled.phase, 'move')
  assert.deepEqual(sorted(rolled.reachable), ['n1', 'n17', 's1', 's17'])
  assert.equal(run(rolled, { type: 'MOVE', node: 'n9', rand: 0 }), rolled) // illegal: ignored
  const moved = run(rolled, { type: 'MOVE', node: 'n1', rand: 0 })
  assert.equal(moved.players[0].pos, 'n1')
  assert.equal(moved.phase, 'question')
  assert.equal(moved.question.category, NODE.n1.category)
})

test('a roll-again square gives the same player another roll', () => {
  const s = run(start(), { type: 'ROLL', value: 2 }, { type: 'MOVE', node: 'n2', rand: 0 })
  assert.equal(NODE.n2.type, 'roll')
  assert.equal(s.phase, 'roll')
  assert.equal(s.current, 0)
})

test('correct answer rolls again; wrong answer passes to the next player', () => {
  const asked = run(start(), { type: 'ROLL', value: 1 }, { type: 'MOVE', node: 'n1', rand: 0 })
  const right = run(asked, { type: 'ANSWER', correct: true })
  assert.equal(right.phase, 'roll')
  assert.equal(right.current, 0)
  assert.deepEqual(right.players[0].gems, []) // ordinary square: no gem
  const wrong = run(asked, { type: 'ANSWER', correct: false })
  assert.equal(wrong.phase, 'pass')
  assert.equal(wrong.current, 1)
})

test('gems: awarded only for a correct answer on a gem square, and only once', () => {
  const cat = NODE.n5.category
  const onGem = run(start(), { type: 'ROLL', value: 5 }, { type: 'MOVE', node: 'n5', rand: 0 })
  assert.equal(onGem.question.kind, 'gem')

  const wrong = run(onGem, { type: 'ANSWER', correct: false })
  assert.deepEqual(wrong.players[0].gems, [])

  const right = run(onGem, { type: 'ANSWER', correct: true })
  assert.deepEqual(right.players[0].gems, [cat])
  assert.deepEqual(right.players[1].gems, [])

  // Landing there again with the gem already held is an ordinary question.
  const again = run(place(start(), 'n4', [cat]), { type: 'ROLL', value: 1 }, { type: 'MOVE', node: 'n5', rand: 0 })
  assert.equal(again.question.kind, 'normal')
  assert.deepEqual(run(again, { type: 'ANSWER', correct: true }).players[0].gems, [cat])
})

test('win: all gems, land exactly on the hub, others pick, answer correctly', () => {
  const toHub = [{ type: 'ROLL', value: 1 }, { type: 'MOVE', node: HUB, rand: 0 }]

  // Without all the gems the hub is just a free choice of category.
  const early = run(place(start(), 'n1', CATEGORY_IDS.slice(0, 5)), ...toHub)
  assert.equal(early.phase, 'pick')
  assert.equal(early.picker, 'self')
  const earlyRight = run(early, { type: 'PICK', category: 'history', rand: 0 }, { type: 'ANSWER', correct: true })
  assert.equal(earlyRight.phase, 'roll')
  assert.equal(earlyRight.winner, null)

  const ready = run(place(start(), 'n1', CATEGORY_IDS), ...toHub)
  assert.equal(ready.picker, 'final')
  const final = run(ready, { type: 'PICK', category: 'sport', rand: 0 })
  assert.deepEqual([final.question.kind, final.question.category], ['final', 'sport'])

  const lost = run(final, { type: 'ANSWER', correct: false })
  assert.equal(lost.phase, 'pass')
  assert.equal(lost.winner, null)

  const won = run(final, { type: 'ANSWER', correct: true })
  assert.equal(won.phase, 'won')
  assert.equal(won.winner, 0)
})

test('quick mode needs only three gems', () => {
  const toHub = [{ type: 'ROLL', value: 1 }, { type: 'MOVE', node: HUB, rand: 0 }]
  const three = CATEGORY_IDS.slice(0, 3)
  assert.equal(run(place(start({ quick: true, sound: true }), 'n1', three), ...toHub).picker, 'final')
  assert.equal(run(place(start({ quick: false, sound: true }), 'n1', three), ...toHub).picker, 'self')
})

test('questions do not repeat until the category runs out, then start over', () => {
  const ids = ['q1', 'q2', 'q3', 'q4', 'q5']
  let used = []
  const drawn = []
  for (let i = 0; i < ids.length; i++) {
    const d = drawQuestion(ids, used, (i * 0.37) % 1)
    drawn.push(d.id)
    used = d.used
  }
  assert.deepEqual(sorted(drawn), ids) // all five, no repeats
  const next = drawQuestion(ids, used, 0.5)
  assert.ok(ids.includes(next.id))
  assert.deepEqual(next.used, [next.id]) // pool reset

  // Through the reducer: used ids are tracked per category.
  const cat = NODE.n1.category
  const first = run(start(), { type: 'ROLL', value: 1 }, { type: 'MOVE', node: 'n1', rand: 0 })
  assert.deepEqual(first.used[cat], [first.question.id])
  const second = run(place({ ...first, phase: 'roll' }, HUB), { type: 'ROLL', value: 1 }, { type: 'MOVE', node: 'n1', rand: 0 })
  assert.notEqual(second.question.id, first.question.id)
  assert.equal(second.used[cat].length, 2)
})

test('saved games: incompatible or broken saves are rejected', () => {
  const has = (id) => id === 'places-a'
  const good = start()
  assert.equal(isValidSave(good, has), true)
  assert.equal(isValidSave(null, has), false)
  assert.equal(isValidSave({ ...good, v: SAVE_VERSION + 1 }, has), false)
  assert.equal(isValidSave(place(good, 'nowhere'), has), false)
  assert.equal(isValidSave({ ...good, phase: 'question', question: { id: 'gone' } }, has), false)
  assert.equal(isValidSave({ ...good, phase: 'question', question: { id: 'places-a' } }, has), true)
})

test('questions.json: well formed, unique ids, at least 100 per category', () => {
  const ids = new Set()
  const count = Object.fromEntries(CATEGORY_IDS.map((c) => [c, 0]))
  for (const q of questions) {
    assert.ok(CATEGORY_IDS.includes(q.category), `unknown category on ${q.id}`)
    assert.ok(!ids.has(q.id), `duplicate id ${q.id}`)
    ids.add(q.id)
    for (const key of ['id', 'question', 'answer']) {
      assert.ok(typeof q[key] === 'string' && q[key].trim(), `${q.id} is missing ${key}`)
    }
    assert.ok(['easy', 'medium', 'hard'].includes(q.difficulty), `bad difficulty on ${q.id}`)
    count[q.category]++
  }
  for (const c of CATEGORY_IDS) assert.ok(count[c] >= 100, `${c} has only ${count[c]} questions`)
})
