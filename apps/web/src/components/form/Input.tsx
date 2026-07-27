import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>{
  label?: string
  error?: string
}

export const Input: React.FC<InputProps> = ({label, error, ...rest})=>{
  return (
    <label className="flex flex-col text-sm">
      {label && <span className="mb-1 text-[color:var(--color-muted)]">{label}</span>}
      <input className={`h-10 px-3 rounded-md border border-[color:var(--color-muted)]/30 focus:ring-2 focus:ring-[color:var(--color-primary)]`} {...rest} />
      {error && <span className="text-xs text-[color:var(--color-danger)] mt-1">{error}</span>}
    </label>
  )
}

export default Input
