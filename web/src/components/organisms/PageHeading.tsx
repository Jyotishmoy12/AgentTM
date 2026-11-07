import type * as React from 'react';
import { descriptions, navigation } from '../../data/NavigationPages';
import type { AppPage } from '../../types/NavigationPages';

export function PageHeading({ page, children }: { page: AppPage; children?: React.ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">YOUR WORKSPACE HISTORY</span>
        <h1>{navigation.find((n) => n.id === page)?.title}</h1>
        <p>{descriptions[page]}</p>
      </div>
      {children && <div className="page-heading-actions">{children}</div>}
    </div>
  );
}
