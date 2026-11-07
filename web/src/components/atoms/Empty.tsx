import type * as React from 'react';

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-orbit" aria-hidden="true">
        ◷
      </span>
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}
