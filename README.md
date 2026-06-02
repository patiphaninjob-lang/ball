# TikTok Training Collector

Small local helper for collecting visible TikTok video links from a creator profile, then enriching each video with TikTok oEmbed metadata when available.

It does not download videos, bypass login, bypass captcha, or call TikTok internal endpoints. If TikTok asks for login or verification, handle that manually in the browser window.

The project also includes a mobile-friendly static training planner in `docs/`.

## Setup

```powershell
npm.cmd install
```

## Collect `@powerpump45`

```powershell
npm.cmd run collect:tiktok
```

The browser will open. If TikTok asks, log in manually, then wait. The script scrolls the profile page and saves:

- `data/powerpump45-videos.json`
- `data/powerpump45-videos.csv`

## Options

```powershell
npm.cmd run collect:tiktok -- --url https://www.tiktok.com/@powerpump45 --scrolls 80 --wait 2000
```

- `--url`: TikTok profile URL
- `--scrolls`: how many times to scroll
- `--wait`: delay between scrolls in milliseconds
- `--enrich false`: skip TikTok oEmbed enrichment

After the JSON/CSV exists, use it as the seed for the trading practice planner website.

## Build the planner website

```powershell
npm.cmd run build
npm.cmd run serve
```

Open:

```text
http://localhost:4173
```

The static site lives in `docs/` and is ready for GitHub Pages.

## Make GIF previews from local videos

Put video files you are allowed to use in `videos/`, then run:

```powershell
npm.cmd run make:gifs
```

Output:

- GIFs in `data/gifs/`
- `data/gifs/manifest.json`

Options:

```powershell
npm.cmd run make:gifs -- --input videos --output data/gifs --start 0 --duration 4 --fps 12 --width 360
```

The script converts local video files only. It does not download TikTok videos.

## GitHub Pages

This repo includes `.github/workflows/pages.yml`. After pushing to GitHub:

1. Open the GitHub repository.
2. Go to `Settings` -> `Pages`.
3. Set `Source` to `GitHub Actions`.
4. Push to `main` or run the workflow manually.

The workflow builds `docs/data/training-drills.json` from `data/powerpump45-videos.json` and publishes `docs/`.
