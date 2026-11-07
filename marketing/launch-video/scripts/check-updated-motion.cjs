const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const project = path.resolve(__dirname, '..');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const module = { exports: {} };
  cache.set(file, module);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const resolve = (name) => {
    if (!name.startsWith('.')) return require(name);
    const target = path.resolve(path.dirname(file), name);
    return load(path.extname(target) ? target : target + '.ts');
  };
  new Function('require', 'module', 'exports', source)(resolve, module, module.exports);
  return module.exports;
}
const { camera, cursor } = load(path.join(project, 'src/updated/motion.ts'));
const { CLICKS, SCREENS, frameAt } = load(path.join(project, 'src/updated/timeline.ts'));
const { STAGE, FPS, TOTAL_FRAMES } = load(path.join(project, 'src/updated/theme.ts'));
const position = (frame) => {
  const view = camera(frame),
    point = cursor(frame);
  return {
    x: view.x + point.x * STAGE.scale * view.zoom,
    y: view.y + point.y * STAGE.scale * view.zoom,
  };
};
let maxCursorStep = 0,
  maxZoomStep = 0;
for (let frame = frameAt(3.5); frame < frameAt(35.5); frame++) {
  const point = position(frame),
    next = position(frame + 1);
  assert(
    point.x > 0 && point.x < STAGE.width && point.y > 0 && point.y < STAGE.height,
    `Cursor outside stage at frame ${frame}: ${JSON.stringify(point)}`,
  );
  maxCursorStep = Math.max(maxCursorStep, Math.hypot(next.x - point.x, next.y - point.y));
  maxZoomStep = Math.max(maxZoomStep, Math.abs(camera(frame + 1).zoom - camera(frame).zoom));
}
for (const click of CLICKS) {
  const point = cursor(frameAt(click.at));
  assert(
    Math.hypot(point.x - click.point.x, point.y - click.point.y) < 0.01,
    `Cursor misses its actual UI target at ${click.at}s`,
  );
  assert(
    SCREENS.some((shot) => Math.abs(shot.at - click.at - 0.15) < 0.001),
    `No captured response follows click at ${click.at}s`,
  );
}
assert(maxCursorStep < 80, `Cursor jumps ${maxCursorStep}px per frame`);
assert(maxZoomStep < 0.02, 'Abrupt camera zoom');
const report = {
  fps: FPS,
  duration: TOTAL_FRAMES / FPS,
  clicks: CLICKS.length,
  maxCursorPixelsPerFrame: maxCursorStep,
  maxZoomPerFrame: maxZoomStep,
  clickTargetsAligned: true,
  cursorWithinStage: true,
};
fs.writeFileSync(
  path.join(project, 'out/updated/motion-verification.json'),
  JSON.stringify(report, null, 2),
);
console.log(report);
