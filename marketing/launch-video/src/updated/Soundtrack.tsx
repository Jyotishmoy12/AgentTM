import { Audio, Sequence, staticFile } from 'remotion';
import { CLICKS, frameAt } from './timeline';
import { tween } from './motion';

export function Soundtrack() {
  return (
    <>
      <Audio src={staticFile('audio/music/updated-bed.wav')} volume={0.82} />
      {CLICKS.map((cue, index) => (
        <Sequence key={index} from={frameAt(cue.at)} durationInFrames={12}>
          <Audio src={staticFile('updated/click.wav')} volume={0.55} />
        </Sequence>
      ))}
      {[2.8, 13.2, 24.5, 35.9].map((at) => (
        <Sequence key={at} from={frameAt(at) - 20} durationInFrames={130}>
          <Audio
            src={staticFile('audio/sfx/fs-423798.mp3')}
            volume={(frame) => 0.8 * tween(frame, 0, 12) * (1 - tween(frame, 90, 130))}
          />
        </Sequence>
      ))}
    </>
  );
}
