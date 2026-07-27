import React from 'react'

type PageContainerProps = React.PropsWithChildren<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}>;

export const PageContainer: React.FC<PageContainerProps> = ({title, subtitle, actions, children})=>{
  return (
    <div className="flex-1 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-[color:var(--color-muted)]">{subtitle}</p>}
        </div>
        <div>{actions}</div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

export default PageContainer
