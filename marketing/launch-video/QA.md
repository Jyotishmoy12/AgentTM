# Launch-film validation

Validated on 2026-11-03 on Windows. User selected autonomous creative direction
and required at least 15 seconds. Delivered video timeline: **30 seconds**.

## Initial SFX-only export checks (superseded by the music revision below)

- Real Codex demo session `21c05021-8fa3-4272-bb26-95c59135f4f2` corrected the
  fictional cart subtotal and added a regression test; six captured checkpoints.
  Production UI captures and actual baseline restore were performed in that
  disposable project. Original source/test files, Git index and HEAD hashes
  matched after restoring. `agenttm doctor` passed storage and snapshot integrity.
- `npm.cmd run check`: TypeScript passed.
- Remotion rendered individual scene stills and the full MP4 successfully.
- `node scripts/check-docs.mjs` from the repository root: documentation passed.
- `node .test-work/check-film-studio.mjs` from the repository root: Studio started,
  loaded AgentTMLaunch in Chrome, and reported no page errors. Test processes
  were closed. This verifies startup, not every editor interaction/export control.
- `scripts/verify.mjs` checked the actual master: H.264 1920×1080, 900 frames,
  30 fps; AAC audio. Video is exactly 30 seconds; the MP4 container reports
  30.058667 seconds due to audio padding. File size: 4,564,246 bytes.
- Full video/audio decode and re-encode to a null sink passed. Decoded mono audio
  sample peak: −13.14 dBFS. This is not a true-peak or subjective listening test.
- Measured 10ms-window energy peaks for the four cues were 0.9–1.4 frames later
  than the source-based predicted peaks. This is below three frames and is
  reported as measurement, not a claim of subjective sound alignment.
- Silent MP4 was made by copying the master's encoded video stream and removing
  audio. Encoded-video SHA-256 matched exactly; no visual re-render was needed.
- Source sound hashes match the retained CC0 provenance manifests. Applied gain,
  fade envelopes and timeline trims live in the composition; source bytes are
  unmodified. Audio has not been subjectively auditioned.

## Visual review

Independent review followed video-shotcraft's final-review checklist in a separate
agent context. Final frames were extracted from the actual exported MP4 at
f90, f250, f435, f690 and f850, with a ten-frame contact sheet. Review confirmed
the core recording/inspection/restoration story and no remaining visual blockers
in inspected frames. Earlier framing and typography findings were corrected.

The review does not establish uninterrupted motion smoothness or perceived
sound quality: it inspected frames/contact sheets, not audiovisual playback.
The authentic UI retains small contextual text. DESIGN.md records deliberate
exceptions for screenshot texture and secondary editorial metadata. Minor clipped
sidebar fragments are contextual framing, not missing primary copy.

## Delivery and limits

- Master: `out/AgentTM-launch-30s.mp4`.
- Silent master: `out/AgentTM-launch-30s-silent.mp4`.
- Poster, contact sheet, technical JSON and editable source archive are in `out/`.
- The initial cut has no music or voiceover. Its SFX-only copy is preserved.
- Captures use the current source-built production dashboard, not a claim that
  every visible UI element was independently validated in a published release.
- Workbench's Windows launcher failed on symbolic-link permissions; its full
  visual editing/parity workflow is not validated. Remotion source/Studio is
  supplied as the editable path. No product code was added for the film.
- No video, release, or social post was published or uploaded.

## Current master: continuous-music revision

The user requested background audio after the first cut. The updated master and
the explicitly named `AgentTM-launch-30s-with-music.mp4` include **Cat Walk by
Arulo (Mixkit)** alongside the existing transition sounds. The official listing,
download hash and separate license are retained in music credits. Raw stock music
and its isolated normalized bed are excluded from Git and the source archive.

`scripts/add-music.mjs` prepared a 30-second excerpt, normalized it in two passes,
added fades, mixed it with the preserved SFX master, and copied the reviewed video
stream without visual re-encoding. A safety limiter bounds the mix. The first
mix attempt encountered options unavailable in the older portable FFmpeg; the
script was adapted to its supported options and completed successfully.

`scripts/verify.mjs` then checked the revised master: 900 frames, 1920×1080,
30 fps, H.264/AAC, 30-second container, 4,105,919 bytes. Full audio/video decode
passed. The decoded mono sample peak was −1.94 dBFS. One-second windows at seconds
1–28 all contained audio (RMS above −45 dBFS), including the previously quiet
9-second point. See `out/verification.json` for measurements. SFX peak timing is
measured on the isolated SFX master so music peaks are not misidentified as cues.

The silent copy retains the identical encoded video hash. The music is a
background bed added after the content-led edit; beat-locked editing or a
subjective listening review is not claimed. No voiceover was added.

A separate H.264/MP3 `vscode-preview` MP4 is included because VS Code webviews
do not support AAC audio. The standard H.264/AAC master remains the publication
copy. Stereo-channel sample peak measured separately: −4.30 dBFS, with no clipped
samples. Preview codec/decode checks do not constitute a manual VS Code playback test.
