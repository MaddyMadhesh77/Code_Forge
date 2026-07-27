import React from 'react'

export type ButtonVariant = 'primary'|'secondary'|'ghost'|'danger'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>{
  variant?: ButtonVariant
  loading?: boolean
}

export const Button: React.FC<ButtonProps> = ({variant='primary', loading=false, children, className, ...rest})=>{
  const base = 'inline-flex items-center justify-center h-10 px-4 rounded-md font-medium'
  const variantClass = {
    primary: 'bg-[color:var(--color-primary)] text-white',
    secondary: 'border border-[color:var(--color-muted)] text-[color:var(--color-muted)] bg-transparent',
    ghost: 'bg-transparent text-[color:var(--color-primary)]',
    danger: 'bg-[color:var(--color-danger)] text-white'
  }[variant]

  return (
    <button className={`${base} ${variantClass} ${className||''}`} disabled={rest.disabled || loading} {...rest}>
      {loading ? 'Loading...' : children}
    </button>
  )
}

export default Button
