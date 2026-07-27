import type { InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', id, ...rest }: InputProps) {
  const inputId = id ?? rest.name;

  return (
    <label className="block space-y-1.5 text-sm">
      {label && <span className="font-medium text-[color:var(--color-text-secondary)]">{label}</span>}
      <input
        id={inputId}
        className={`w-full rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--color-surface)] px-3 py-2.5 text-[color:var(--color-text)] outline-none transition placeholder:text-[color:var(--color-text-muted)] focus:border-[color:var(--border-focus)] focus:ring-2 focus:ring-[color:var(--accent-primary-glow)] ${className}`}
        {...rest}
      />
      {error && <span className="text-xs font-medium text-[color:var(--color-danger)]">{error}</span>}
    </label>
  );
}

export default Input;
