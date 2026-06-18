# Repository Guidelines

## Project Structure & Module Organization

This repository builds a static Powerpump45 training planner served from `docs/`. Runtime files live in `docs/index.html`, `docs/app.js`, `docs/styles.css`, `docs/sw.js`, and generated data under `docs/data/`. Exercise GIFs used by the live app are in `docs/exercises/`. Source and analysis data live in `data/` and `exercise-analysis/`, while automation scripts live in `scripts/`.

## Build, Test, and Development Commands

- `npm install` installs Node dependencies, including `ffmpeg-static` and Playwright.
- `npm run serve` serves the static app locally from `docs/`.
- `npm run build` regenerates planner data from `data/powerpump45-videos.json`.
- `npm run merge:clips` links extracted exercise clips into `docs/data/exercise-library.json`.
- `npm run check` runs syntax checks for key scripts and the service worker.

Use extraction commands only when source videos and analysis files are present locally: `npm run analyze:exercises`, `npm run extract:all`, `npm run trim:intros`, and `npm run convert:gifs`.

## Coding Style & Naming Conventions

The codebase uses ESM JavaScript with two-space indentation and semicolons. Keep scripts focused and procedural unless a shared helper already exists. Use kebab-case for script filenames, camelCase for JavaScript variables/functions, and stable JSON keys because the static app reads them directly.

## Testing Guidelines

There is no formal unit test suite yet. Before committing, run `npm run check` and smoke-test the app with `npm run serve`, especially on a mobile viewport. For GIF or exercise-library changes, verify that `docs/data/exercise-library.json` loads and that at least one exercise opens in the fullscreen viewer.

## Commit & Pull Request Guidelines

Git history uses concise conventional-style prefixes such as `feat:`, `fix:`, `docs:`, `chore:`, `refine:`, and `cleanup:`. Keep commits scoped to one behavior or data update. Pull requests should include a short description, the validation commands run, and screenshots or screen recordings for visible mobile UI changes.

## Security & Configuration Tips

Do not commit raw downloaded videos, browser profiles, logs, or local cache files. Keep large generated assets intentional: live GIFs belong in `docs/exercises/`, while local source videos should remain outside version control.
