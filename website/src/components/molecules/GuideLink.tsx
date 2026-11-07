import type { ReactNode } from 'react';
import type { Topic } from '../../types/DocsShared';
import { Icon } from '../atoms/Icon';

export function GuideLink({ topic, children }: { topic: Topic; children: ReactNode }) {
  return (
    <a className="doc-inline-link" href={`#${topic}`}>
      {children}
      <Icon name="arrow" />
    </a>
  );
}
