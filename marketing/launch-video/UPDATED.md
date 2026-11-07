# Updated AgentTM product film

A 40-second, 1920×1080, 60-fps product tour of the current interface. Large UI
views, smooth cursor paths, click pulses, camera pans/zooms, and overlapping
transitions replace the original side-by-side text/product layout.

The production UI was captured at 3200×1600 from a real, previously recorded
Codex session in the disposable shopping-cart project. The footage is an edited
tour assembled from authentic UI captures, with an animated cursor and camera.
Actions and longer waits are condensed; this is not an uncut screen recording.

## Story

| Time        | View                                                           |
| ----------- | -------------------------------------------------------------- |
| 0–3 s       | AgentTM and the problem: know what happened                    |
| 3–6.5 s     | Overview, then select History                                  |
| 6.5–13.2 s  | Recorded activity, checkpoint filter, inspect a captured state |
| 13.2–16.8 s | Historical Files view                                          |
| 16.8–24.5 s | Changes and a split comparison with the parent checkpoint      |
| 24.5–29 s   | Review and confirm a separate restoration destination          |
| 29–36 s     | Verified restore result and restored-workspace management      |
| 36–40 s     | Brand and repository/download destination                      |

The displayed restoration actually ran inside the disposable repository.
Captured file content was compared with the restored file. Original source,
test file, index and HEAD hashes remained unchanged. The captures do not imply
atomic snapshots, exact causal attribution, or conversation rewinding.

## Outputs

Find exports in `out/updated/`:

- `AgentTM-product-40s.mp4`: H.264/AAC master for browsers and publishing.
- `AgentTM-product-40s-vscode.mp4`: identical video with MP3 audio for VS Code.
- `AgentTM-product-40s-silent.mp4`: identical video without audio.
- `AgentTM-product-poster.png`: closing frame.
- `contact-sheet.png`: representative frames for review.
- `verification.json`, `motion-verification.json`, `SHA256SUMS`: validation.

The original 30-second exports remain in `out/`.

## Rebuild

Use the pinned dependencies from this video folder. No application dependencies
or release publishing workflow is changed.

```powershell
npm ci
npm run check
node scripts/check-updated-motion.cjs
npm run render:updated
```

The render command uses Remotion's browser discovery; pass
`--browser-executable=YOUR_CHROME_PATH` directly to Remotion when needed.
The original licensed music must be obtained as described in
[music credits](public/audio/music/CREDITS.md). Prepare the updated bed with a
full FFmpeg build supporting `loudnorm` and `afade`:

```powershell
node scripts/prepare-updated-audio.mjs YOUR_FFMPEG_PATH
```

Remotion's bundled FFmpeg omits some processing filters; use a full build for
audio preparation and verification. The click sound is generated locally by
that script. Existing CC0 transition sounds and their credits remain unchanged.
Standalone stock music is excluded from the editable source ZIP.

After rendering:

```powershell
node scripts/normalize-updated.mjs YOUR_FFMPEG_PATH YOUR_FFPROBE_PATH
node scripts/verify-updated.mjs YOUR_FFMPEG_PATH YOUR_FFPROBE_PATH
```

Normalization converts Remotion's full-range JPEG-derived color format into a
standard BT.709/yuv420p publication master. The original render is preserved.

To recapture the UI, run `node scripts/capture-updated.mjs` from this folder.
It accepts only the existing disposable film repository and creates a new
isolated worktree. `AGENTTM_VIDEO_BINARY` can select a newly built CLI containing
the current production dashboard. It does not start a new model request.

The motion check verifies all eight click targets and cursor visibility through
the camera transforms. Export verification checks codecs, dimensions, duration,
frame count, complete decoding, audio peaks, music continuity, and matching
encoded video streams across the preview and silent exports. These objective
checks do not establish subjective listening quality.
