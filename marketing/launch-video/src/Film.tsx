import React from 'react';
import { AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { PageCam } from './PageCam';

export const TOTAL = 900;
export const SHOTS = [
  { id: 'intro', from: 0, duration: 120 },
  { id: 'record', from: 120, duration: 180 },
  { id: 'inspect', from: 300, duration: 210 },
  { id: 'restore', from: 510, duration: 210 },
  { id: 'outro', from: 720, duration: 180 },
] as const;
const C = { bg: '#0b0e14', surface: '#11151e', text: '#dbe1ed', muted: '#8b96aa', line: '#252c39', green: '#c1e6a1' };
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const tween = (f: number, start: number, end: number, a = 0, b = 1) => interpolate(f, [start, end], [a, b], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });

export function Logo({ size = 72 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-label="AgentTM logo">
    <rect x="1" y="1" width="46" height="46" rx="12" fill="#c1e6a112" stroke="#c1e6a14a"/>
    <g stroke={C.green} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 14v9h9"/><path d="M12.4 22a13 13 0 1 1 3 12"/><path d="M25 15v10l6 4"/></g>
  </svg>;
}

function Kicker({ children }: { children: React.ReactNode }) { return <div style={{ color: C.green, fontSize: 32, letterSpacing: 3, fontWeight: 600 }}>{children}</div>; }
function Pill({ children }: { children: React.ReactNode }) { return <span style={{ border: '1px solid #c1e6a138', borderRadius: 50, background: '#c1e6a10a', color: C.green, padding: '12px 21px', fontSize: 34 }}>{children}</span>; }
function Grid() { return <AbsoluteFill style={{ backgroundImage: 'linear-gradient(#c1e6a106 1px,transparent 1px),linear-gradient(90deg,#c1e6a106 1px,transparent 1px)', backgroundSize: '96px 96px', maskImage: 'radial-gradient(ellipse at 70% 50%,black,transparent 70%)' }}/>; }

function Header({ step, title }: { step: string; title: string }) {
  return <div style={{ position: 'absolute', left: 96, right: 96, top: 58, display: 'flex', alignItems: 'center', gap: 16 }}>
    <Logo size={42}/><span style={{ fontWeight: 650, fontSize: 34, letterSpacing: -0.5 }}>AgentTM</span>
    <span style={{ width: 1, height: 24, background: C.line, margin: '0 12px' }}/>
    <span style={{ fontSize: 32, color: C.muted, letterSpacing: 2 }}>{step} / {title}</span>
    <span style={{ marginLeft: 'auto', color: C.muted, fontSize: 32 }}>DEMO PROJECT · REAL UI</span>
  </div>;
}

function Footer({ step, note }: { step: number; note: string }) {
  return <div style={{ position: 'absolute', left: 96, right: 96, bottom: 44, display: 'flex', alignItems: 'center', gap: 24 }}>
    <div style={{ display: 'flex', gap: 11 }}>{['RECORD', 'INSPECT', 'RESTORE'].map((word, i) => <React.Fragment key={word}><span style={{ fontSize: 32, letterSpacing: 1, color: i === step ? C.green : '#647084' }}>{word}</span>{i < 2 && <span style={{ color: C.line }}>—</span>}</React.Fragment>)}</div>
    <span style={{ marginLeft: 'auto', color: C.muted, fontSize: 32 }}>{note}</span>
  </div>;
}

function Caption({ children }: { children: React.ReactNode }) {
  return <div style={{ color: C.muted, fontSize: 42, lineHeight: 1.4, maxWidth: 710 }}>{children}</div>;
}

function Crop({ file, x, y, width, height, sourceX = 0, sourceY = 0, sourceWidth = 1600, scale = 1, border = true }: {
  file: string; x: number; y: number; width: number; height: number; sourceX?: number; sourceY?: number; sourceWidth?: number; scale?: number; border?: boolean;
}) {
  return <div style={{ position: 'absolute', left: x, top: y, width, height, overflow: 'hidden', borderRadius: 18, border: border ? `1px solid ${C.line}` : undefined, background: C.bg, boxShadow: '0 24px 80px #0007' }}>
    <Img src={staticFile(`textures/${file}.png`)} style={{ position: 'absolute', width: sourceWidth * scale, maxWidth: 'none', left: -sourceX * scale, top: -sourceY * scale }}/>
  </div>;
}

export function Intro() {
  const f = useCurrentFrame();
  return <AbsoluteFill>
    <div style={{ position: 'absolute', right: -260, top: 70, width: 1220, height: 1050, opacity: 0.16, transform: 'rotateY(-14deg) rotateZ(-7deg)', filter: 'blur(3px)', overflow: 'hidden' }}><Img src={staticFile('textures/timeline.png')} style={{ width: '100%' }}/></div>
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#0b0e14 25%,#0b0e1400)' }}/>
    <div style={{ position: 'absolute', left: 110, top: 156, display: 'flex', alignItems: 'center', gap: 18, opacity: tween(f, 0, 18) }}><Logo size={60}/><span style={{ fontSize: 35, fontWeight: 650 }}>AgentTM</span></div>
    <div style={{ position: 'absolute', left: 110, top: 321, opacity: tween(f, 9, 30), transform: `translateY(${tween(f, 9, 30, 26, 0)}px)` }}>
      <Kicker>WORKSPACE HISTORY FOR CODEX</Kicker>
      <h1 style={{ fontSize: 98, lineHeight: 1.1, letterSpacing: -5, fontWeight: 600, margin: '27px 0 0', maxWidth: 1220 }}>Your agent changed<br/>the code.</h1>
      <div style={{ marginTop: 28, fontSize: 64, color: C.green, opacity: tween(f, 42, 60) }}>See what happened.</div>
    </div>
    <div style={{ position: 'absolute', left: 110, bottom: 100, fontSize: 38, color: C.muted, opacity: tween(f, 50, 68) }}>A local debugging tool for managed Codex runs.</div>
  </AbsoluteFill>;
}

export function Record() {
  const f = useCurrentFrame();
  return <AbsoluteFill>
    <Header step="01" title="RECORD"/>
    <div style={{ position: 'absolute', left: 96, top: 270, width: 520, transform: `translateY(${tween(f, 0, 24, 25, 0)}px)`, opacity: tween(f, 0, 24) }}>
      <Kicker>THE RUN, RECORDED</Kicker>
      <h1 style={{ fontSize: 88, lineHeight: 1.07, letterSpacing: -4.5, margin: '24px 0 27px' }}>Record<br/>the run.</h1>
      <Caption>Codex events.<br/>Workspace checkpoints.<br/>One timeline.</Caption>
      <div style={{ marginTop: 32 }}><Pill>Stored on your device</Pill></div>
    </div>
    <div style={{ position: 'absolute', left: 670, top: 180, width: 1180, height: 664, borderRadius: 22, overflow: 'hidden', border: `1px solid ${C.line}`, boxShadow: '0 35px 120px #0008', opacity: tween(f, 7, 30), transform: `perspective(1800px) rotateY(${tween(f, 7, 32, -7, 0)}deg) translateY(${tween(f, 7, 32, 55, 0)}px)` }}>
      <div style={{ width: 1920, height: 1080, transform: 'scale(0.6145833333)', transformOrigin: '0 0' }}>
        <PageCam src="textures/timeline.png" pageH={1200} keys={[{ frame: 0, cx: 1010, cy: 680, zoom: 1.06 }, { frame: 58, cx: 1045, cy: 710, zoom: 1.1 }, { frame: 179, cx: 1045, cy: 710, zoom: 1.1 }]}/>
      </div>
    </div>
    <div style={{ position: 'absolute', left: 730, top: 860, width: 1055, opacity: tween(f, 62, 82), boxShadow: '0 12px 45px #0008', borderRadius: 10, overflow: 'hidden', border: '1px solid #c1e6a14a' }}><Img src={staticFile('textures/event-detail.png')} style={{ display: 'block', width: '100%' }}/></div>
    <Footer step={0} note="Observations, not causal proof"/>
  </AbsoluteFill>;
}

export function Inspect() {
  const f = useCurrentFrame();
  const shift = tween(f, 55, 100, 0, 1);
  return <AbsoluteFill>
    <Header step="02" title="INSPECT"/>
    <div style={{ position: 'absolute', left: 96, top: 175, opacity: tween(f, 0, 21) }}>
      <Kicker>FROM SNAPSHOT TO DIFF</Kicker>
      <h1 style={{ fontSize: 76, letterSpacing: -3.7, margin: '15px 0 12px' }}>Inspect the changes.</h1>
      <div style={{ color: C.muted, fontSize: 42 }}>Compare captured workspace states.</div>
    </div>
    <div style={{ position: 'absolute', left: 96, right: 96, top: 434, bottom: 137, overflow: 'hidden', borderRadius: 18, border: `1px solid ${C.line}`, background: C.bg, opacity: tween(f, 10, 32), transform: `translateY(${tween(f, 10, 32, 35, 0)}px)` }}>
      <Img src={staticFile('textures/changes-detail.png')} style={{ width: 1728, position: 'absolute', top: -shift * 230, left: 0 }}/>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 112, overflow: 'hidden', background: C.bg, borderBottom: `1px solid ${C.line}` }}><Img src={staticFile('textures/changes-detail.png')} style={{ width: 1728, position: 'absolute', top: 0, left: 0 }}/></div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 60, background: 'linear-gradient(transparent,#0b0e14)' }}/>
    </div>
    <div style={{ position: 'absolute', right: 144, top: 185, opacity: tween(f, 100, 120) }}><Pill>unitPriceCents × quantity</Pill></div>
    <Footer step={1} note="Historical content · read only"/>
  </AbsoluteFill>;
}

