# Eight Track Trivia

A pass-and-play trivia board game for 2–6 players on one iPhone. It is a React
Progressive Web App: host it on GitHub Pages, add it to the home screen from
Safari, and it runs full screen and fully offline.

## How to play

- Everyone starts at the crossing in the middle of the figure-eight track.
- Tap the die, then tap one of the glowing squares. You must move the exact
  number rolled, in any direction, without doubling back.
- **Category square** (round): answer a question from that category.
- **Gem square** (diamond): answer correctly to win that category's gem.
- **Roll again square** (dashed): roll again.
- **The crossing** (star): choose any category yourself.
- A correct answer means you roll again. A wrong answer passes the phone on.
- Questions are self-judged: read it out, tap **Reveal answer**, then the group
  taps **Correct** or **Wrong**.
- Once you hold all six gems, land exactly on the crossing. The other players
  choose the category of your final question. Answer it correctly to win.

Settings (the ⚙ button): **Quick game** (any 3 gems instead of 6), **Sound**,
and **New game**.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In the repository go to **Settings → Pages → Source** and choose
   **GitHub Actions**.
3. Open `vite.config.js` and set `BASE` to your repository name, with a slash
   on both sides:

   ```js
   const BASE = '/trivialpursuit/'
   ```

   This one constant sets Vite's `base` and the PWA manifest's `id`,
   `start_url` and `scope`. If it does not match the repository name the page
   loads blank.
4. Push to `main`. The workflow in `.github/workflows/deploy.yml` runs
   `npm ci`, `npm test` and `npm run build`, then publishes `dist/`.
5. The site appears at `https://<your-username>.github.io/<repo>/`.

## Local development

```sh
npm install
npm run dev      # dev server (the URL includes the base path)
npm test         # rules tests, using Node's built-in test runner
npm run build    # production build into dist/
npm run preview  # serve the production build, including the service worker
```

Node 22 or later. The service worker is only active in the production build
(`npm run build` then `npm run preview`), not in `npm run dev`.

## Install on an iPhone

1. Open the site in **Safari** (other iOS browsers may not offer the option).
2. Tap the **Share** button, then **Add to Home Screen**.
3. Launch it from the home screen icon. It opens full screen, and after that
   first load it works with no connection.

The app shows a reminder to do this whenever it is opened in a browser tab,
and hides it once it is running from the home screen.

## Adding questions

All questions live in `src/data/questions.json`. Add an entry, commit, and
push; nothing else needs to change.

```json
{ "id": "science-130", "category": "science", "question": "…", "answer": "…", "difficulty": "medium" }
```

- `id` must be unique. Any string works; the existing ones are
  `<category>-<number>`.
- `category` is one of `places`, `screen`, `history`, `books`, `science`,
  `sport`.
- `difficulty` is `easy`, `medium` or `hard`. It is shown on the question card
  and does not affect play.

`npm test` checks the file (unique ids, known categories, required fields, at
least 100 per category) and runs on every deploy, so a mistake stops the
deploy rather than breaking the game.

Within a game, a question is not asked twice until every question in its
category has been used.

## How updates reach installed copies

The service worker keeps a complete copy of the app on the phone. When you
push a change:

1. GitHub Actions builds and publishes the new version.
2. The next time an installed copy is opened **with a connection**, it
   downloads the new version in the background.
3. A banner appears: **Update available — tap to reload**. Nothing changes
   until it is tapped, so a game in progress is never interrupted.
4. The saved game survives the reload. The exception is a release that bumps
   `SAVE_VERSION` in `src/game/reducer.js` (needed when the board or the saved
   data changes shape): older saves are then discarded.

iOS checks for a new version when the app is opened or reloaded, so it can
take one extra launch before the banner appears.

## Project layout

```
src/game/board.js        the board as a graph: nodes and adjacency
src/game/reducer.js      all the rules, as a pure reducer
src/data/questions.json  the questions
src/components/          Board, Die and GemBadge (SVG), Setup, Modals
src/App.jsx              wires the reducer to the screen, saving and banners
src/storage.js           localStorage, guarded
src/sound.js             sound effects (Web Audio, no audio files)
test/game.test.js        rules tests
public/                  icons
```

## Known limitations

- **Self-judged answers.** There is no answer checking; the group decides.
- **One device only.** No online or multi-device play.
- **Sound follows the iPhone's silent switch.** With the phone on silent,
  there is no sound.
- **Portrait only.** iOS ignores the manifest's orientation lock, so turning
  the phone sideways rotates the app; the layout is designed for portrait.
- **Storage can be cleared by iOS.** The saved game is in the browser's local
  storage. iOS may clear it if the app goes unused for several weeks, and a
  copy opened in a Safari tab does not share its save with the home-screen
  copy.
- **No undo.** A mistaken tap on Correct or Wrong cannot be reversed.
- **Changing Quick game mid-game** takes effect immediately for everyone.
- **Question facts are fixed at the time of writing.** They avoid records and
  "current" facts, but check anything that looks out of date.
