# AgentTM marketing website

An isolated, frontend-only React + TypeScript + Vite website. It does not change
the Go CLI, Wails desktop app, recorder, or user history. No backend, accounts,
tracking, external font requests, or runtime API calls are required.

## Local development

The homepage is `index.html`; the separate documentation entry is `docs.html`.
The homepage's Docs links open it. Desktop and CLI have separate guides, with
platform-specific installation steps and one copyable command per step.
On mobile, the header menu opens a modal guide sidebar; close it with the close
button, Escape, the backdrop, or by choosing a guide. Desktop keeps a persistent
sidebar. Native dialog behavior traps keyboard focus while the mobile menu is open.

Documentation links use fragments such as `docs.html#desktop-install` and
`docs.html#cli-install`. Publish **both HTML files and the assets directory**
from `dist`; no server route rewrites are necessary. The build uses relative
asset paths for hosting at a subdirectory. macOS/Linux installation commands
appear only after users choose an OS and enter their actual archive filename.

Use Node.js 20.19+ or 22.12+ and npm for website development. These are development
requirements, not requirements for users of prebuilt AgentTM binaries.

From this directory, install dependencies:

```sh
npm ci
```

Start the development server:

```sh
npm run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`).

## Checks and build

```sh
npm run lint
npm run typecheck
npm run build
```

Preview the production build:

```sh
npm run preview
```

Browser tests run against the production build:

```sh
npx playwright install chromium
npm test
```

If a compatible browser is already installed, set `AGENTTM_BROWSER_PATH` to its
executable before running tests instead of downloading another copy. Tests cover
375, 768, 1024, and 1440px viewports, tabs, navigation, clipboard, video metadata,
and reduced motion. Documentation checks cover guide deep links, platform
selection, filename validation, mobile sidebar dismissal, guide selection,
focus handling, scroll locking, and desktop resizing. Outputs are ignored by Git.

## Visual design and motion

