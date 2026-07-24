import { useState } from 'react'
import { X, Clock, Calendar, Scissors, Camera, Banknote, CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { APPOINTMENT_STATUS, STATUS_CONFIG, PAYMENT_STATUS } from '@/constants/app'
import { useAuth } from '@/context/AuthContext'
import { useApprovePayment, useRejectPayment } from '@/hooks/useAppointments'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/formatters'
import Button from '@/components/ui/Button'
import AddWorkModal from '@/pages/Works/components/AddWorkModal'

function toMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUS.PENDING_PROOF]: { label: 'Pendiente de comprobante', color: 'text-amber-400 bg-amber-500/10' },
  [PAYMENT_STATUS.PROOF_SUBMITTED]: { label: 'Comprobante enviado', color: 'text-blue-400 bg-blue-500/10' },
  [PAYMENT_STATUS.APPROVED]: { label: 'Pago aprobado', color: 'text-emerald-400 bg-emerald-500/10' },
  [PAYMENT_STATUS.REJECTED]: { label: 'Pago rechazado', color: 'text-rose-400 bg-rose-500/10' },
}

export default function AppointmentDrawer({ appointment, isOpen, onClose, onEdit, onStatusChange }) {
  const { user } = useAuth()
  const [addWorkOpen, setAddWorkOpen] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const { mutate: approvePayment, isPending: isApproving } = useApprovePayment()
  const { mutate: rejectPayment, isPending: isRejecting } = useRejectPayment()

  if (!appointment) return null

  const aptDate = appointment.date?.toDate ? appointment.date.toDate() : new Date(appointment.date)
  const startMin = toMinutes(appointment.time)
  const safeDuration = Math.min(Number(appointment.duration) || 60, 720)
  const endMin = startMin + safeDuration
  const endH = Math.floor(endMin / 60)
  const endM = endMin % 60
  const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
  const formattedDate = format(aptDate, "EEEE d 'de' MMMM 'del' yyyy", { locale: es })

  const pmt = appointment.payment
  const hasPayment = pmt?.enabled
  const paymentStatusInfo = hasPayment ? PAYMENT_STATUS_LABELS[pmt.status] : null
  const canApproveOrReject = hasPayment && pmt.status === PAYMENT_STATUS.PROOF_SUBMITTED

  const handleApprove = () => {
    approvePayment({ id: appointment.id, adminUid: user?.uid }, {
      onSuccess: () => {
        toast.success('Pago aprobado. El turno fue confirmado.')
        setShowRejectInput(false)
      },
      onError: () => toast.error('No se pudo aprobar el pago'),
    })
  }

  const handleReject = () => {
    if (!rejectReason.trim()) {
      toast.error('Escribí un motivo para el rechazo')
      return
    }
    rejectPayment({ id: appointment.id, adminUid: user?.uid, reason: rejectReason }, {
      onSuccess: () => {
        toast.success('Pago rechazado.')
        setShowRejectInput(false)
        setRejectReason('')
      },
      onError: () => toast.error('No se pudo rechazar el pago'),
    })
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      )}
      <div className={cn(
        'fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-brand-card border-l border-brand-border shadow-2xl transform transition-transform duration-300 flex flex-col',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-border px-4 py-3 shrink-0">
          <h2 className="text-lg font-bold text-brand-text truncate">{appointment.clientName}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-brand-text-muted hover:bg-brand-pastel/30 hover:text-brand-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Status selector */}
          <div>
            <label className="block text-xs font-medium text-brand-text-muted uppercase tracking-wider mb-1.5">
              Estado del turno
            </label>
            <select
              value={appointment.status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-brand-border bg-brand-bg px-3 text-sm text-brand-text focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
            >
              {Object.keys(STATUS_CONFIG).map((status) => (
                <option key={status} value={status}>
                  {STATUS_CONFIG[status]?.label || status}
                </option>
              ))}
            </select>
          </div>

          {/* Service */}
          <div className="flex items-start gap-3">
            <Scissors className="h-4 w-4 mt-0.5 text-brand-text-muted shrink-0" />
            <div>
              <p className="text-sm font-medium text-brand-text">{appointment.serviceName}</p>
              <p className="text-xs text-brand-text-muted mt-px">Duración: {formatDuration(safeDuration)}</p>
            </div>
          </div>

          {/* Date */}
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 mt-0.5 text-brand-text-muted shrink-0" />
            <p className="text-sm text-brand-text capitalize">{formattedDate}</p>
          </div>

          {/* Time */}
          <div className="flex items-start gap-3">
            <Clock className="h-4 w-4 mt-0.5 text-brand-text-muted shrink-0" />
            <div>
              <p className="text-sm text-brand-text">{appointment.time} → {endTimeStr}</p>
            </div>
          </div>

          {/* ── Payment Section (only when seña enabled) */}
          {hasPayment && (
            <div className="rounded-xl border border-brand-border bg-brand-bg overflow-hidden">
              {/* Section header */}
              <div className="flex items-center gap-2 border-b border-brand-border px-3 py-2.5 bg-brand-card">
                <Banknote className="h-4 w-4 text-brand-primary shrink-0" />
                <p className="text-xs font-semibold text-brand-text uppercase tracking-wider">Pago de seña</p>
              </div>

              <div className="p-3 space-y-3">
                {/* Payment amounts */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-brand-text-muted">Servicio</p>
                    <p className="text-sm font-medium text-brand-text">{formatCurrency(appointment.price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-text-muted">Porcentaje</p>
                    <p className="text-sm font-medium text-brand-text">{pmt.percentage}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-brand-text-muted">Seña</p>
                    <p className="text-sm font-semibold text-amber-400">{formatCurrency(pmt.amount)}</p>
                  </div>
                </div>

                {/* Payment status badge */}
                {paymentStatusInfo && (
                  <div className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', paymentStatusInfo.color)}>
                    {paymentStatusInfo.label}
                  </div>
                )}

                {/* Rejection reason */}
                {pmt.status === PAYMENT_STATUS.REJECTED && pmt.rejectionReason && (
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2">
                    <p className="text-xs text-rose-400">
                      <span className="font-medium">Motivo:</span> {pmt.rejectionReason}
                    </p>
                  </div>
                )}

                {/* Proof image or link */}
                {pmt.proof?.secureUrl && (
                  <div className="space-y-1.5">
                    <img
                      src={pmt.proof.secureUrl}
                      alt="Comprobante de pago"
                      className="w-full max-h-40 rounded-lg object-cover border border-brand-border cursor-pointer"
                      onClick={() => window.open(pmt.proof.secureUrl, '_blank')}
                    />
                    <a
                      href={pmt.proof.secureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-brand-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ver en tamaño completo
                    </a>
                  </div>
                )}

                {/* Admin actions — only when proof is submitted and not yet reviewed */}
                {canApproveOrReject && (
                  <div className="space-y-2 pt-1">
                    {/* Approve */}
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={isApproving || isRejecting}
                      className={cn(
                        'flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-400 transition-colors',
                        'hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      <CheckCircle className="h-4 w-4" />
                      {isApproving ? 'Aprobando...' : 'Aprobar pago'}
                    </button>

                    {/* Reject toggle */}
                    {!showRejectInput ? (
                      <button
                        type="button"
                        onClick={() => setShowRejectInput(true)}
                        disabled={isApproving || isRejecting}
                        className={cn(
                          'flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-400 transition-colors',
                          'hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        <XCircle className="h-4 w-4" />
                        Rechazar pago
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Motivo del rechazo (requerido)..."
                          rows={2}
                          className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-muted focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/30 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setShowRejectInput(false); setRejectReason('') }}
                            className="flex-1 rounded-lg border border-brand-border py-1.5 text-xs text-brand-text-muted hover:bg-brand-pastel/20 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleReject}
                            disabled={isRejecting || !rejectReason.trim()}
                            className={cn(
                              'flex-1 rounded-lg border border-rose-500/30 bg-rose-500/10 py-1.5 text-xs font-medium text-rose-400 transition-colors',
                              'hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                          >
                            {isRejecting ? 'Rechazando...' : 'Confirmar rechazo'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Already approved/rejected notice */}
                {pmt.status === PAYMENT_STATUS.APPROVED && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Pago aprobado. Turno confirmado automáticamente.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-brand-border px-4 py-3 flex flex-col gap-2 shrink-0">
          {appointment.status === APPOINTMENT_STATUS.DONE && (
            <Button
              variant="secondary"
              onClick={() => setAddWorkOpen(true)}
              className="w-full"
              leftIcon={<Camera className="h-4 w-4" />}
            >
              Agregar trabajo
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cerrar
            </Button>
            <Button onClick={onEdit} className="flex-1">
              Editar
            </Button>
          </div>
        </div>
      </div>

      {/* AddWork Modal */}
      {addWorkOpen && (
        <AddWorkModal
          isOpen={addWorkOpen}
          onClose={() => setAddWorkOpen(false)}
          appointment={appointment}
        />
      )}
    </>
  )
}
