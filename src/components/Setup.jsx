import { useState } from 'react'

export const TOKEN_COLORS = [
  { name: 'Pink', hex: '#ff8fab' },
  { name: 'Sky', hex: '#7ee0ff' },
  { name: 'Lime', hex: '#c8f560' },
  { name: 'Gold', hex: '#ffd166' },
  { name: 'Lilac', hex: '#d7a6ff' },
  { name: 'White', hex: '#ffffff' },
]
const MIN = 2
const MAX = 6
const colorName = (hex) => TOKEN_COLORS.find((c) => c.hex === hex).name

export default function Setup({ saved, onResume, onStart, children }) {
  const [rows, setRows] = useState([
    { name: '', color: TOKEN_COLORS[0].hex },
    { name: '', color: TOKEN_COLORS[1].hex },
  ])
  const taken = rows.map((r) => r.color)
  const update = (i, patch) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  // Tapping a swatch moves to the next colour nobody else is using.
  const nextColor = (i) => {
    const from = TOKEN_COLORS.findIndex((c) => c.hex === rows[i].color)
    for (let step = 1; step < TOKEN_COLORS.length; step++) {
      const { hex } = TOKEN_COLORS[(from + step) % TOKEN_COLORS.length]
      if (!taken.includes(hex)) return update(i, { color: hex })
    }
  }

  const start = (e) => {
    e.preventDefault()
    onStart(rows.map((r, i) => ({ name: r.name.trim() || `Player ${i + 1}`, color: r.color })))
  }

  return (
    <main className="setup">
      <header className="masthead">
        <h1>
          Eight Track <span>Trivia</span>
        </h1>
        <div className="stripes" aria-hidden="true" />
        <p>
          Pass one phone around. Win a gem in each of the six categories, then get back to the crossing and
          answer one last question to win.
        </p>
      </header>

      {saved && (
        <section className="card resume">
          <div>
            <h2>Game in progress</h2>
            <p>
              {saved.players.map((p) => p.name).join(', ')} · {saved.players[saved.current].name}'s turn
            </p>
          </div>
          <button type="button" className="btn primary" onClick={onResume}>
            Resume game
          </button>
        </section>
      )}

      <form className="card" onSubmit={start}>
        <h2>{saved ? 'Or start a new game' : 'Who is playing?'}</h2>
        <ul className="rows">
          {rows.map((row, i) => (
            <li key={i}>
              <button
                type="button"
                className="swatch"
                style={{ background: row.color }}
                onClick={() => nextColor(i)}
                aria-label={`Player ${i + 1} colour: ${colorName(row.color)}. Tap to change`}
              />
              <input
                type="text"
                value={row.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder={`Player ${i + 1}`}
                aria-label={`Player ${i + 1} name`}
                maxLength={12}
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="done"
              />
              {rows.length > MIN && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  aria-label={`Remove player ${i + 1}`}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
        {rows.length < MAX && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => setRows([...rows, { name: '', color: TOKEN_COLORS.find((c) => !taken.includes(c.hex)).hex }])}
          >
            Add player
          </button>
        )}
        {children}
        <button type="submit" className="btn primary">
          Start game
        </button>
      </form>
    </main>
  )
}
