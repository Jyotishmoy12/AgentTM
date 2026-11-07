import { AbsoluteFill } from 'remotion';
import { ProductStage } from './ProductStage';
import { Soundtrack } from './Soundtrack';
import { Opening, Closing } from './Titles';
import { COLORS } from './theme';

export function UpdatedFilm({ sound = true }: { sound?: boolean }) {
  return (
    <AbsoluteFill
      style={{
        background: COLORS.background,
        color: COLORS.text,
        fontFamily: 'Segoe UI Variable Display, Segoe UI, Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      <AbsoluteFill
        style={{ background: 'radial-gradient(ellipse at 50% 65%,#24412d2b,transparent 70%)' }}
      />
      <ProductStage />
      <Opening />
      <Closing />
      {sound && <Soundtrack />}
    </AbsoluteFill>
  );
}
