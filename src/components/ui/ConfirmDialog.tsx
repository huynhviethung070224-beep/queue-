import { AlertTriangle } from 'lucide-react'
import { useRef } from 'react'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
  pending?: boolean
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = false,
  onCancel,
  onConfirm,
  pending = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  useDialogFocus(dialogRef, cancelButtonRef, onCancel, pending, open)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/60 p-4">
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <span className="grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-800">
          <AlertTriangle aria-hidden="true" size={22} />
        </span>
        <h2 id="confirm-dialog-title" className="mt-4 text-xl font-bold text-navy-950">
          {title}
        </h2>
        <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-slate-600">
          {description}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelButtonRef} disabled={pending} variant="secondary" onClick={onCancel}>
            Keep current state
          </Button>
          <Button disabled={pending} variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {pending ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  )
}
