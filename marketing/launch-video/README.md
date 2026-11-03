# AgentTM launch video

An editable 30-second, 1920×1080, 30 fps promo: record a managed Codex run,
inspect its captured changes, and restore a checkpoint into an isolated worktree.
Created using [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)
and Remotion. Creative direction and storyboard: [DESIGN.md](DESIGN.md).

The film uses real production dashboard captures of a fictional cart project.
A real Codex run corrected its subtotal calculation and added a regression test.
The baseline was actually restored; original file, index and HEAD hashes were
checked afterward. [Capture evidence](capture-report.json) records the session
and integrity results. Screenshots are editorially framed/animated; this is a
promo, not an uncut screen recording or a claim of atomic/causal checkpoints.
See [validation and limitations](QA.md) for the actual checks performed.

## Watch and edit locally

Generated exports live in `out/` (excluded from Git):

- `AgentTM-launch-30s.mp4` — background music plus transition sounds; no voiceover.
- `AgentTM-launch-30s-with-music.mp4` — explicitly named copy of the updated master.
- `AgentTM-launch-30s-vscode-preview.mp4` — H.264 with MP3 audio for VS Code preview.
- `AgentTM-launch-30s-sfx-only.mp4` — preserved first cut with transition sounds only.
- `AgentTM-launch-30s-silent.mp4` — the same video without audio.
- `AgentTM-launch-source.zip` — source, captured assets, and license records.

The delivered silent export copies the master's encoded video stream exactly;
the render:silent command below can regenerate it from the same composition.

**Playback:** use the normal master in Windows Media Player or a browser. VS Code
webviews do not support AAC audio, so use the `vscode-preview` copy there. See
[VS Code's supported media formats](https://code.visualstudio.com/api/extension-guides/webview#supported-media-formats).

Open PowerShell in this folder. Install the pinned video-only dependencies:

```powershell
npm.cmd ci
```

For music-enabled rendering, download the track from the official source linked
in [music credits](public/audio/music/CREDITS.md), saving it as
`public/audio/music/cat-walk.mp3`. The source ZIP excludes standalone stock music.
Prepare its normalized/faded excerpt using a full FFmpeg installation on PATH:

```powershell
node scripts/add-music.mjs ffmpeg --prepare-only
```

Then start the editable Remotion Studio preview:

```powershell
npm.cmd run dev
```

Render the MP4:

```powershell
npm.cmd run render
```

Render the silent version from the same timeline:

```powershell
npm.cmd run render:silent
```

To render without downloading background music, use `npm.cmd run render:sfx-only`.

Remotion downloads its Windows rendering browser on first use. If you already
have its Headless Shell, pass `--browser-executable=PATH` to the underlying
`npx.cmd remotion` command. Render dependencies are separate from AgentTM's app.
The upstream Workbench launcher failed a Windows symbolic-link permission check;
Remotion Studio is the tested editing path. A workbench manifest is supplied,
but visual Workbench editing/parity is not claimed as validated on Windows.

## Recreate captures

The included PNGs allow rendering without Codex, Git history or a model request.
To create a new real recording, first build `bin/agenttm.exe`, then run this
explicitly from the AgentTM repository root:

```powershell
.\marketing\launch-video\scripts\prepare-demo.ps1 -Record
```

This needs authenticated Codex with access to the model specified in the script.
It creates a new disposable project under `.test-work`, never edits an existing
project, and writes the machine-local location to ignored `demo-location.txt`.

Then capture the real UI and execute a demo restore:

```powershell
node marketing/launch-video/scripts/capture.mjs
```

Capture needs the repository's existing Playwright dependencies and Chrome.
Re-running capture creates another isolated demo worktree. Existing worktrees
and recordings are preserved. `public/layout.json` contains source coordinates.

## Audio and licensing

The two transition sounds are CC0 Freesound MP3 previews. Their exact source
pages, authors, licenses, hashes and measurements are retained in
[audio credits](public/audio/sfx/FREESOUND-CREDITS.md) and
[audio manifest](public/audio/sfx/audio-manifest.json). No recording of listening
tests is claimed; technical peak/decode checks are reported separately.
Composition applies per-cue gain and fades without modifying source files.
Background music is **Cat Walk by Arulo**, under the separate Mixkit Stock Music
Free License; see [music source and license](public/audio/music/CREDITS.md).
The completed video incorporates the music. Standalone stock music and its
prepared bed are deliberately excluded from Git and the editable source ZIP.
`add-music.mjs` updates an existing SFX-only master while copying its video stream;
this avoids re-rendering the reviewed visual edit. Audio preparation requires
full FFmpeg because Remotion's bundled executable lacks some analysis formats.

PageCam is adapted under Apache-2.0; retain [notices](THIRD_PARTY_NOTICES.txt)
and [its license](SHOTCRAFT-LICENSE.txt). Remotion has its own license.
Original AgentTM content remains subject to the included [AgentTM license](AGENTTM-LICENSE.txt)
and [ownership notice](AGENTTM-NOTICE.txt).
No video has been uploaded or published by these scripts.
