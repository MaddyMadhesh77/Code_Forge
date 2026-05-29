import React from 'react'

type ModalProps = React.PropsWithChildren<{
  open: boolean;
  title?: string;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg';
}>;

export const Modal: React.FC<ModalProps> = ({open, title, onClose, children})=>{
  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`bg-[color:var(--color-surface)] rounded-md shadow-lg z-10 p-4 w-[min(90%,900px)]` } role="dialog" aria-modal>
        {title && <div className="mb-3"><h2 className="text-lg font-semibold">{title}</h2></div>}
        <div>{children}</div>
      </div>
    </div>
  )
}

export default Modal
