import { useMemo } from 'react'
import { Trophy, Users, Gift, Percent, Scissors, Sparkles, TrendingUp } from 'lucide-react'
import { useBenefitsSettings, useLoyaltyStats } from '@/hooks/useBenefits'
import { useClients } from '@/hooks/useClients'
import {
  getAccumulationLabel,
  getRewardLabel,
  getClientProgressCount,
  getCondition,
} from '@/utils/loyalty'
import { cn } from '@/utils/cn'

/**
 * LoyaltyAdminPanel — panel del administrador para el programa de fidelización.
 *
 * Muestra:
 * - Recompensas otorgadas (totales, descuentos, servicios gratuitos, canjes)
 * - Clientes con más visitas/servicios acumulados
 * - Próximos clientes que están por recibir un beneficio
 */
export default function LoyaltyAdminPanel() {
  const { data: settings } = useBenefitsSettings()
  const { data: clients } = useClients()
  const { data: stats } = useLoyaltyStats()

  const condition = getCondition(settings ?? {})
  const unit = getAccumulationLabel(settings ?? {})
  const rewardLabel = getRewardLabel(settings ?? {})

  const ranked = useMemo(() => {
    if (!clients) return []
    return clients
      .map((c) => ({
        ...c,
        progress: getClientProgressCount(settings ?? {}, c),
      }))
      .sort((a, b) => b.progress - a.progress)
  }, [clients, settings])

  const topClients = ranked.slice(0, 5)

  const upcoming = useMemo(() => {
    if (!clients) return []
    return clients
      .map((c) => {
        const progress = getClientProgressCount(settings ?? {}, c)
        const threshold = Number(c.nextRewardAt ?? condition)
        const remaining = threshold - progress
        return { ...c, progress, remaining, pct: Math.min(Math.round((progress / threshold) * 100), 100) }
      })
      .filter((c) => c.remaining > 0 && c.remaining <= 2)
      .sort((a, b) => a.remaining - b.remaining || b.pct - a.pct)
      .slice(0, 5)
  }, [clients, settings, condition])

  if (!settings?.enabled) return null

  const statCards = [
    { label: 'Recompensas otorgadas', value: stats?.totalGranted ?? 0, icon: Gift, color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
    { label: 'Descuentos otorgados', value: stats?.discountsGranted ?? 0, icon: Percent, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Servicios gratuitos', value: stats?.freeServicesGranted ?? 0, icon: Scissors, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Recompensas canjeadas', value: stats?.redemptions ?? 0, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ]

  return (
    <section className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/10">
          <Trophy className="h-4 w-4 text-brand-primary" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-brand-text">Programa de Fidelización</h2>
          <p className="text-xs text-brand-text-muted">
            Cada {condition} {unit} → {rewardLabel}
          </p>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-2xl border border-brand-pastel bg-brand-card p-4 shadow-sm shadow-brand-text/5 transition-all duration-200 hover:border-brand-primary/50 hover:shadow-brand-text/10"
          >
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', bg)}>
              <Icon className={cn('h-4 w-4', color)} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-brand-text sm:text-xl">{value}</p>
              <p className="truncate text-[11px] text-brand-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Clientes con más acumulación ─────────────────────────────── */}
        <div className="rounded-2xl border border-brand-pastel bg-brand-card p-4 sm:p-5 shadow-sm shadow-brand-text/5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-primary" />
            <h3 className="text-sm font-semibold text-brand-text">Clientes con más {unit}</h3>
          </div>

          {topClients.length === 0 ? (
            <p className="py-6 text-center text-sm text-brand-text-muted">
              Todavía no hay clientes con {unit} acumuladas.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {topClients.map((c, i) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-pastel/40 text-xs font-semibold text-brand-text-muted">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-text">
                    {c.name}
                  </span>
                  <span className="rounded-lg bg-brand-pastel/30 px-2 py-1 text-xs font-semibold text-brand-primary">
                    {c.progress} {unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Próximos a recibir beneficio ─────────────────────────────── */}
        <div className="rounded-2xl border border-brand-pastel bg-brand-card p-4 sm:p-5 shadow-sm shadow-brand-text/5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-brand-text">Próximos a recibir su beneficio</h3>
          </div>

          {upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-brand-text-muted">
              Ningún cliente está cerca de alcanzar su recompensa.
            </p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-text">
                    {c.name}
                  </span>
                  <div className="w-24">
                    <div className="h-1.5 overflow-hidden rounded-full bg-brand-pastel/50">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-brand-text-muted">
                    faltan {c.remaining}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
