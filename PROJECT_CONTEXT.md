# Ball Project Context

**Date Updated:** 2026-06-07

## Project Overview

**Name:** Ball (TikTok Training Collector)

**Purpose:** Mobile-friendly exercise library web app built from TikTok creator @powerpump45 video metadata. PWA installable on Android/iOS with 5-level training progression.

**Language:** JavaScript (100%)

**Tech Stack:**
- Playwright (browser automation for TikTok scraping)
- FFmpeg (video to GIF conversion)
- Node.js
- Static site served via GitHub Pages

## Current Status

- ✅ 270 exercises extracted from 164 TikTok videos
- ✅ All exercises converted to auto-playing GIFs (608MB total)
- ✅ Training progression organized into 5 levels
- ✅ Category filters (9 types) + Level filters
- ✅ PWA configured for mobile installation
- ✅ App deployed to GitHub Pages
- **Last update:** 2026-06-07 - Training progression implemented

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

**Training Progression (5 Levels):**
- Level 1: Recovery & Mobility (33) - Rehab control, pain-free movement
- Level 2: Core & Body Control (83) - Stability foundation, body awareness
- Level 3: Strength & Skill (43) - Strength base, football basics
- Level 4: Agility & Speed (38) - Directional change, deceleration control
- Level 5: Power & Complex (73) - Explosive movements, advanced field actions

**UI Features:**
- Exercise library: All 270 exercises with auto-playing GIFs
- Filters: Category (9 types) + Level (1-5)
- Search: By drill name, category, or hashtags
- Mobile: Fully responsive, PWA installable on Android/iOS

## Known Constraints & Rules

- No automatic video downloads (respects TikTok ToS)
- Manual login handling required if TikTok requests authentication
- All video processing is local only
- Static site deployable via GitHub Pages (requires `Settings → Pages → Source: GitHub Actions`)

## Next Recommended Steps

1. ✅ Initialize project memory system (DONE)
2. ✅ Extract 270 exercises and convert to GIFs (DONE)
3. ✅ Fix GIF rendering on app load (DONE)
4. ✅ Organize exercises into 5-level progression (DONE)
5. ⏳ Test on mobile devices (Android/iOS)
6. ⏳ Gather user feedback on category organization
7. ⏳ Consider adding saved favorites or custom programs

## Open Questions & Risks

- General category (72 exercises) partially reorganized; some may still need refinement
- GIF file size (608MB) - consider optimization if mobile data is concern
- Level filter UX - users understand the progression system?
