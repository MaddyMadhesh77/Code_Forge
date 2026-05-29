import React from 'react'
import {useTheme} from '../lib/ThemeProvider'

export interface NavbarProps{
  user?: {name: string; avatar?: string}
  onSignOut?: ()=>void
  onSearch?: (q:string)=>void
}

export const Navbar: React.FC<NavbarProps> = ({user, onSignOut, onSearch})=>{
  const {theme, toggle} = useTheme()
  return (
    <header className="w-full bg-surface shadow-sm px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="text-lg font-semibold text-primary">CodeForge</div>
        <input
          aria-label="Search"
          onChange={e=> onSearch?.(e.target.value)}
          placeholder="Search problems, sessions..."
          className="hidden md:block bg-[color:var(--color-surface)] border border-[color:var(--color-muted)] px-3 py-2 rounded-md w-96"
        />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={toggle} aria-label="Toggle theme" className="px-2 py-1 rounded-md">
          {theme==='dark' ? '🌙' : '☀️'}
        </button>
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover"/>
              <span className="hidden sm:inline">{user.name}</span>
              <button onClick={onSignOut} className="text-sm text-muted">Sign out</button>
            </div>
          ) : (
            <a href="/login" className="text-sm text-primary">Sign in</a>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
