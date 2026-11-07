import { useEffect, useRef } from 'react';
import { Icon } from '../atoms/Icon';

export function DemoVideo({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);
  return (
    <dialog
      className="demo-dialog"
      ref={dialog}
      onCancel={onClose}
      onClose={() => {
        video.current?.pause();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="video-title"
    >
      <div className="dialog-heading">
        <h2 id="video-title">AgentTM in 30 seconds</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close demo">
          <Icon name="close" />
        </button>
      </div>
      {open && (
        <video
          ref={video}
          controls
          playsInline
          preload="metadata"
          poster={`${import.meta.env.BASE_URL}images/video-poster.png`}
        >
          <source src={`${import.meta.env.BASE_URL}media/agenttm-demo.mp4`} type="video/mp4" />
          <a href={`${import.meta.env.BASE_URL}media/agenttm-demo.mp4`}>Download the demo video</a>
        </video>
      )}
      <p>
        Earlier-interface workflow demo with music and sound effects. The screenshots on this page
        show the current design.{' '}
        <a href="https://github.com/Jyotishmoy12/AgentTM/blob/main/docs/videos/CREDITS.md">
          Video credits ↗
        </a>
      </p>
    </dialog>
  );
}
