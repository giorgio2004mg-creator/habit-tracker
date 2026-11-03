import { type ReactNode, useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { XIcon } from './icons'
import { IconButton } from './ui'

/** Pannello dal basso su mobile, finestra centrata su desktop. */
export function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  const titleId = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-slate-50 shadow-2xl md:max-w-lg md:rounded-3xl dark:bg-slate-950 dark:ring-1 dark:ring-slate-800"
      >
        <div className="flex items-center justify-between gap-2 px-5 pt-4 pb-2">
          <h2 id={titleId} className="min-w-0 text-lg font-semibold">
            {title}
          </h2>
          <IconButton label="Chiudi" onClick={onClose}>
            <XIcon />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-slate-800">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
