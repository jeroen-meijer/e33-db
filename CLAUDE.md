# e33-db

Fast, searchable web database for Clair Obscur: Expedition 33 content (weapons, pictos, status effects, items), powered by JSON generated from the sibling scraper project.

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 + shadcn/ui (radix-lyra preset)
- TanStack Query for data loading/caching
- Zod for runtime schema validation
- GitHub Pages deployment via GitHub Actions

## Key Paths

- `src/App.tsx` — main search/filter/detail UI
- `src/db-types.ts` — local Zod schema + TS types for DB payload
- `src/index.css` — theme variables and font setup
- `public/data/database.json` — frontend runtime DB payload
- `.github/workflows/deploy-pages.yml` — Pages pipeline (`main` -> `pages`)
- `../e33-db-scraper/` — sibling scraper project that produces JSON artifacts

## Common Commands

```bash
# from this repo
npm install
npm run dev
npm run lint
npm run build
npm run preview

# refresh data from scraper (run in sibling repo)
cd ../e33-db-scraper
npm install
npm run typecheck
npm run scrape
cp output/*.json ../e33-db/public/data/
```

## Workflow Rules

- For code changes, run `npm run lint` and `npm run build` before pushing.
- For scraper/schema changes, run `npm run typecheck` in `e33-db-scraper` before regenerating JSON.
- When DB shape changes, update both:
  - scraper schema (`e33-db-scraper/src/types.ts`)
  - frontend schema (`src/db-types.ts`)
- Keep user-facing behavior verified in browser after substantial UI changes.

## Git Conventions

Follow conventional commits:

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `refactor: ...`
- `chore: ...`
- `ci: ...`

Optional scopes are encouraged when useful (e.g. `feat(search): ...`, `fix(ui): ...`).

## Project-Specific Guardrails

- IMPORTANT: Do not import runtime types from `../e33-db-scraper/src/...` in the frontend app.
  - GitHub Actions for this repo builds in isolation and that path will fail in CI.
  - Use `src/db-types.ts` in this repo for runtime parsing/types.
- IMPORTANT: DB fetches MUST use `import.meta.env.BASE_URL` for GitHub Pages compatibility.
  - Example: ``fetch(`${import.meta.env.BASE_URL}data/database.json`)``
- Keep mobile UX simple: avoid nested scroll containers inside already scrollable pages.
- Preserve Lyra theme defaults unless explicitly requested otherwise.

## Deployment Notes

- GitHub Actions deploys static output from `dist` to `pages` branch.
- Vite base path is driven by `VITE_BASE_PATH` in CI.
- Live site: `https://jeroen-meijer.github.io/e33-db/`

## What Not To Add Here

- No secrets, API keys, or private tokens.
- Avoid large docs/tutorial content; keep this file concise and operational.
- Prefer linking to source files/workflows over duplicating implementation details.
