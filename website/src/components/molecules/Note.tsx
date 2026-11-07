import type { ReactNode } from 'react';
import { Icon } from '../atoms/Icon';

export function Note({ children, caution = false }: { children: ReactNode; caution?: boolean }) {
  return (
    <div className={`doc-note ${caution ? 'doc-caution' : ''}`}>
      <Icon name={caution ? 'shield' : 'check'} />
      <div>{children}</div>
    </div>
  );
}
