import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface SidebarItem {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

export interface SidebarProps {
  items: SidebarItem[];
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ items, collapsed = false, onToggle }: SidebarProps) {
  return (
    <aside className={`sticky top-[4.25rem] hidden h-[calc(100vh-4.25rem)] shrink-0 border-r border-[color:var(--border-subtle)] bg-[color:var(--color-surface)] lg:flex lg:flex-col ${collapsed ? 'w-20' : 'w-72'}`}>
      <nav className="flex-1 space-y-1 p-3" aria-label="Primary navigation">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${isActive ? 'bg-[color:var(--bg-surface-hover)] text-[color:var(--color-text)]' : 'text-[color:var(--color-text-secondary)] hover:bg-[color:var(--bg-surface-hover)] hover:text-[color:var(--color-text)]'} ${collapsed ? 'justify-center' : ''}`}
          >
            <item.icon size={18} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      {onToggle && (
        <div className="border-t border-[color:var(--border-subtle)] p-3">
          <button type="button" onClick={onToggle} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--color-surface)] px-3 py-2 text-sm font-medium text-[color:var(--color-text)] transition hover:bg-[color:var(--bg-surface-hover)]">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
