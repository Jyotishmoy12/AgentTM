import { execFileSync } from 'node:child_process';
import { existsSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const project = fileURLToPath(new URL('../', import.meta.url));
const [ffmpeg, ffprobe] = process.argv.slice(2);
if (!ffmpeg || !ffprobe) throw Error('Pass full FFmpeg and FFprobe paths');
const output = join(project, 'out/updated');
const master = join(output, 'AgentTM-product-40s.mp4');
const info = JSON.parse(
  execFileSync(
    ffprobe,
    [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=pix_fmt,color_range,color_space',
      '-of',
      'json',
      master,
    ],
    { windowsHide: true, encoding: 'utf8' },
  ),
);
if (info.streams[0].pix_fmt === 'yuv420p' && info.streams[0].color_space === 'bt709') {
  console.log('Publication color format already verified.');
} else {
  if (info.streams[0].pix_fmt !== 'yuvj420p' || info.streams[0].color_space !== 'bt470bg')
    throw Error('Unexpected render color format; review before conversion');
  const render = join(output, 'AgentTM-render-fullrange.mp4');
  if (existsSync(render))
    throw Error('Previous full-range render exists; preserve it before retrying');
  renameSync(master, render);
  execFileSync(
    ffmpeg,
    [
      '-v',
      'error',
      '-i',
      render,
      '-map',
      '0:v:0',
      '-map',
      '0:a:0',
      '-vf',
      'scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '17',
      '-pix_fmt',
      'yuv420p',
      '-color_range',
      'tv',
      '-colorspace',
      'bt709',
      '-color_primaries',
      'bt709',
      '-color_trc',
      'bt709',
      '-c:a',
      'copy',
      '-t',
      '40',
      '-movflags',
      '+faststart',
      master,
    ],
    { windowsHide: true, stdio: 'pipe' },
  );
  console.log(
    'Publication master converted to standard BT.709/yuv420p; original render preserved.',
  );
}
