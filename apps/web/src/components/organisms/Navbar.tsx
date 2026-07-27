import type { ReactNode } from 'react';
import { Bell, MoonStar, Search, SunMedium } from 'lucide-react';

export interface NavbarProps {
  title?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onToggleTheme?: () => void;
  theme?: 'light' | 'dark';
  actions?: ReactNode;
}

export function Navbar({ title = 'Code Forge', searchValue, onSearchChange, onToggleTheme, theme = 'light', actions }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-glass)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 md:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--color-primary)] text-sm font-bold text-white">CF</div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[color:var(--color-text-muted)]">Workspace</div>
            <div className="truncate text-lg font-semibold text-[color:var(--color-text)]">{title}</div>
          </div>
        </div>

        {onSearchChange && (
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--color-surface)] px-4 py-2.5">
            <Search size={16} className="text-[color:var(--color-text-muted)]" />
            <input
              className="w-full bg-transparent text-sm text-[color:var(--color-text)] outline-none placeholder:text-[color:var(--color-text-muted)]"
              placeholder="Search problems, sessions, or users"
              value={searchValue ?? ''}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>
        )}

        <div className="ml-auto flex items-center gap-2">
          {actions}
          <button type="button" aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] transition hover:bg-[color:var(--bg-surface-hover)]">
            <Bell size={16} />
          </button>
          {onToggleTheme && (
            <button type="button" aria-label="Toggle theme" onClick={onToggleTheme} className="grid h-10 w-10 place-items-center rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] transition hover:bg-[color:var(--bg-surface-hover)]">
              {theme === 'dark' ? <SunMedium size={16} /> : <MoonStar size={16} />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
