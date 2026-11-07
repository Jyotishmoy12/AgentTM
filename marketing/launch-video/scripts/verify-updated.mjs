import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const project = fileURLToPath(new URL('../', import.meta.url));
const [ffmpeg, ffprobe] = process.argv.slice(2);
if (!ffmpeg || !ffprobe) throw Error('Pass full FFmpeg and FFprobe paths');
const out = join(project, 'out/updated');
const master = join(out, 'AgentTM-product-40s.mp4');
const run = (tool, args, extra = {}) =>
  execFileSync(tool, args, {
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    ...extra,
  });
const probe = (file) =>
  JSON.parse(
    run(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], {
      encoding: 'utf8',
    }),
  );
const info = probe(master);
const video = info.streams.find((stream) => stream.codec_type === 'video');
const audio = info.streams.find((stream) => stream.codec_type === 'audio');
assert(video?.codec_name === 'h264' && video.width === 1920 && video.height === 1080);
assert(video.avg_frame_rate === '60/1' && Number(video.nb_frames) === 2400);
assert(video.pix_fmt === 'yuv420p' && Math.abs(Number(info.format.duration) - 40) < 0.05);
assert(video.color_range === 'tv' && video.color_space === 'bt709');
assert(audio?.codec_name === 'aac' && Number(audio.sample_rate) === 48000);
run(ffmpeg, ['-v', 'error', '-i', master, '-f', 'null', '-']);
const pcm = run(ffmpeg, [
  '-v',
  'error',
  '-i',
  master,
  '-vn',
  '-ac',
  '2',
  '-ar',
  '48000',
  '-f',
  'f32le',
  '-',
]);
const samples = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4);
let peak = 0;
for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
assert(peak > 0.01 && peak < 0.99, `Unexpected audio peak ${peak}`);
const windows = [];
for (let second = 1; second < 38; second++) {
  let sum = 0;
  for (let index = second * 96000; index < (second + 1) * 96000; index++)
    sum += samples[index] ** 2;
  const rmsDBFS = 10 * Math.log10(sum / 96000);
  assert(rmsDBFS > -45, `Unexpected quiet music gap at ${second}s`);
  windows.push({ second, rmsDBFS });
}
const silent = join(out, 'AgentTM-product-40s-silent.mp4');
const preview = join(out, 'AgentTM-product-40s-vscode.mp4');
run(ffmpeg, [
  '-y',
  '-v',
  'error',
  '-i',
  master,
  '-map',
  '0:v:0',
  '-c:v',
  'copy',
  '-an',
  '-movflags',
  '+faststart',
  silent,
]);
run(ffmpeg, [
  '-y',
  '-v',
  'error',
  '-i',
  master,
  '-map',
  '0:v:0',
  '-map',
  '0:a:0',
  '-c:v',
  'copy',
  '-c:a',
  'libmp3lame',
  '-b:a',
  '192k',
  '-movflags',
  '+faststart',
  preview,
]);
const videoHash = (file) =>
  run(
    ffmpeg,
    [
      '-v',
      'error',
      '-i',
      file,
      '-map',
      '0:v:0',
      '-c',
      'copy',
      '-f',
      'hash',
      '-hash',
      'sha256',
      '-',
    ],
    { encoding: 'utf8' },
  ).trim();
const encodedHash = videoHash(master);
assert(videoHash(silent) === encodedHash && videoHash(preview) === encodedHash);
assert(!probe(silent).streams.some((stream) => stream.codec_type === 'audio'));
assert(probe(preview).streams.some((stream) => stream.codec_name === 'mp3'));
run(ffmpeg, ['-v', 'error', '-i', preview, '-f', 'null', '-']);
run(ffmpeg, [
  '-y',
  '-v',
  'error',
  '-ss',
  '38.5',
  '-i',
  master,
  '-frames:v',
  '1',
  join(out, 'AgentTM-product-poster.png'),
]);
run(ffmpeg, [
  '-y',
  '-v',
  'error',
  '-i',
  master,
  '-vf',
  'fps=1/4,scale=480:270,tile=5x2',
  '-frames:v',
  '1',
  join(out, 'contact-sheet.png'),
]);
const report = {
  duration: Number(info.format.duration),
  fps: 60,
  frames: Number(video.nb_frames),
  width: video.width,
  height: video.height,
  videoCodec: video.codec_name,
  audioCodec: audio.codec_name,
  bytes: statSync(master).size,
  audioPeakDBFS: 20 * Math.log10(peak),
  audioWindows: windows,
  fullDecodePassed: true,
  alternateExportsShareVideoStream: true,
  encodedVideoSHA256: encodedHash,
  motion: JSON.parse(readFileSync(join(out, 'motion-verification.json'), 'utf8')),
  originalPreserved: JSON.parse(readFileSync(join(project, 'public/updated/capture.json'), 'utf8'))
    .originalPreserved,
  subjectiveListeningReview: 'Not performed; continuous audio and peak levels checked objectively',
};
writeFileSync(join(out, 'verification.json'), JSON.stringify(report, null, 2));
const paths = [master, preview, silent, join(out, 'AgentTM-product-poster.png')];
writeFileSync(
  join(out, 'SHA256SUMS'),
  paths
    .map(
      (file) =>
        createHash('sha256').update(readFileSync(file)).digest('hex') +
        '  ' +
        file.split(/[\\/]/).at(-1),
    )
    .join('\n') + '\n',
);
console.log(
  JSON.stringify(
    { ...report, audioWindows: `${windows.length} continuous one-second windows` },
    null,
    2,
  ),
);
