import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  footer?: ReactNode;
  loading?: boolean;
}

export function Card({ title, description, footer, loading = false, className = '', children, ...rest }: CardProps) {
  return (
    <section
      className={`rounded-3xl border border-[color:var(--border-primary)] bg-[color:var(--color-surface)] p-5 shadow-sm ${className}`}
      {...rest}
    >
      {(title || description) && (
        <header className="mb-4 space-y-1">
          {title && <h2 className="text-lg font-semibold text-[color:var(--color-text)]">{title}</h2>}
          {description && <p className="text-sm text-[color:var(--color-text-secondary)]">{description}</p>}
        </header>
      )}
      <div className="min-h-0">{loading ? <div className="h-24 animate-pulse rounded-2xl bg-[color:var(--bg-surface-hover)]" /> : children}</div>
      {footer && <footer className="mt-4 border-t border-[color:var(--border-subtle)] pt-4">{footer}</footer>}
    </section>
  );
}

export default Card;
