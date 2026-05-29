import React from 'react'

type CardProps = React.PropsWithChildren<{
  title?: string;
  loading?: boolean;
  className?: string;
  footer?: React.ReactNode;
}>;

export const Card: React.FC<CardProps> = ({title, loading=false, className='', footer, children})=>{
  return (
    <div className={`bg-[color:var(--color-surface)] rounded-md shadow-sm p-4 ${className}`}>
      {title && <div className="mb-2"><h3 className="text-lg font-medium">{title}</h3></div>}
      <div>{loading ? <div className="animate-pulse h-24 bg-[color:var(--color-bg)]/50 rounded"/> : children}</div>
      {footer && <div className="mt-4 border-t pt-3 text-sm">{footer}</div>}
    </div>
  )
}

export default Card
