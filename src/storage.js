// localStorage can throw (private browsing, storage full), so every call is guarded.
const KEYS = { game: 'eighttrack.game', settings: 'eighttrack.settings', hint: 'eighttrack.hintDismissed' }

export function load(name) {
  try {
    return JSON.parse(localStorage.getItem(KEYS[name]))
  } catch {
    return null
  }
}

// Passing null removes the entry.
export function save(name, value) {
  try {
    if (value == null) localStorage.removeItem(KEYS[name])
    else localStorage.setItem(KEYS[name], JSON.stringify(value))
  } catch {
    // Nothing useful to do: the game still works, it just will not resume.
  }
}
