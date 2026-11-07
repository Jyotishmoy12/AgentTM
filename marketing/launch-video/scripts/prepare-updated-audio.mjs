import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const project = fileURLToPath(new URL('../', import.meta.url));
const ffmpeg = process.argv[2];
if (!ffmpeg) throw Error('Pass the full path to FFmpeg');
const music = join(project, 'public/audio/music/cat-walk.mp3');
const hash = (data) => createHash('sha256').update(data).digest('hex');
if (
  hash(readFileSync(music)) !== 'e241cba000ce12e52cadd4c9956274e391ef1f66d1e48a5dd40bfc21645aa489'
)
  throw Error('Unexpected music source');
const analysis = spawnSync(
  ffmpeg,
  [
    '-hide_banner',
    '-ss',
    '8',
    '-t',
    '40',
    '-i',
    music,
    '-af',
    'loudnorm=I=-18:TP=-3:LRA=12:print_format=json',
    '-f',
    'null',
    '-',
  ],
  { windowsHide: true, encoding: 'utf8' },
);
if (analysis.status !== 0) throw Error(analysis.stderr);
const measured = JSON.parse(analysis.stderr.match(/\{[^{}]+\}/s)?.[0] || '{}');
if (!measured.input_i) throw Error('No loudness analysis');
const filter = `loudnorm=I=-18:TP=-3:LRA=12:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`;
execFileSync(
  ffmpeg,
  [
    '-y',
    '-v',
    'error',
    '-ss',
    '8',
    '-t',
    '40',
    '-i',
    music,
    '-af',
    `${filter},afade=t=in:st=0:d=0.7,afade=t=out:st=37.8:d=2.2,aresample=48000`,
    '-c:a',
    'pcm_s16le',
    join(project, 'public/audio/music/updated-bed.wav'),
  ],
  { windowsHide: true },
);
const rate = 48000,
  count = Math.round(rate * 0.09);
const wave = Buffer.alloc(44 + count * 2);
wave.write('RIFF', 0);
wave.writeUInt32LE(wave.length - 8, 4);
wave.write('WAVEfmt ', 8);
wave.writeUInt32LE(16, 16);
wave.writeUInt16LE(1, 20);
wave.writeUInt16LE(1, 22);
wave.writeUInt32LE(rate, 24);
wave.writeUInt32LE(rate * 2, 28);
wave.writeUInt16LE(2, 32);
wave.writeUInt16LE(16, 34);
wave.write('data', 36);
wave.writeUInt32LE(count * 2, 40);
for (let index = 0; index < count; index++) {
  const time = index / rate;
  const envelope = Math.min(1, time / 0.003) * Math.exp(-time * 70) * Math.max(0, 1 - time / 0.09);
  const signal = Math.sin(2 * Math.PI * 1050 * time) + 0.35 * Math.sin(2 * Math.PI * 560 * time);
  wave.writeInt16LE(Math.round(signal * envelope * 0.13 * 32767), 44 + index * 2);
}
writeFileSync(join(project, 'public/updated/click.wav'), wave);
writeFileSync(
  join(project, 'out/updated/audio-processing.json'),
  JSON.stringify(
    {
      music: 'Cat Walk by Arulo; existing licensed source, see public/audio/music/CREDITS.md',
      duration: 40,
      excerptStart: 8,
      measured,
      targetLUFS: -18,
      fadeIn: 0.7,
      fadeOut: 2.2,
      click: 'Original deterministic soft sine transient',
      clickSHA256: hash(wave),
    },
    null,
    2,
  ),
);
console.log('40-second music bed and soft click cue prepared.');
