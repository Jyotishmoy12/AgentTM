import type * as React from 'react';

export function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="error-box" role="alert">
      {children}
    </div>
  );
}
