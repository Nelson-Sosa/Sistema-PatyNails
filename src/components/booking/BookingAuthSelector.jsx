import { useState } from 'react'
import { LogIn, UserRound, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/utils/cn'
import Button from '@/components/ui/Button'
import GuestForm from './GuestForm'

/**
 * BookingAuthSelector — ofrece las dos vías de identificación antes de confirmar:
 *   1) Ingresar con mi cuenta
 *   2) Continuar como invitado (formulario de nombre, teléfono y email opcional)
 *
 * @param {Object} props
 * @param {(e: React.MouseEvent) => void} props.onLogin - Navegar al login
 * @param {(values: {name: string, phone: string, email: string}) => void} props.onGuestSubmit
 * @param {boolean} props.guestSubmitting
 */
export default function BookingAuthSelector({ onLogin, onGuestSubmit, guestSubmitting = false }) {
  const [showGuestForm, setShowGuestForm] = useState(false)

  return (
    <div className="space-y-4">
      {/* ── Opción 1: Login ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-brand-border bg-brand-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-pastel">
            <LogIn className="h-5 w-5 text-brand-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-brand-text">Ingresar con mi cuenta</p>
            <p className="mt-0.5 text-xs text-brand-text-muted">
              Accedé para ver tus turnos, reprogramar citas y acumular beneficios automáticamente.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          fullWidth
          className="mt-3"
          onClick={onLogin}
          leftIcon={<LogIn className="h-4 w-4" />}
        >
          Iniciar sesión
        </Button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-brand-border" />
        <span className="text-xs font-medium text-brand-text-muted">o</span>
        <div className="h-px flex-1 bg-brand-border" />
      </div>

      {/* ── Opción 2: Invitado ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-brand-border bg-brand-card p-4">
        <button
          type="button"
          onClick={() => setShowGuestForm((v) => !v)}
          className="flex w-full items-center gap-3 text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-pastel">
            <UserRound className="h-5 w-5 text-brand-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-brand-text">Continuar como invitado</p>
            <p className="mt-0.5 text-xs text-brand-text-muted">
              Solo necesitamos tu nombre y teléfono para confirmar la reserva y enviarte
              información del turno.
            </p>
          </div>
          {showGuestForm ? (
            <ChevronUp className="h-4 w-4 text-brand-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-brand-text-muted" />
          )}
        </button>

        <div className={cn('grid transition-all', showGuestForm ? 'mt-4 grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
          <div className="overflow-hidden">
            {showGuestForm && (
              <GuestForm loading={guestSubmitting} onSubmit={onGuestSubmit} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}