import { Icon } from '../atoms/Icon';

export function ProductPreview({
  image,
  alt,
  eager = false,
  chrome = true,
}: {
  image: string;
  alt: string;
  eager?: boolean;
  chrome?: boolean;
}) {
  return (
    <div className="product-frame">
      {chrome && (
        <div className="frame-bar">
          <span className="window-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <Icon name="lock" /> AgentTM <span className="frame-separator">/</span> demo-checkout
          </span>
          <span className="frame-local">
            <i /> Local history
          </span>
        </div>
      )}
      <img
        src={`${import.meta.env.BASE_URL}images/${image}`}
        width="3200"
        height="2000"
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding="async"
      />
    </div>
  );
}
