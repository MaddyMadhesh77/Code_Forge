import type { ReactNode } from 'react';

export interface TableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  rowKey?: (row: T, index: number) => string;
  loading?: boolean;
  emptyMessage?: string;
}

export function Table<T>({ columns, data, onRowClick, rowKey, loading = false, emptyMessage = 'No records found.' }: TableProps<T>) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[color:var(--border-primary)] bg-[color:var(--color-surface)] shadow-sm">
      <table className="min-w-full divide-y divide-[color:var(--border-subtle)]">
        <thead className="bg-[color:var(--bg-surface-hover)]">
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-text-muted)] ${column.className ?? ''}`}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--border-subtle)]">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <tr key={`skeleton-${index}`}>
                <td className="px-4 py-4" colSpan={columns.length}>
                  <div className="h-10 animate-pulse rounded-2xl bg-[color:var(--bg-surface-hover)]" />
                </td>
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-sm text-[color:var(--color-text-secondary)]" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const key = rowKey?.(row, index) ?? String(index);

              return (
                <tr
                  key={key}
                  className={`transition ${onRowClick ? 'cursor-pointer hover:bg-[color:var(--bg-surface-hover)]' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-4 text-sm text-[color:var(--color-text)] ${column.className ?? ''}`}>
                      {column.render ? column.render(row) : (row as Record<string, ReactNode>)[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;
