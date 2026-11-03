import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ffmpeg = process.argv[2] || 'ffmpeg';
const ffprobe = process.argv[3] || 'ffprobe';
const video = join(root, 'out/AgentTM-launch-30s.mp4');
const run = (tool, args, options = {}) => execFileSync(tool, args, { windowsHide: true, maxBuffer: 64 * 1024 * 1024, ...options });
const info = JSON.parse(run(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', video], { encoding: 'utf8' }));
const v = info.streams.find(s => s.codec_type === 'video');
const a = info.streams.find(s => s.codec_type === 'audio');
if (v?.codec_name !== 'h264' || v.width !== 1920 || v.height !== 1080 || v.r_frame_rate !== '30/1' || Number(v.nb_frames) !== 900 || Math.abs(Number(info.format.duration) - 30) > 0.1 || a?.codec_name !== 'aac') throw new Error('Unexpected export metadata');
run(ffmpeg, ['-v', 'error', '-i', video, '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-f', 'null', '-']);
const pcm = run(ffmpeg, ['-v', 'error', '-i', video, '-vn', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-']);
const samples = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
const stereoPCM = run(ffmpeg, ['-v', 'error', '-i', video, '-vn', '-ac', '2', '-ar', '48000', '-f', 'f32le', '-']);
const stereoSamples = new Float32Array(stereoPCM.buffer, stereoPCM.byteOffset, stereoPCM.byteLength / 4);
let stereoPeak = 0;
for (const sample of stereoSamples) stereoPeak = Math.max(stereoPeak, Math.abs(sample));
if (stereoPeak >= 0.99) throw new Error('Stereo channel clipped');
const musicPresent = existsSync(join(root, 'public/audio/music/promo-bed.wav'));
let peak = 0;
for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
if (peak >= 0.99 || peak < 0.001) throw new Error('Audio clipped or effectively silent');
const perSecondRMS = Array.from({ length: 28 }, (_, i) => {
  let energy = 0;
  const start = (i + 1) * 48000;
  for (let n = start; n < start + 48000; n++) energy += samples[n] * samples[n];
  return { second: i + 1, rmsDBFS: 10 * Math.log10(energy / 48000) };
});
if (musicPresent && perSecondRMS.some(window => window.rmsDBFS < -45)) throw new Error('Unexpected quiet gap in background music');
// Measure isolated SFX timing on the preserved SFX master, not music transients.
const sfxOnly = join(root, 'out/AgentTM-launch-30s-sfx-only.mp4');
const timingPCM = existsSync(sfxOnly) ? run(ffmpeg, ['-v', 'error', '-i', sfxOnly, '-vn', '-ac', '1', '-ar', '48000', '-f', 'f32le', '-']) : pcm;
const timingSamples = new Float32Array(timingPCM.buffer, timingPCM.byteOffset, timingPCM.byteLength / 4);
const cues = [
  { from: 104, peak: 0.875 }, { from: 303, peak: 0.485 },
  { from: 500, peak: 0.875 }, { from: 704, peak: 0.485 },
];
const timing = cues.map(cue => {
  const expected = cue.from / 30 + cue.peak;
  const lo = Math.max(0, Math.floor((expected - 0.3) * 48000));
  const hi = Math.min(timingSamples.length - 480, Math.floor((expected + 0.3) * 48000));
  let max = 0, best = lo;
  for (let i = lo; i < hi; i += 48) {
    let energy = 0;
    for (let n = i; n < i + 480; n++) energy += timingSamples[n] * timingSamples[n];
    if (energy > max) { max = energy; best = i; }
  }
  return { expectedSeconds: expected, observedSeconds: (best + 240) / 48000, errorFrames: Math.round(((best + 240) / 48000 - expected) * 300) / 10 };
});
run(ffmpeg, ['-y', '-v', 'error', '-i', video, '-map', '0:v:0', '-c', 'copy', '-an', '-movflags', '+faststart', join(root, 'out/AgentTM-launch-30s-silent.mp4')]);
run(ffmpeg, ['-y', '-v', 'error', '-i', video, '-vf', 'fps=1/3,scale=480:270,tile=5x2', '-frames:v', '1', join(root, 'out/contact-sheet.png')]);
run(ffmpeg, ['-y', '-v', 'error', '-ss', '28.333333', '-i', video, '-frames:v', '1', join(root, 'out/AgentTM-poster.png')]);
const silentInfo = JSON.parse(run(ffprobe, ['-v', 'error', '-show_streams', '-of', 'json', join(root, 'out/AgentTM-launch-30s-silent.mp4')], { encoding: 'utf8' }));
if (silentInfo.streams.some(s => s.codec_type === 'audio')) throw new Error('Silent export has audio');
// Copying the encoded video stream preserves exact visual frame parity.
const streamHash = file => run(ffmpeg, ['-v', 'error', '-i', file, '-map', '0:v:0', '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-'], { encoding: 'utf8' }).trim();
const videoHash = streamHash(video);
if (videoHash !== streamHash(join(root, 'out/AgentTM-launch-30s-silent.mp4'))) throw new Error('Silent video differs from master');
const report = {
  dimensions: '1920x1080', fps: 30, frames: 900, durationSeconds: Number(info.format.duration),
  videoCodec: v.codec_name, audioCodec: a.codec_name,
  fileBytes: Number(info.format.size), audioSamplePeakDBFS: 20 * Math.log10(peak),
  stereoChannelSamplePeakDBFS: 20 * Math.log10(stereoPeak),
  backgroundMusic: musicPresent ? 'Cat Walk by Arulo (Mixkit)' : null,
  musicContinuityRMS: perSecondRMS,
  energyPeakTiming: timing, energyPeakTimingSource: existsSync(sfxOnly) ? 'preserved SFX-only master' : 'master', decoded: true, silentVideoStreamSHA256: videoHash,
  listeningTest: 'Not performed; waveform/metadata checks do not establish subjective sound quality',
  capture: JSON.parse(readFileSync(join(root, 'capture-report.json'), 'utf8')),
};
writeFileSync(join(root, 'out/verification.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
