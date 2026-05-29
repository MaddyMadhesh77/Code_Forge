import React from 'react'
import { Link } from 'react-router-dom'

export interface SidebarItem{ id:string; label:string; path:string; icon?:React.ReactNode; badge?:string }

export interface SidebarProps{
  items: SidebarItem[]
  collapsed?: boolean
}

export const Sidebar: React.FC<SidebarProps> = ({items, collapsed=false})=>{
  return (
    <aside className={`flex-shrink-0 w-64 ${collapsed? 'hidden md:block': ''} bg-[color:var(--color-surface)] border-r border-[color:var(--color-muted)]/10 h-full`}>
      <nav className="p-4 flex flex-col gap-1">
        {items.map(i=> (
          <Link to={i.path} key={i.id} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-[color:var(--color-primary)]/6">
            <span className="text-xl">{i.icon}</span>
            <span className="font-medium">{i.label}</span>
            {i.badge && <span className="ml-auto text-xs bg-[color:var(--color-accent)]/10 px-2 py-1 rounded">{i.badge}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
