import { AlertTriangle, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Z_INDEX } from '@/constants/zIndex'

function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel, isLoading }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: Z_INDEX.MODAL }}>
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex flex-col w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl max-w-[95vw] max-h-[90dvh] overflow-hidden">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="overflow-y-auto p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              <p className="mt-1 text-sm text-slate-400">{message}</p>
            </div>

            <div className="mt-2 flex w-full gap-3">
              <Button variant="ghost" className="flex-1" onClick={onClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button variant="danger" className="flex-1" onClick={onConfirm} loading={isLoading}>
                {confirmLabel || 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
