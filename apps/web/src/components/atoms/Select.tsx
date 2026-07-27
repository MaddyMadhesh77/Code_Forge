import type { SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select({ label, error, className = '', id, children, ...rest }: SelectProps) {
  const selectId = id ?? rest.name;

  return (
    <label className="block space-y-1.5 text-sm">
      {label && <span className="font-medium text-[color:var(--color-text-secondary)]">{label}</span>}
      <select
        id={selectId}
        className={`w-full rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--color-surface)] px-3 py-2.5 text-[color:var(--color-text)] outline-none transition focus:border-[color:var(--border-focus)] focus:ring-2 focus:ring-[color:var(--accent-primary-glow)] ${className}`}
        {...rest}
      >
        {children}
      </select>
      {error && <span className="text-xs font-medium text-[color:var(--color-danger)]">{error}</span>}
    </label>
  );
}

export default Select;
