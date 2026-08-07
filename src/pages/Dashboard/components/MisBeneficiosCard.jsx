import { useState } from 'react'
import { Gift, Sparkles, ArrowRight, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/routes/routes'
import { cn } from '@/utils/cn'
import ProgressBar from '@/components/ui/ProgressBar'
import { useBenefitsSettings } from '@/hooks/useBenefits'
import {
  getAccumulationLabel,
  getRewardLabel,
  getCondition,
  getClientProgressCount,
} from '@/utils/loyalty'

/**
 * MisBeneficiosCard — tarjeta de progreso de fidelización para clientes.
 * Es 100% configurable: acumulación (visitas/servicios), condición y tipo de
 * recompensa se leen del programa configurado por el administrador.
 */
function MisBeneficiosCard({ totalVisits = 0, totalServices = 0 }) {
  const { data: settings } = useBenefitsSettings()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  if (!settings?.enabled) return null

  const condition = getCondition(settings)
  const counter = getClientProgressCount(settings, { totalVisits, totalServices })
  const unit = getAccumulationLabel(settings)
  const rewardLabel = getRewardLabel(settings)

  const progress = counter > 0 ? counter % condition : 0
  const rewardReady = counter > 0 && progress === 0
  const displayProgress = rewardReady ? condition : progress

  let title = 'Bienvenido a patynails'
  let subtitle = 'Reserva tu primer turno y comienza a disfrutar de todos los beneficios.'

  if (rewardReady) {
    title = '¡Felicidades!'
    subtitle = `Ya tienes ${rewardLabel} disponible.`
  } else if (counter > 0) {
    const remaining = condition - progress
    title = counter >= condition - 2 ? '¡Ya casi llegas!' : '¡Excelente comienzo!'
    subtitle =
      remaining === 1
        ? `Solo te falta 1 ${unit.slice(0, -1)} para desbloquear ${rewardLabel}.`
        : `Solo te faltan ${remaining} ${unit} para desbloquear ${rewardLabel}.`
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-brand-pastel bg-brand-card shadow-sm p-6 transition-all duration-300 hover:border-brand-primary/50">
        {rewardReady && (
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-emerald-500/8 blur-3xl" />
        )}

        <div className="relative space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl',
                rewardReady
                  ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-400/10'
                  : 'bg-gradient-to-br from-rose-500/20 to-violet-500/20'
              )}
            >
              <Gift
                className={cn('h-5 w-5', rewardReady ? 'text-emerald-400' : 'text-rose-400')}
              />
            </span>
            <div>
              <p className="text-sm font-medium text-brand-text">Mis Beneficios</p>
              <p className="text-xs text-brand-text-muted">
                Cada {unit.slice(0, -1)} te acerca a nuevas recompensas.
              </p>
            </div>
          </div>

          {/* Message */}
          <div className="flex items-start gap-2">
            {rewardReady && <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />}
            <div>
              <p
                className={cn(
                  'text-sm font-medium',
                  rewardReady ? 'text-emerald-500' : 'text-brand-text'
                )}
              >
                {title}
              </p>
              <p className="mt-0.5 text-xs text-brand-text-muted">{subtitle}</p>
            </div>
          </div>

          {/* Progress (only when the admin enables it) */}
          {settings.showProgress !== false && (
            <div className="space-y-2.5">
              <ProgressBar value={displayProgress} max={condition} />
              <p className="text-xs text-brand-text-muted">
                {rewardReady ? condition : progress} de {condition} {unit}
              </p>
            </div>
          )}

          {/* Reward badge */}
          {rewardReady && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
              <Gift className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-300">
                {rewardLabel.toUpperCase()} DISPONIBLE
              </span>
            </div>
          )}

          {/* CTA */}
          <div className="pt-1">
            {rewardReady ? (
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 px-4 py-2 text-xs font-medium text-emerald-300 transition-all duration-200 hover:bg-emerald-500/10 active:scale-[0.97]"
              >
                Ver recompensa
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={() => navigate(ROUTES.APPOINTMENTS)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500/90 to-violet-500/90 px-4 py-2 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:from-rose-600 hover:to-violet-600 active:scale-[0.97]"
              >
                Reservar turno
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reward modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-brand-border bg-brand-card p-6 shadow-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-brand-text-muted hover:bg-brand-pastel/30 hover:text-brand-text z-50"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-400/10">
                <Gift className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-brand-text">Recompensa disponible</h2>
                <p className="mt-2 text-sm text-brand-text-muted leading-relaxed">
                  Ya puedes reclamar tu {rewardLabel} en tu próxima visita.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false)
                  navigate(ROUTES.APPOINTMENTS)
                }}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500/90 to-violet-500/90 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-rose-600 hover:to-violet-600 active:scale-[0.97]"
              >
                Reservar turno
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MisBeneficiosCard
