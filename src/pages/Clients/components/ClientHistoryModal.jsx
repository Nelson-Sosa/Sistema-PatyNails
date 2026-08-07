import { useMemo, useState } from 'react'
import { CalendarDays, Clock, DollarSign, Scissors, Gift, Sparkles, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useClientHistory } from '@/hooks/useClients'
import { useClientWorks } from '@/hooks/useWorks'
import { useBenefitsSettings, useRedeemReward } from '@/hooks/useBenefits'
import { useAuth } from '@/hooks/useAuth'
import { APPOINTMENT_STATUS, LOYALTY } from '@/constants/app'
import { formatCurrency, formatPhoneDisplayPY } from '@/utils/formatters'
import {
  getAccumulationLabel,
  getRewardLabel,
  getClientRewardStatus,
  getActiveRewardCount,
  isRewardsExpired,
} from '@/utils/loyalty'
import { cn } from '@/utils/cn'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Modal from '@/components/ui/Modal'
import WorkDetailModal from '@/pages/Works/components/WorkDetailModal'

function getAptDate(apt) {
  if (apt.date?.toDate) return apt.date.toDate()
  if (apt.date?.seconds) return new Date(apt.date.seconds * 1000)
  return new Date(apt.date)
}

function ClientHistoryModal({ isOpen, onClose, client }) {
  const { data: appointments, isLoading } = useClientHistory(client?.id)
  const { data: benefitsSettings } = useBenefitsSettings()
  const redeemMutation = useRedeemReward()
  const { user } = useAuth()
  const [confirmRedeem, setConfirmRedeem] = useState(false)
  const [selectedWork, setSelectedWork] = useState(null)

  const rewardType = benefitsSettings?.benefit?.type ?? LOYALTY.BENEFIT.DISCOUNT
  const rewardLabel = getRewardLabel(benefitsSettings ?? {})
  const accumulationLabel = getAccumulationLabel(benefitsSettings ?? {})
  const rewardStatus = getClientRewardStatus(benefitsSettings ?? {}, client)
  const activeRewards = getActiveRewardCount(benefitsSettings ?? {}, client)
  const expiredRewards = isRewardsExpired(benefitsSettings ?? {}, client)

  const { data: works, isLoading: isLoadingWorks } = useClientWorks(client?.id)

  const metrics = useMemo(() => {
    if (!appointments) {
      return { totalVisits: 0, lastVisit: null, totalSpent: 0 }
    }

    const completed = appointments.filter(
      (apt) => apt.status === APPOINTMENT_STATUS.DONE
    )

    const totalVisits = completed.length
    const totalSpent = completed.reduce((sum, apt) => sum + (Number(apt.price) || 0), 0)
    const lastVisit = completed.length > 0 ? getAptDate(completed[0]) : null

    return { totalVisits, lastVisit, totalSpent }
  }, [appointments])

  if (!isOpen) return null

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={client.name}
        maxWidthClass="max-w-3xl"
      >
        {isLoading || isLoadingWorks ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* ── Client Header ──────────────────────────────────────────── */}
            <div>
              <p className="text-sm text-brand-text-muted">
                {formatPhoneDisplayPY(client.phone || client.whatsapp) || 'Sin teléfono'}
              </p>
            </div>

            {/* ── Metrics Cards ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col items-center gap-2 rounded-xl border border-brand-pastel bg-brand-pastel/10 px-4 py-5">
                <CalendarDays className="h-6 w-6 text-brand-primary" />
                <span className="text-3xl font-bold text-brand-text">{metrics.totalVisits}</span>
                <span className="text-xs text-brand-text-muted">Visitas</span>
              </div>

              <div className="flex flex-col items-center gap-2 rounded-xl border border-brand-pastel bg-brand-pastel/10 px-4 py-5">
                <Clock className="h-6 w-6 text-sky-600" />
                <span className="text-center text-base font-bold text-brand-text">
                  {metrics.lastVisit
                    ? format(metrics.lastVisit, 'dd/MM/yy', { locale: es })
                    : '—'}
                </span>
                <span className="text-xs text-brand-text-muted">Última visita</span>
              </div>

              <div className="flex flex-col items-center gap-2 rounded-xl border border-brand-pastel bg-brand-pastel/10 px-4 py-5">
                <DollarSign className="h-6 w-6 text-brand-success" />
                <span className="text-base font-bold text-brand-success">
                  {metrics.totalSpent > 0 ? formatCurrency(metrics.totalSpent) : '—'}
                </span>
                <span className="text-xs text-brand-text-muted">Total gastado</span>
              </div>
            </div>

            {/* ── Benefits Program ──────────────────────────────────────────── */}
            {benefitsSettings?.enabled && (
              <div className="rounded-xl border border-brand-pastel bg-brand-pastel/20 p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                  <Gift className="h-5 w-5 text-brand-primary" />
                  <h3 className="text-base font-semibold text-brand-text">Programa de Beneficios</h3>
                </div>

                {expiredRewards && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-xs text-amber-700">
                      Las recompensas de este cliente vencieron por no canjearse a tiempo.
                    </p>
                  </div>
                )}

                {activeRewards > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-amber-600" />
                      <span className="text-amber-600 font-medium">
                        {rewardLabel}{activeRewards > 1 ? ' disponibles' : ' disponible'}
                      </span>
                    </div>
                    <p className="text-sm text-brand-text-muted">
                      {activeRewards} {activeRewards > 1 ? 'recompensas' : 'recompensa'} para canjear.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      loading={redeemMutation.isPending}
                      onClick={() => setConfirmRedeem(true)}
                    >
                      <Gift className="h-3.5 w-3.5" />
                      Canjear {rewardLabel}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-brand-text-muted">
                      <span>{rewardStatus.counter} de {rewardStatus.condition} {accumulationLabel}</span>
                      <span className="font-medium text-brand-primary">
                        {rewardStatus.remaining} restantes
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-pastel/50">
                      <div
                        className="h-full rounded-full bg-brand-primary transition-all duration-500"
                        style={{ width: `${rewardStatus.progressPct}%` }}
                      />
                    </div>
                    <p className="text-sm text-brand-text-muted">
                      {rewardStatus.ready
                        ? '¡Listo para recompensa!'
                        : `Faltan ${rewardStatus.remaining} ${rewardStatus.remaining !== 1 ? accumulationLabel : accumulationLabel.slice(0, -1)} para obtener ${rewardLabel}.`
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Service History ────────────────────────────────────────── */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-text-muted">
                Historial de Servicios
              </h3>

              {appointments.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {appointments.map((apt) => {
                    const aptDate = getAptDate(apt)
                    const isActive = apt.status === 'done'
                    return (
                      <div
                        key={apt.id}
                        className={cn(
                          'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-brand-pastel px-4 py-3.5 transition-colors hover:bg-brand-pastel/30',
                          isActive ? 'border-l-brand-success' : 'border-l-brand-pastel'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
                            isActive ? 'bg-brand-success/10' : 'bg-brand-pastel/30'
                          )}>
                            <Scissors className={cn(
                              'h-4 w-4',
                              isActive ? 'text-brand-success' : 'text-brand-text-muted'
                            )} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-brand-text truncate">
                              {apt.serviceName || 'Servicio'}
                            </p>
                            <p className="text-xs text-brand-text-muted">
                              {format(aptDate, "d 'de' MMM, yyyy", { locale: es })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {apt.price != null && (
                            <span className="text-sm font-semibold text-brand-success">
                              {formatCurrency(apt.price)}
                            </span>
                          )}
                          {isActive && (
                            <Badge variant="success" size="sm">Completado</Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-brand-pastel bg-brand-pastel/10">
                  <Scissors className="mb-2 h-6 w-6 text-brand-text-muted" />
                  <p className="text-sm text-brand-text-muted">No tiene turnos registrados</p>
                </div>
              )}
            </div>

            {/* ── Photos & Works History ─────────────────────────────────── */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-text-muted">
                Fotos y Trabajos
              </h3>

              {works && works.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {works.map((work) => {
                    const thumb = work.photos?.[0]?.secureUrl
                    if (!thumb) return null
                    return (
                      <div
                        key={work.id}
                        onClick={() => setSelectedWork(work)}
                        className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-brand-pastel/20"
                      >
                        <img
                          src={thumb}
                          alt={work.title || 'Trabajo'}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        <div className="absolute bottom-0 left-0 right-0 translate-y-4 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                          <p className="truncate text-sm font-medium text-white shadow-sm">
                            {work.title || 'Sin título'}
                          </p>
                          <p className="text-xs text-white/80 shadow-sm">
                            {format(getAptDate({ date: work.createdAt }), "MMM yyyy", { locale: es })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-brand-pastel bg-brand-pastel/10">
                  <Sparkles className="mb-2 h-6 w-6 text-brand-text-muted" />
                  <p className="text-sm text-brand-text-muted">No hay fotos registradas para este cliente</p>
                </div>
              )}
            </div>

            {/* ── Redeem Confirmation ────────────────────────────────────── */}
            <ConfirmDialog
              isOpen={confirmRedeem}
              onClose={() => setConfirmRedeem(false)}
              onConfirm={async () => {
                await redeemMutation.mutateAsync({
                  clientId: client.id,
                  adminUid: user?.uid,
                  type: rewardType,
                })
                setConfirmRedeem(false)
              }}
              title={`Canjear ${rewardLabel}`}
              message={`¿Estás seguro de que deseas canjear ${rewardLabel} para ${client.name}?`}
              confirmLabel="Canjear"
              isLoading={redeemMutation.isPending}
            />

            {/* ── Close ──────────────────────────────────────────────────── */}
            <div className="flex justify-end pt-2 border-t border-brand-pastel">
              <Button variant="ghost" onClick={onClose}>Cerrar historial</Button>
            </div>
          </div>
        )}
      </Modal>

      <WorkDetailModal
        isOpen={!!selectedWork}
        onClose={() => setSelectedWork(null)}
        work={selectedWork}
      />
    </>
  )
}

export default ClientHistoryModal
