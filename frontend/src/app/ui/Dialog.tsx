import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'

/** Diálogo modal (elemento <dialog> nativo: Esc fecha, foco preso no diálogo). */
export function Dialog({
  title,
  open,
  onClose,
  children,
  testId,
  wide,
}: {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
  testId?: string
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? 'dialog--wide' : ''}`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      data-testid={testId}
    >
      {open && (
        <div className="dialog__body">
          <header className="dialog__head">
            <h2>{title}</h2>
            <button type="button" className="icon" onClick={onClose} aria-label="Fechar">
              <X size={16} strokeWidth={1.5} />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  )
}
