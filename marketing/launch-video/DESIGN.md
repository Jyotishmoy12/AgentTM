# AgentTM launch film

Mode: autonomous original production using video-shotcraft's production method
and reusable PageCam component. Minimum requested duration: 15 seconds; selected
duration: exactly 30 seconds, 900 frames at 30 fps, 1920×1080 H.264 MP4.

## Product and audience

AgentTM records managed Codex runs and workspace observations, presents an event
timeline and historical file differences, and restores captured files into an
isolated Git worktree. Audience: developers evaluating the public beta.
The film must show recording, inspection and restoration. It must not imply
atomic snapshots, causal line attribution, deterministic replay, open-source
licensing, or checkpoint-based conversation rewinding.

## Visual direction

Reuse the real product: background #0b0e14, surface #11151e, border #252c39,
text #dbe1ed, muted #8b96aa, accent #c1e6a1. Segoe UI / system sans for titles;
Consolas for code and metadata. Existing application font is Inter with system
fallback. Rounded panels, thin borders, generous framing. Stable camera, eased
21-frame entrances, no handheld shake, no repeated flashes or neon treatment.
Brand lockups hold for at least one second. Code/diff views remain front-facing.
The paper-and-amber Ink Press skin is unsuitable for this product's dark UI.

The existing product defines strict visual tokens; skip a separate speculative
styleframe and validate actual Remotion stills before the final render instead.
Primary narrative headlines use 76–132px text; auxiliary editorial copy uses
32–44px. Product screenshot text retains its authentic size and is visual
context rather than a promise that every UI label can be read on a phone.
The meaningful cart change is also called out in large editorial type.
This deliberately prioritizes the product's unmodified UI over re-typesetting
it as a fake readable interface (Q11 exception for authentic screenshot texture).
Small editorial framing labels/footnotes use 32–34px CSS type rather than
enforcing 32px ink-glyph height. This is a deliberate Q11 exception for secondary
metadata: they do not carry the primary story or action. Primary headlines and
the download URL remain substantially larger. The real screenshot's file header
is held in place as an editorial crop while its code body pans underneath.

## Data and assets

Capture the actual production dashboard in Chromium at 2× pixel density.
Use only a disposable, fictional shopping-cart project with a real managed Codex
recording. Publicly visible captions label it as a demo project. Source captures
remain unedited; compositions may crop, frame and annotate them. No customer
data, personal files, credentials or production history. The restore is actually
executed in that disposable repository. Record the original index, HEAD and
file hashes and verify preservation. Store capture selectors and coordinates.
Do not use the upstream research-tool screenshots or historical template audio.

## Storyboard and execution decisions

| Time | Frames | Purpose | Visual / motion | Copy |
| --- | --- | --- | --- | --- |
| 0–4 s | 0–119 | Problem / brand | Single typography reveal, subtle timeline texture; brand holds | Your agent changed the code. See what happened. |
| 4–10 s | 120–299 | Record | Real timeline screenshot; PageCam eased reveal into steady readable panel | Record the run. Codex events. Workspace checkpoints. |
| 10–17 s | 300–509 | Inspect | Real historical file/diff close-up; front-facing crop; before/after emphasis | Inspect the changes. Compare captured workspace states. |
| 17–24 s | 510–719 | Restore | Real fork confirmation, then actual success/result; steady readable crop | Restore a checkpoint. Into a separate Git worktree. |
| 24–30 s | 720–899 | Brand / call to action | Three representative screenshot tiles settle around centered brand; last 45f still | AgentTM. Record. Inspect. Restore. github.com/Jyotishmoy12/AgentTM |

Copy was shortened during still validation to preserve large, readable type;
the headline functions and frame budgets above remain unchanged.

These are custom product-specific shots rather than claims to reproduce a
Gallery variant. PageCam's mathematical pan/zoom and 2× screenshot technique are
adapted from video-shotcraft; retain its source/license notice. Dense information
stays front-facing. Any screenshot transitions are editorial animation, not a
claim of recorded native-window interaction. Longer real actions are condensed.

Audio revision: the user requested continuous music after reviewing the initial
SFX-only cut. The current master includes **Cat Walk by Arulo (Mixkit)** under
the retained separate stock-music terms, with a normalized 30-second excerpt,
0.4-second fade-in and 1.6-second fade-out, plus the existing CC0 transition cues.
The content-led visual timeline is preserved; beat-locked editing is not claimed.
No synthetic system notification sounds or voiceover. Essential information
remains readable muted. The initial SFX-only cut and a silent copy are retained.

## Validation

TypeScript compilation; individual stills for all scenes; full render; MP4
metadata and decoding; sampled-frame/contact-sheet visual inspection; audio
peak and duration checks; independent review against this brief and
video-shotcraft's final-review.md. Report unavailable checks honestly.
