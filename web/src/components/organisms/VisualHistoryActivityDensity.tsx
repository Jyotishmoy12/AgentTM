import { time } from '../../data/VisualHistory';
import { plural } from '../../history-presentation';

export function VisualHistoryActivityDensity({
  model: viewModel,
}: {
  model: {
    density: {
      start: number;
      end: number;
      bins: { count: number; eventID: string }[];
      max: number;
      count: number;
    };
    jump: { id: string; bin: number } | null;
    jumpToBin: (index: number) => void;
    eventMore: boolean;
  };
}) {
  const { density, jump, jumpToBin, eventMore } = viewModel;
  return (
    <figure className="activity-density" aria-label="Recorded event density">
      <figcaption>
        Session activity <span>{density.count} loaded events · equal time intervals</span>
      </figcaption>
      <div className="density-bars">
        {density.bins.map((bin, index) => {
          const start = density.start + ((density.end - density.start) * index) / 48;
          return (
            <button
              key={index}
              className="density-bar"
              disabled={!bin.count}
              aria-label={
                bin.count +
                ' recorded ' +
                plural(bin.count, 'event') +
                ' from ' +
                time(new Date(start).toISOString()) +
                '; jump to timeline'
              }
              aria-pressed={jump?.bin === index}
              title={
                bin.count +
                ' recorded ' +
                plural(bin.count, 'event') +
                ' · ' +
                time(new Date(start).toISOString())
              }
              onClick={() => jumpToBin(index)}
            >
              <span
                style={{
                  height: (bin.count ? Math.max(7, (bin.count / density.max) * 100) : 2) + '%',
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="density-times">
        <time>{time(new Date(density.start).toISOString())}</time>
        <span>{eventMore ? 'Loaded portion of the recording' : 'Recorded timestamps'}</span>
        <time>{time(new Date(density.end).toISOString())}</time>
      </div>
    </figure>
  );
}
