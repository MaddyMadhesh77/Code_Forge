import type { ButtonHTMLAttributes } from 'react';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function PaginationButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--color-surface)] px-3 py-2 text-sm font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--color-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    />
  );
}

export function Pagination({ page, totalPages, onPageChange, className = '' }: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(page, 1), safeTotalPages);

  return (
    <nav className={`flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--color-surface)] p-3 ${className}`} aria-label="Pagination">
      <span className="text-sm text-[color:var(--color-text-secondary)]">Page {safePage} of {safeTotalPages}</span>
      <div className="flex items-center gap-2">
        <PaginationButton disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>Previous</PaginationButton>
        <PaginationButton disabled={safePage >= safeTotalPages} onClick={() => onPageChange(safePage + 1)}>Next</PaginationButton>
      </div>
    </nav>
  );
}

export default Pagination;
