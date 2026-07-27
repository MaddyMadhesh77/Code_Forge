import type { ReactNode } from 'react';

export interface PageContainerProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageContainer({ title, subtitle, actions, children, className = '' }: PageContainerProps) {
  return (
    <div className={`mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8 ${className}`}>
      <header className="flex flex-col gap-4 rounded-[28px] border border-[color:var(--border-primary)] bg-[linear-gradient(135deg,var(--color-surface),var(--bg-surface-hover))] p-5 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--color-text-muted)]">Code Forge</p>
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--color-text)]">{title}</h1>
          {subtitle && <p className="max-w-3xl text-sm text-[color:var(--color-text-secondary)]">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

export default PageContainer;
