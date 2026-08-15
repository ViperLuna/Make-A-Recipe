# Make A Recipe

A free-to-play recipe gacha game: pull a lever for random ingredients, cook them on stoves for
sell-able dishes with deterministic names, chase rare mutations, and rebirth for permanent
multipliers.

## Stack

- React + Vite, deployed as a static site to GitHub Pages via GitHub Actions
- No backend — save data lives in the browser (IndexedDB)
- Game balance data lives in `public/data/*.json`, loaded at runtime, so tuning numbers doesn't
  require a code change

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
```
