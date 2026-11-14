import { useState } from 'react'
import { CATEGORIES, CATEGORY } from '../game/board.js'
import GemBadge from './GemBadge.jsx'

function Sheet({ label, className = '', children }) {
  return (
    <div className="overlay">
      <section className={`sheet ${className}`} role="dialog" aria-modal="true" aria-label={label}>
        {children}
      </section>
    </div>
  )
}

export function Toggles({ settings, onSet }) {
  const rows = [
    ['quick', 'Quick game', 'Win with any 3 gems instead of all 6'],
    ['sound', 'Sound', 'Dice and answer sounds'],
  ]
  return (
    <div className="toggles">
      {rows.map(([key, title, help]) => (
        <label key={key} className="toggle">
          <span>
            <strong>{title}</strong>
            <small>{help}</small>
          </span>
          <input type="checkbox" role="switch" checked={settings[key]} onChange={(e) => onSet(key, e.target.checked)} />
        </label>
      ))}
    </div>
  )
}

export function PassScreen({ player, onReady }) {
  return (
    <div className="overlay solid">
      <section className="pass" role="dialog" aria-modal="true" aria-label="Next player">
        <p className="eyebrow">Pass the phone to</p>
        <h2 style={{ color: player.color }}>{player.name}</h2>
        <GemBadge gems={player.gems} size={72} />
        <button type="button" className="btn primary" onClick={onReady}>
          I'm {player.name}. Start my turn
        </button>
      </section>
    </div>
  )
}

export function CategoryPicker({ player, final, onPick }) {
  return (
    <Sheet label="Choose a category">
      <p className="eyebrow">{final ? 'Final question' : 'At the crossing'}</p>
      <h2>
        {final
          ? `${player.name} has the gems. Everyone else: choose the category.`
          : `${player.name}, choose any category.`}
      </h2>
      <div className="category-grid">
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" style={{ background: c.color }} onClick={() => onPick(c.id)}>
            <span aria-hidden="true">{c.icon}</span>
            {c.name}
          </button>
        ))}
      </div>
    </Sheet>
  )
}

const KIND_LABEL = { gem: 'For the gem', final: 'Final question: answer to win', normal: 'Question' }

// Give this a `key` of the question id so the reveal state resets for each question.
export function QuestionModal({ question, kind, player, onAnswer }) {
  const [revealed, setRevealed] = useState(false)
  const category = CATEGORY[question.category]
  return (
    <Sheet label="Question" className="question">
      <header style={{ background: category.color }}>
        <span aria-hidden="true">{category.icon}</span>
        <div>
          <strong>{category.name}</strong>
          <small>
            {KIND_LABEL[kind]} · {question.difficulty}
          </small>
        </div>
      </header>
      <p className="eyebrow">{player.name} answers</p>
      <p className="question-text">{question.question}</p>
      {revealed ? (
        <>
          <p className="answer">
            <small>Answer</small>
            {question.answer}
          </p>
          <div className="judge">
            <button type="button" className="btn wrong" onClick={() => onAnswer(false)}>
              Wrong
            </button>
            <button type="button" className="btn correct" onClick={() => onAnswer(true)}>
              Correct
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="btn primary" onClick={() => setRevealed(true)}>
          Reveal answer
        </button>
      )}
    </Sheet>
  )
}

export function WinScreen({ player, onNewGame }) {
  return (
    <div className="overlay solid">
      <section className="pass" role="dialog" aria-modal="true" aria-label="Game over">
        <p className="eyebrow">Winner</p>
        <h2 style={{ color: player.color }}>{player.name}</h2>
        <GemBadge gems={player.gems} size={96} />
        <button type="button" className="btn primary" onClick={onNewGame}>
          New game
        </button>
      </section>
    </div>
  )
}

export function SettingsSheet({ settings, onSet, onNewGame, onClose }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <Sheet label="Settings">
      <h2>Settings</h2>
      <Toggles settings={settings} onSet={onSet} />
      <button
        type="button"
        className={`btn ${confirming ? 'wrong' : 'ghost'}`}
        onClick={() => (confirming ? onNewGame() : setConfirming(true))}
      >
        {confirming ? 'End this game? Tap again to confirm' : 'New game'}
      </button>
      <button type="button" className="btn primary" onClick={onClose}>
        Back to game
      </button>
    </Sheet>
  )
}
