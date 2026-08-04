import { Sparkles, UserRoundCheck, LogOut } from 'lucide-react'
import { formatCurrency } from '@/utils/formatters'
import Button from '@/components/ui/Button'
import BookingAuthSelector from './BookingAuthSelector'

/**
 * Render a summary row (label + value) for the checkout.
 */
function Row({ label, value, accent = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-brand-text-muted">{label}</span>
      <span className={accent ? 'text-sm font-semibold text-amber-400' : 'text-sm font-medium text-brand-text'}>
        {value}
      </span>
    </div>
  )
}

/**
 * BookingCheckout — pantalla de identificación + resumen del turno.
 *
 * STEP: se muestra justo antes de confirmar el turno y antes del pago de la seña,
 * con el título "Todavía falta un paso para confirmar tu turno".
 *
 * - Si el usuario está autenticado → muestra los datos del perfil y un botón continuar.
 * - Si no → ofrece login o continuar como invitado (formulario).
 *
 * @param {Object} props
 * @param {Object} props.service - Servicio seleccionado
 * @param {string} props.dateLabel - Fecha formateada (ej: "Martes 12 de agosto")
 * @param {string} props.dateStr   - Fecha en formato yyyy-MM-dd
 * @param {string} props.time
 * @param {boolean} props.paymentEnabled
 * @param {number} props.depositAmount
 * @param {boolean} props.isAuthenticated
 * @param {boolean} props.authLoading
 * @param {string|null} props.userName
 * @param {string|null} props.userEmail
 * @param {string|null} props.userPhone
 * @param {() => void} props.onLogin
 * @param {() => void} props.onLogout
 * @param {() => void} props.onBack
 * @param {(values: {name: string, phone: string, email: string}) => void} props.onGuestSubmit
 * @param {() => void} props.onContinue
 * @param {boolean} props.guestSubmitting
 */
export default function BookingCheckout({
  service,
  dateLabel,
  time,
  paymentEnabled,
  depositAmount,
  isAuthenticated,
  authLoading,
  userName,
  userEmail,
  userPhone,
  onLogin,
  onLogout,
  onBack,
  onGuestSubmit,
  onContinue,
  guestSubmitting = false,
}) {
  const duration = service?.duration || 60
  const durationLabel =
    duration >= 60
      ? `${Math.floor(duration / 60)}h${duration % 60 ? ` ${duration % 60}m` : ''}`
      : `${duration} min`

  return (
    <div className="flex flex-col gap-5">
      {/* Heading */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
          <Sparkles className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-brand-text">
            Todavía falta un paso para confirmar tu turno
          </h2>
          <p className="mt-0.5 text-xs text-brand-text-muted">
            Revisá el resumen y confirmá quién realiza la reserva.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-brand-border bg-brand-card p-4 space-y-3">
        <p className="text-xs font-semibold text-brand-text-muted uppercase tracking-wider">
          Resumen de tu turno
        </p>
        <Row label="Servicio seleccionado" value={service.name} />
        <Row label="Fecha" value={dateLabel} />
        <Row label="Hora" value={`${time} hs`} />
        <Row label="Duración" value={durationLabel} />
        <Row label="Precio" value={formatCurrency(service.price)} />
        {paymentEnabled && depositAmount > 0 && (
          <Row label="Seña (a pagar)" value={formatCurrency(depositAmount)} accent />
        )}
      </div>

      {/* Identity control */}
      {authLoading ? (
        <div className="py-6 text-center text-sm text-brand-text-muted">Cargando…</div>
      ) : isAuthenticated ? (
        <div className="rounded-xl border border-brand-border bg-brand-card p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
              <UserRoundCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-brand-text">
                Reservás como {userName || 'cliente'}
              </p>
              <p className="text-xs text-brand-text-muted">
                {[userEmail, userPhone].filter(Boolean).join(' · ') || 'Cuenta registrada'}
              </p>
            </div>
          </div>

          {userPhone && (
            <p className="text-xs text-brand-text-muted">
              Registramos tu turno automáticamente para que puedas verlo en “Mis Turnos”.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={onLogout} leftIcon={<LogOut className="h-4 w-4" />}>
              Usar otra cuenta
            </Button>
            <Button onClick={onContinue} className="flex-1">
              Continuar
            </Button>
          </div>
        </div>
      ) : (
        <BookingAuthSelector
          onLogin={onLogin}
          onGuestSubmit={onGuestSubmit}
          guestSubmitting={guestSubmitting}
        />
      )}

      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm font-medium text-brand-text-muted hover:text-brand-text transition-colors"
      >
        ← Volver a elegir horario
      </button>
    </div>
  )
}