# Wordle (Astro)

A Wordle clone built with [Astro](https://astro.build). Guess a 5-letter word in
6 tries. Tiles turn green (correct spot), yellow (wrong spot), or gray (absent).

## Features

- 6 guesses, 5 letters, on-screen + physical keyboard input
- Correct duplicate-letter scoring (two-pass green/yellow algorithm)
- Flip reveal and shake animations
- Win/lose messages and answer reveal
- Stats saved to `localStorage` (played, win %, current/max streak, guess distribution)
- Emoji share grid copied to the clipboard
- Large valid-guess dictionary (~21.8k words) plus a curated answer list

## Project structure

```text
/
├── public/
│   └── valid-words.json     # allowed guesses
├── src/
│   ├── data/answers.ts      # curated answer word list
│   ├── scripts/game.ts      # game logic (bundled client script)
│   └── pages/index.astro    # markup, styles, entry point
└── package.json
```

## Commands

| Command           | Action                                     |
| :---------------- | :----------------------------------------- |
| `bun install`     | Install dependencies                       |
| `bun dev`         | Start dev server at `localhost:4321`       |
| `bun build`       | Build production site to `./dist/`         |
| `bun preview`     | Preview the build locally                  |
| `bun run check`   | Type-check Astro + TypeScript files        |

## Customizing words

- Add or replace answers in `src/data/answers.ts` (must be 5 lowercase letters).
- Regenerate the guess dictionary from a system word list, e.g.:

  ```sh
  node -e 'const fs=require("fs");const w=fs.readFileSync("/usr/share/dict/words","utf8").split("\n").filter(x=>/^[a-z]{5}$/i.test(x)).map(x=>x.toLowerCase());fs.writeFileSync("public/valid-words.json",JSON.stringify([...new Set(w)].sort()))'
  ```
