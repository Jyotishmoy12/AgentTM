// Audio-only update: preserves the reviewed video stream without re-rendering.
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, copyFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ffmpeg = process.argv[2] || 'ffmpeg';
const source = join(root, 'public/audio/music/cat-walk.mp3');
const bed = join(root, 'public/audio/music/promo-bed.wav');
const master = join(root, 'out/AgentTM-launch-30s.mp4');
const sfx = join(root, 'out/AgentTM-launch-30s-sfx-only.mp4');
const updated = join(root, 'out/AgentTM-launch-30s-with-music.mp4');
const prepareOnly = process.argv.includes('--prepare-only');
if (createHash('sha256').update(readFileSync(source)).digest('hex') !== 'e241cba000ce12e52cadd4c9956274e391ef1f66d1e48a5dd40bfc21645aa489') throw new Error('Music source hash mismatch');
const run = args => execFileSync(ffmpeg, args, { windowsHide: true, stdio: 'pipe' });
if (!prepareOnly && !existsSync(sfx)) copyFileSync(master, sfx);
const first = spawnSync(ffmpeg, ['-hide_banner', '-ss', '8', '-t', '30', '-i', source, '-af', 'loudnorm=I=-18:TP=-3:LRA=15:print_format=json', '-f', 'null', '-'], { windowsHide: true, encoding: 'utf8' });
if (first.status !== 0) throw new Error(first.stderr);
const metrics = JSON.parse(first.stderr.match(/\{[^{}]+\}/s)?.[0] || '{}');
if (!metrics.input_i) throw new Error('Music analysis missing');
const normalizer = `loudnorm=I=-18:TP=-3:LRA=15:measured_I=${metrics.input_i}:measured_TP=${metrics.input_tp}:measured_LRA=${metrics.input_lra}:measured_thresh=${metrics.input_thresh}:offset=${metrics.target_offset}:linear=true`;
run(['-y', '-v', 'error', '-ss', '8', '-t', '30', '-i', source, '-af', `${normalizer},afade=t=in:st=0:d=0.4,afade=t=out:st=28.4:d=1.6,aresample=48000`, '-c:a', 'pcm_s16le', bed]);
// Older portable FFmpeg normalizes amix by two; restore unity gain explicitly.
if (!prepareOnly) {
  run(['-y', '-v', 'error', '-i', sfx, '-i', bed, '-filter_complex', '[0:a:0][1:a:0]amix=inputs=2:duration=first:dropout_transition=0,volume=2,alimiter=limit=0.89:level=false[a]', '-map', '0:v:0', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', '30', '-movflags', '+faststart', updated]);
  copyFileSync(updated, master);
  run(['-y', '-v', 'error', '-i', updated, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy', '-c:a', 'libmp3lame', '-b:a', '192k', '-movflags', '+faststart', join(root, 'out/AgentTM-launch-30s-vscode-preview.mp4')]);
}
writeFileSync(join(root, 'public/audio/music/processing.json'), JSON.stringify({ track: 'Cat Walk', artist: 'Arulo', startSeconds: 8, durationSeconds: 30, targetLUFS: -18, targetTruePeakDBTP: -3, measuredSource: metrics, fadeInSeconds: 0.4, fadeOutSeconds: 1.6, sourceSHA256: 'e241cba000ce12e52cadd4c9956274e391ef1f66d1e48a5dd40bfc21645aa489', bedSHA256: createHash('sha256').update(readFileSync(bed)).digest('hex'), delivery: 'Video copied from reviewed SFX-only master; audio mixed with prepared bed, AAC 192kbps, 48kHz, safety limiter' }, null, 2));
console.log(prepareOnly ? 'Normalized/faded music bed prepared.' : 'Continuous background music mixed; original SFX-only master preserved.');
