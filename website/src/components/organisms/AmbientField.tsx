import { useSceneVisibility } from '../../hooks/useSceneVisibility';

export function AmbientField() {
  const { host, visible } = useSceneVisibility();
  return (
    <div ref={host} className="ambient-field" data-active={visible} aria-hidden="true">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <svg className="contour-field" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="contour-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#9eaf8c" stopOpacity="0" />
            <stop offset=".5" stopColor="#9eaf8c" stopOpacity=".3" />
            <stop offset="1" stopColor="#9eaf8c" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 12 }, (_, i) => (
          <path
            key={i}
            d={`M ${280 + i * 27} -80 C ${1450 + i * 15} 220, ${-100 + i * 23} 390, ${780 + i * 40} 1050`}
            fill="none"
            stroke="url(#contour-stroke)"
            strokeWidth={i % 4 === 0 ? 1.2 : 0.5}
            opacity={i % 3 === 0 ? 0.65 : 0.23}
          />
        ))}
        <path
          className="light-trail"
          pathLength="1"
          d="M 440 -80 C 1540 220, 38 390, 1040 1050"
          fill="none"
          stroke="#afc697"
          strokeWidth="1.5"
        />
      </svg>
      <span className="grid-cross cross-one" />
      <span className="grid-cross cross-two" />
      <span className="grid-cross cross-three" />
      <span className="grid-cross cross-four" />
    </div>
  );
}
