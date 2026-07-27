import type { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, description, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 cursor-default bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className="relative z-10 w-full max-w-3xl rounded-[28px] border border-[color:var(--border-primary)] bg-[color:var(--color-surface)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
      >
        {(title || description) && (
          <header className="mb-4 space-y-1">
            {title && <h2 id="modal-title" className="text-xl font-semibold text-[color:var(--color-text)]">{title}</h2>}
            {description && <p className="text-sm text-[color:var(--color-text-secondary)]">{description}</p>}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}

export default Modal;
