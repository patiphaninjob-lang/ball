# Ball Project Context

**Date Updated:** 2026-06-06

## Project Overview

**Name:** Ball (TikTok Training Collector)

**Purpose:** Mobile-friendly training planner web app built from TikTok creator @powerpump45 video metadata. PWA installable on Android/iOS.

**Language:** JavaScript (100%)

**Tech Stack:**
- Playwright (browser automation for TikTok scraping)
- FFmpeg (video to GIF conversion)
- Node.js
- Static site served via GitHub Pages

## Current Status

- ✅ Repository cloned and accessible
- ✅ 92 exercise GIFs extracted and optimized (62% size reduction)
- ✅ Training planner with 5 difficulty levels - LIVE
- ✅ PWA configured for mobile installation
- ✅ TikTok links removed - app uses only local GIFs
- ✅ GIFs auto-play without click needed
- ✅ App deployed to GitHub Pages
- **Last update:** 2026-06-06 - Production deployment complete

## Key Files & Directories

```
ball/
├── scripts/               # Node.js automation scripts
│   ├── collect-tiktok.mjs    # Scrape @powerpump45 profile
│   ├── build-site-data.mjs   # Transform JSON to planner format
│   ├── make-gifs.mjs         # Create GIF previews from videos
│   ├── make-pwa-icons.mjs    # Generate PWA icons
│   └── serve-docs.mjs        # Local test server
├── data/                 # Collected data & exports
│   ├── powerpump45-videos.json
│   ├── powerpump45-videos.csv
│   └── gifs/             # Generated GIF previews
├── docs/                 # Static site for GitHub Pages (publishing root)
└── videos/               # Local video files for GIF conversion
```

## Core Commands

```powershell
npm install                        # Setup
npm run collect:tiktok             # Scrape TikTok profile
npm run build                      # Process data → planner format
npm run serve                      # Test at http://localhost:4173
npm run make:gifs                  # Create GIF previews from videos/
npm run make:pwa-icons             # Generate PWA icons
npm run check                      # Syntax check all scripts
```

## Architecture

**Data Flow:**
1. **Collect** - Playwright scrapes TikTok @powerpump45 → `data/powerpump45-videos.json`
2. **Enrich** - TikTok oEmbed metadata auto-added (optional)
3. **Build** - Transform to 5-level training structure → `docs/data/training-drills.json`
4. **Deploy** - GitHub Actions publishes `docs/` to GitHub Pages
5. **Install** - Users open GitHub Pages URL, install PWA on phone

**Training Levels:**
- Level 1: Reset, mobility, rehab control
- Level 2: Body control and core basics
- Level 3: Strength base and football basics
- Level 4: Speed, braking, agility
- Level 5: Power transfer and complex field actions

**UI Features:**
- Today view: Sunday-only planner for 2-3 hour solo session
- Full library: All drills with click-to-preview GIFs (not auto-loaded)
- Solo-only filter: Hide partner-assisted drills
- PWA: Install on Android/Chrome or iPhone/Safari

## Known Constraints & Rules

- No automatic video downloads (respects TikTok ToS)
- Manual login handling required if TikTok requests authentication
- All video processing is local only
- Static site deployable via GitHub Pages (requires `Settings → Pages → Source: GitHub Actions`)

## Next Recommended Steps

1. ✅ Initialize project memory system (DONE)
2. ⏳ Verify all npm scripts run correctly
3. ⏳ Test TikTok collection workflow
4. ⏳ Check deployment pipeline
5. ⏳ Document any outstanding issues or roadmap

## Open Questions & Risks

- None identified yet; awaiting first use case
