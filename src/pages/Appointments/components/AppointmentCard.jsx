import { Clock, User, Scissors, Edit2, UserRound, UserCheck, Phone } from 'lucide-react'
import { formatCurrency } from '@/utils/formatters'
import { PAYMENT_STATUS } from '@/constants/app'
import AppointmentStatusMenu from './AppointmentStatusMenu'
import { cn } from '@/utils/cn'

const PAYMENT_CHIP = {
  [PAYMENT_STATUS.PENDING_PROOF]: 'bg-amber-500/10 text-amber-500',
  [PAYMENT_STATUS.PROOF_SUBMITTED]: 'bg-blue-500/10 text-blue-500',
  [PAYMENT_STATUS.APPROVED]: 'bg-emerald-500/10 text-emerald-500',
  [PAYMENT_STATUS.REJECTED]: 'bg-rose-500/10 text-rose-500',
}

const PAYMENT_LABEL = {
  [PAYMENT_STATUS.PENDING_PROOF]: 'Seña pendiente',
  [PAYMENT_STATUS.PROOF_SUBMITTED]: 'Comprobante enviado',
  [PAYMENT_STATUS.APPROVED]: 'Seña aprobada',
  [PAYMENT_STATUS.REJECTED]: 'Seña rechazada',
}

function AppointmentCard({ appointment, onStatusChange, currentPrice, onEdit }) {
  const isGuest = appointment.isGuest === true
  const payment = appointment.payment

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-brand-border bg-brand-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Time & Basics */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center justify-center rounded-lg bg-brand-pastel/50 px-4 py-2">
          <Clock className="mb-1 h-4 w-4 text-brand-primary" />
          <span className="font-bold text-brand-text">{appointment.time}</span>
        </div>
        
        <div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-brand-text-muted" />
            <span className="font-medium text-brand-text">{appointment.clientName}</span>

            {/* Registered / Guest indicator */}
            {isGuest ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                <UserRound className="h-3 w-3" />
                Invitado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                <UserCheck className="h-3 w-3" />
                Registrado
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2 text-sm text-brand-text-muted">
            <Scissors className="h-3.5 w-3.5" />
            <span>{appointment.serviceName}</span>
          </div>

          {appointment.clientPhone && (
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-brand-text-muted">
              <Phone className="h-3 w-3" />
              <span>{appointment.clientPhone}</span>
            </div>
          )}

          {payment?.enabled && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                PAYMENT_CHIP[payment.status] || 'bg-slate-500/10 text-slate-500'
              )}>
                {PAYMENT_LABEL[payment.status] || 'Pago'}
              </span>
              {payment.amount > 0 && (
                <span className="text-[10px] text-brand-text-muted">
                  Seña: {formatCurrency(payment.amount)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Details & Actions */}
      <div className="flex items-center justify-between sm:gap-6">
        <div className="text-right">
          <p className="font-medium text-emerald-400">{formatCurrency(currentPrice ?? appointment.price)}</p>
          <p className="text-xs text-brand-text-muted">{appointment.duration} min</p>
        </div>

        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(appointment)}
              className="rounded-lg p-2 text-brand-text-muted hover:bg-brand-pastel/30 hover:text-brand-text transition-colors"
              title="Editar turno"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
          <AppointmentStatusMenu 
            currentStatus={appointment.status} 
            onChange={onStatusChange} 
          />
        </div>
      </div>
    </div>
  )
}

export default AppointmentCard