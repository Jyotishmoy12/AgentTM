import { useHeroFilm } from '../../hooks/useHeroFilm';

export function HeroFilm() {
  const { videoRef, hostRef, enabled, loaded, blocked, retry, unavailable } = useHeroFilm();
  return (
    <div className="product-frame hero-film" ref={hostRef}>
      <video
        ref={videoRef}
        src={loaded ? `${import.meta.env.BASE_URL}media/agenttm-product-tour.mp4` : undefined}
        poster={`${import.meta.env.BASE_URL}images/product-tour-poster.png`}
        width={1920}
        height={1080}
        autoPlay={enabled}
        muted
        loop
        playsInline
        controls={false}
        disablePictureInPicture
        preload="metadata"
        aria-label="AgentTM product tour"
        aria-describedby="hero-film-caption"
        onError={unavailable}
      />
      {blocked && enabled && (
        <button className="button button-secondary hero-film-retry" onClick={retry}>
          Play product tour
        </button>
      )}
    </div>
  );
}
