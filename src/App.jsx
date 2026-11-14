import { useEffect, useReducer, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import questions from './data/questions.json'
import { createReducer, gemsNeeded, initialState, isValidSave } from './game/reducer.js'
import { load, save } from './storage.js'
import { play } from './sound.js'
import Board from './components/Board.jsx'
import Die from './components/Die.jsx'
import GemBadge from './components/GemBadge.jsx'
import Setup from './components/Setup.jsx'
import { CategoryPicker, PassScreen, QuestionModal, SettingsSheet, Toggles, WinScreen } from './components/Modals.jsx'

const questionById = Object.fromEntries(questions.map((q) => [q.id, q]))
const idsByCategory = {}
for (const q of questions) (idsByCategory[q.category] ||= []).push(q.id)
const reducer = createReducer(idsByCategory)

const isInstalled = () =>
  window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches

function loadSavedGame() {
  const game = load('game')
  if (isValidSave(game, (id) => id in questionById)) return game
  save('game', null) // old version or damaged: discard it
  return null
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(load('settings') || undefined))
  const [saved, setSaved] = useState(loadSavedGame)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [installHint, setInstallHint] = useState(() => !isInstalled() && !load('hint'))
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  // Save after every change, so closing the app at any point loses nothing.
  useEffect(() => {
    save('settings', state.settings)
    if (state.phase === 'setup') return // the launch screen must not overwrite a game waiting to be resumed
    save('game', state.phase === 'won' ? null : state)
  }, [state])

  const sfx = (name) => state.settings.sound && play(name)
  const onSet = (key, value) => dispatch({ type: 'SET', key, value })
  const newGame = () => {
    save('game', null)
    setSaved(null)
    setSettingsOpen(false)
    dispatch({ type: 'NEW_GAME' })
  }
  const answer = (correct) => {
    sfx(!correct ? 'wrong' : state.question.kind === 'final' ? 'win' : 'correct')
    dispatch({ type: 'ANSWER', correct })
  }

  const player = state.players[state.current]
  const status =
    state.phase === 'roll'
      ? `${player.name}, tap the die to roll`
      : state.phase === 'move'
        ? `Rolled ${state.roll}. Tap a glowing square`
        : ''

  return (
    <div className="app">
      {needRefresh && (
        <button type="button" className="banner update" onClick={() => updateServiceWorker(true)}>
          Update available — tap to reload
        </button>
      )}

      {state.phase === 'setup' ? (
        <>
          <Setup
            saved={saved}
            onResume={() => dispatch({ type: 'LOAD', state: saved })}
            onStart={(players) => dispatch({ type: 'START', players })}
          >
            <Toggles settings={state.settings} onSet={onSet} />
          </Setup>
          {installHint && (
            <div className="banner install">
              <span>Tap Share → Add to Home Screen to install</span>
              <button
                type="button"
                className="icon-btn"
                aria-label="Dismiss"
                onClick={() => {
                  save('hint', true)
                  setInstallHint(false)
                }}
              >
                ✕
              </button>
            </div>
          )}
        </>
      ) : (
        <main className="game">
          <header className="topbar">
            <h1>Eight Track</h1>
            <button type="button" className="icon-btn" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
              ⚙
            </button>
          </header>
          <div className="stripes" aria-hidden="true" />

          <ul className="players">
            {state.players.map((p, i) => (
              <li key={i} className={i === state.current ? 'current' : ''} style={{ '--token': p.color }}>
                <GemBadge gems={p.gems} size={34} />
                <span className="player-name">{p.name}</span>
                <span className="player-count">
                  {p.gems.length}/{gemsNeeded(state.settings)}
                </span>
              </li>
            ))}
          </ul>

          <Board
            players={state.players}
            current={state.current}
            reachable={state.phase === 'move' ? state.reachable : []}
            onMove={(node) => {
              sfx('move')
              dispatch({ type: 'MOVE', node, rand: Math.random() })
            }}
          />

          <footer className="controls">
            <p aria-live="polite">{status}</p>
            <Die
              value={state.roll}
              canRoll={state.phase === 'roll'}
              onStart={() => sfx('roll')}
              onRolled={(value) => dispatch({ type: 'ROLL', value })}
            />
          </footer>

          {state.phase === 'pass' && <PassScreen player={player} onReady={() => dispatch({ type: 'BEGIN_TURN' })} />}
          {state.phase === 'pick' && (
            <CategoryPicker
              player={player}
              final={state.picker === 'final'}
              onPick={(category) => dispatch({ type: 'PICK', category, rand: Math.random() })}
            />
          )}
          {state.phase === 'question' && (
            <QuestionModal
              key={state.question.id}
              question={questionById[state.question.id]}
              kind={state.question.kind}
              player={player}
              onAnswer={answer}
            />
          )}
          {state.phase === 'won' && <WinScreen player={state.players[state.winner]} onNewGame={newGame} />}
          {settingsOpen && (
            <SettingsSheet settings={state.settings} onSet={onSet} onNewGame={newGame} onClose={() => setSettingsOpen(false)} />
          )}
        </main>
      )}
    </div>
  )
}
