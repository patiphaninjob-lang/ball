# Claude Code Instructions for Ball Project

## Before Starting Work

1. **Read in order:**
   - `PROJECT_MEMORY_POLICY.md`
   - `PROJECT_CONTEXT.md` (latest truth)
   - `HANDOFF.md` (if context was recently cleared)

2. **Treat them as current truth.** Ignore old history unless explicitly asked.

3. **Continue from the next recommended step** in `PROJECT_CONTEXT.md`.

## Working on This Project

### File Locations
- **Scripts:** `scripts/` (Node.js, .mjs)
- **Data:** `data/` (JSON, CSV, GIFs)
- **Web App:** `docs/` (static site for GitHub Pages)
- **Local Videos:** `videos/` (for GIF conversion)

### Common Commands

```powershell
npm install                          # Setup dependencies
npm run collect:tiktok               # Scrape TikTok @powerpump45
npm run build                        # Build planner data
npm run serve                        # Test locally at http://localhost:4173
npm run make:gifs                    # Create GIFs from videos/
npm run make:pwa-icons               # Generate PWA icons
npm run check                        # Check all scripts for syntax errors
```

### What This Project Does

- **Collects** TikTok video metadata from @powerpump45 without downloading videos
- **Transforms** metadata into a 5-level training progression planner
- **Publishes** as a mobile-friendly PWA installable on Android/iOS
- **Serves** via GitHub Pages with automatic CI/CD via `.github/workflows/pages.yml`

### Key Constraints

- ✅ Respects TikTok Terms of Service (no auto-downloads, no internal endpoint abuse)
- ✅ Manual login handling required if TikTok requests authentication
- ✅ Video processing is local only
- ✅ Static site deployable via GitHub Pages

## Updating Memory

### Before a Long Session Ends

Update `HANDOFF.md` with:
- Current objective (what were you trying to do?)
- Latest truth (what changed?)
- Files changed
- Tests/commands run
- Current result
- Open risks
- Next recommended step

### To Compact Context

Use `/compact` when chat grows very long. Only the latest truth stays in files.

### To Clear Chat History

Use `/clear`. Memory files preserve all operational truth for the next session.

## Questions or Changes?

If you need to update this system, check `PROJECT_MEMORY_POLICY.md` for the rules, then update `PROJECT_CONTEXT.md` with any new truth.