export function Restore() {
  const f = useCurrentFrame();
  const success = tween(f, 95, 107);
  return <AbsoluteFill>
    <Header step="03" title="RESTORE"/>
    <div style={{ position: 'absolute', left: 96, top: 230, width: 740, opacity: tween(f, 0, 21) }}>
      <Kicker>A SEPARATE WORKING COPY</Kicker>
      <h1 style={{ fontSize: 84, lineHeight: 1.08, letterSpacing: -4.5, margin: '24px 0 26px' }}>Restore a<br/>checkpoint.</h1>
      <Caption>Separate Git worktree.<br/>Original workspace preserved.</Caption>
      <div style={{ marginTop: 36, display: 'flex', gap: 12 }}><Pill>Original preserved</Pill><Pill>Hashes verified</Pill></div>
    </div>
    <div style={{ position: 'absolute', left: 925, top: 165, width: 820, height: 755, transform: `translateY(${tween(f, 6, 30, 36, 0)}px)`, opacity: tween(f, 6, 30) }}>
      <div style={{ position: 'absolute', width: '100%', opacity: 1 - success }}><Img src={staticFile('textures/restore-detail.png')} style={{ width: '100%', borderRadius: 16, boxShadow: '0 25px 100px #0008' }}/></div>
      <div style={{ position: 'absolute', width: '100%', top: 28, opacity: success }}><Img src={staticFile('textures/restored-detail.png')} style={{ width: '100%', borderRadius: 16, boxShadow: '0 25px 100px #0008' }}/></div>
    </div>
    <Footer step={2} note="Actual restore · disposable demo"/>
  </AbsoluteFill>;
}

