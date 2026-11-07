import type { ReactNode } from 'react';

export function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="doc-step">
      <span className="doc-step-number">{String(number).padStart(2, '0')}</span>
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  );
}