The November 2026 refinement takes inspiration from the pacing, ambient lighting,
framed product previews, and interactive feature layouts on
[Verdent](https://www.verdent.ai/). Its brand assets, screenshots, copy, and source
were not copied. AgentTM's screenshots and original code/CSS diagrams remain local.

The palette now follows the actual product: neutral charcoal surfaces, restrained
olive accents, and softer ambient lighting. Layouts, grids, gradients, and motion
behavior are retained; screenshots are not recolored to match the site.

- The hero uses an original SVG contour field, a moving light trace, a fine grid,
  and short entrance transitions. The feature grid combines schematic diagrams
  with pointer highlights and hover feedback. Schematics are explicitly labeled
  and do not report live measurements or actual recording output.
- **Pause animations** in the navigation stops decorative motion and the automatic
  walkthrough. The system's reduced-motion setting disables both automatically
  and keeps all content visible. Ambient/diagram scenes pause offscreen.
- The screenshot walkthrough starts automatically and advances every 3 seconds
  while in view and active. Pause/Play remains available. Hovering the capture, focusing the feature tabs or
  preview, enlarging an image, or hiding the browser tab pauses progression. Choosing a
  feature manually stops automatic progression; the walkthrough has its own
  Play/Pause control. User selection never moves keyboard focus automatically.
  Screens crossfade over 550ms in a stable frame, with images preloaded when the
  section enters view. Inactive panels are inert and hidden from assistive
  technology. Reduced motion and the global pause control disable the transition.
- Section entrances use IntersectionObserver. All navigation and scrolling stay
  native; there is no scroll interception, animation library, or extra dependency.
- [src/Motion.tsx](src/Motion.tsx) contains the motion preference, visibility
  observers, and diagrams. [src/premium.css](src/premium.css) defines the new visual
  layer and animations after the foundational responsive styles.

Browser checks also verify the global pause control, system reduced motion, and
automatic/manual walkthrough interaction.

The product walkthrough uses a slim feature rail alongside focused, genuine UI
captures. All three current workspace screenshots fill their existing preview
frames edge to edge with proportional `object-fit: cover` cropping, without
stretching or adding side bars.
Enlarge opens each complete source detail in a keyboard-accessible dialog, with
a link to its original resolution. The download destination uses native radio controls for platform choice,
an explicit desktop/CLI choice, and a prominent GitHub Releases CTA. macOS and
Linux select CLI mode and disable the Windows-only desktop option. A three-step
installation summary precedes the detailed reference; the reference opens to the
matching desktop or CLI topic. It does not download or run an installer silently.

## Static deployment

Build command: `npm ci && npm run build`, working directory: `website`, output:
`website/dist`. Deploy the contents of `dist` to any static host. No Node server,
SPA rewrite, environment secret, or API service is required. Vite's relative base
supports subdirectory hosting. Local builds do not publish anything.

The hosting domain has not been selected. Before public deployment:

1. Set the canonical URL and `og:url` in [index.html](index.html) to the real HTTPS URL.
2. Replace the Open Graph/Twitter image URLs there with your hosted absolute
   `images/video-poster.png` URL. The current fallback is AgentTM's original
   publicly available repository artwork, not third-party imagery.
3. Add a sitemap with that real domain and reference it from a robots.txt file.
   Neither is generated with an invented hostname.
4. Check release notes/assets before promoting a new release. Downloads deliberately
   go to the version-independent official latest-release page; this website does
   not assume that every release contains every platform asset.

## Content and assets

- [src/content.ts](src/content.ts): product copy, official destinations, platform
  installation guides, showcase states, and separate CLI commands.
- [src/App.tsx](src/App.tsx): semantic sections, keyboard-operable tabs, mobile
  navigation, copy feedback, and a native video dialog. Video loads on demand and
  never autoplays. There are no fake downloads or application actions in the UI.
- [src/styles.css](src/styles.css): local font stacks, muted charcoal/olive design
  tokens, ambient lighting, responsive layout, and reduced motion.
- `public/images/history.png` (hero), `history-detail.png`, `explorer-detail.png`,
  and `workspaces-detail.png` (walkthrough): current production React UI captures
  from the existing disposable recorded cart-fix demo. These include the updated
  sidebar, visual History, focused Checkpoint Explorer, and compact workspace list.
  [Capture provenance](public/images/capture-manifest.json) records dimensions and
  confirms the original project files, Git index, and HEAD remained unchanged.
  These are static source-build screenshots, not a live dashboard or a claim that
  every published binary already includes the design. Reference-brand screenshots
  are not used as site assets.
- [src/comparison.css](src/comparison.css) styles the responsive Git comparison.
  Its rows in `src/content.ts` distinguish Git's built-in tools from managed Codex
  recording, without claiming causal attribution or checkpoint-based chat rewind.
- `public/images/video-poster.png`: original AgentTM launch artwork.
- `public/media/agenttm-demo.mp4`: copy of the real 30-second promo with music and
  effects from [the repository video](../docs/videos/agenttm-demo.mp4).
  Its [credits and music terms](../docs/videos/CREDITS.md) still apply.
  The player labels its earlier interface explicitly; the screenshots show the
  current design. This pass does not regenerate the launch video.
- [public/favicon.svg](public/favicon.svg): AgentTM history icon, rendered locally.

To recapture the current UI, build the root CLI with the latest embedded frontend,
then run `node scripts/capture-desktop.mjs` from this directory. The script accepts
only the existing disposable film demo recorded in `marketing/launch-video`, starts
an owned local server, reads existing recordings, and closes it after capture. It
does not record a new Codex task or restore a new worktree. It exports a 3200×2000
hero and focused workspaces at 2740×1854, and verifies the original files, index,
and HEAD stay unchanged. Update the dimensions in `src/content.ts` if capture
settings change. Preserve the distinction between real captures and illustrations.

Product claims were checked against the local README, installation guides,
checkpoint documentation, and storage implementation. GitHub's public release
metadata confirmed v0.3.4 and its Windows desktop asset on 2026-11-04. This is
metadata verification, not a new platform installation audit.

Original website code follows the repository's [proprietary license](../LICENSE).
React, Vite, and other dependencies retain their own licenses. The site does not
describe AgentTM as open source.