export function Outro() {
  const f = useCurrentFrame();
  return <AbsoluteFill>
    {[
      { file: 'timeline', x: -215, y: 100, r: -8 },
      { file: 'changes', x: 1400, y: 70, r: 7 },
      { file: 'workspaces', x: 1450, y: 700, r: -5 },
    ].map((tile, i) => <div key={tile.file} style={{ position: 'absolute', left: tile.x, top: tile.y, width: 660, height: 355, overflow: 'hidden', borderRadius: 18, border: `1px solid ${C.line}`, opacity: tween(f, 4 + i * 4, 34 + i * 4, 0, 0.34), transform: `translateY(${tween(f, 4 + i * 4, 34 + i * 4, 90, 0)}px) rotate(${tile.r}deg)` }}><Img src={staticFile(`textures/${tile.file}.png`)} style={{ width: '100%' }}/></div>)}
    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center,#0b0e14 30%,#0b0e1400 80%)' }}/>
    <div style={{ position: 'absolute', top: 255, width: '100%', textAlign: 'center', opacity: tween(f, 12, 40) }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 27, transform: `scale(${tween(f, 12, 40, 0.93, 1)})` }}><Logo size={120}/><span style={{ fontSize: 132, fontWeight: 650, letterSpacing: -7 }}>Agent<span style={{ color: C.green }}>TM</span></span></div>
      <div style={{ fontSize: 64, letterSpacing: -1, marginTop: 35, opacity: tween(f, 35, 56) }}>Record. Inspect. Restore.</div>
      <div style={{ fontSize: 38, color: C.muted, marginTop: 22, opacity: tween(f, 48, 69) }}>Workspace history for managed Codex runs.</div>
      <div style={{ margin: '48px auto 0', display: 'inline-flex', border: '1px solid #c1e6a144', borderRadius: 12, background: '#c1e6a10b', padding: '19px 32px', color: C.green, fontSize: 44, opacity: tween(f, 62, 83) }}>github.com/Jyotishmoy12/AgentTM <span style={{ marginLeft: 22 }}>↗</span></div>
      <div style={{ color: C.muted, fontSize: 34, marginTop: 25, opacity: tween(f, 74, 95) }}>Try the public beta · Windows desktop + CLI/browser dashboard</div>
    </div>
    <div style={{ position: 'absolute', bottom: 47, width: '100%', textAlign: 'center', color: C.muted, fontSize: 32 }}>Local history. Codex uses its configured service.</div>
  </AbsoluteFill>;
}

