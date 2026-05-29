import type { TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', id, ...rest }: TextareaProps) {
  const textareaId = id ?? rest.name;

  return (
    <label className="block space-y-1.5 text-sm">
      {label && <span className="font-medium text-[color:var(--color-text-secondary)]">{label}</span>}
      <textarea
        id={textareaId}
        className={`min-h-28 w-full rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--color-surface)] px-3 py-2.5 text-[color:var(--color-text)] outline-none transition placeholder:text-[color:var(--color-text-muted)] focus:border-[color:var(--border-focus)] focus:ring-2 focus:ring-[color:var(--accent-primary-glow)] ${className}`}
        {...rest}
      />
      {error && <span className="text-xs font-medium text-[color:var(--color-danger)]">{error}</span>}
    </label>
  );
}

export default Textarea;