// Sparse transitions, aligned to the screenshot/card entrance rather than every
// UI item. Gains compensate the measured quiet source levels.
export const SFX = [
  { from: 104, duration: 70, file: 'fs-423798.mp3', volume: 2.7 },
  { from: 303, duration: 66, file: 'fs-391444.mp3', volume: 1.6 },
  { from: 500, duration: 70, file: 'fs-423798.mp3', volume: 2.7 },
  { from: 704, duration: 70, file: 'fs-391444.mp3', volume: 1.6 },
];

export function Film({ sound = true, bgm = true }: { sound?: boolean; bgm?: boolean }) {
  const scenes = { intro: Intro, record: Record, inspect: Inspect, restore: Restore, outro: Outro };
  return <AbsoluteFill style={{ background: C.bg, color: C.text, fontFamily: 'Segoe UI, sans-serif', overflow: 'hidden' }}>
    <Grid/>
    {SHOTS.map(shot => { const Scene = scenes[shot.id]; return <Sequence key={shot.id} from={shot.from} durationInFrames={shot.duration}><Scene/></Sequence>; })}
    {sound && SFX.map((cue, i) => <Sequence key={i} from={cue.from} durationInFrames={cue.duration}><Audio src={staticFile(`audio/sfx/${cue.file}`)} volume={f => cue.volume * tween(f, 0, 5) * (1 - tween(f, cue.duration - 15, cue.duration - 1))}/></Sequence>)}
    {sound && bgm && <Audio src={staticFile('audio/music/promo-bed.wav')} volume={1}/>}
  </AbsoluteFill>;
}
