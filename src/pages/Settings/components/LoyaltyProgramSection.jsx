import { useState } from 'react'
import {
  Save,
  Loader,
  ToggleLeft,
  ToggleRight,
  CalendarCheck,
  Scissors,
  Gift,
  Percent,
  Repeat2,
  Timer,
  Eye,
} from 'lucide-react'
import { useBenefitsSettings, useUpdateBenefitsSettings } from '@/hooks/useBenefits'
import { useServices } from '@/hooks/useServices'
import { LOYALTY } from '@/constants/app'
import { getRewardPhrase } from '@/utils/loyalty'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'

/**
 * LoyaltyProgramSection
 *
 * Admin form for the fully configurable loyalty program
 * (Configuración → Programa de Beneficios).
 *
 * Lets the admin define, without touching code:
 * - Enable/disable the program
 * - Accumulation mode (visits vs completed services)
 * - Condition (quantity) to earn the reward
 * - Reward type (percentage discount vs free service)
 * - Whether the counter resets after each reward
 * - Optional reward validity window
 * - Whether clients see their progress
 */
export default function LoyaltyProgramSection() {
  const { data: settings, isLoading } = useBenefitsSettings()
  const { data: services } = useServices()
  const { mutateAsync: saveSettings, isPending: isSaving } = useUpdateBenefitsSettings()

  const [form, setForm] = useState(null)
  const [customCondition, setCustomCondition] = useState(false)
  const [customPct, setCustomPct] = useState(false)
  const [customValidityDays, setCustomValidityDays] = useState(false)

  // Initialize the form once the settings arrive
  if (settings && form === null) {
    const benefit = settings.benefit ?? {}
    const validity = settings.validity ?? {}
    setForm({
      enabled: settings.enabled ?? true,
      accumulation: settings.accumulation ?? LOYALTY.ACCUMULATION.VISITS,
      condition: settings.condition ?? settings.rewardEveryVisits ?? LOYALTY.DEFAULT_CONDITION,
      benefit: {
        type: benefit.type ?? LOYALTY.BENEFIT.DISCOUNT,
        discountPercent: benefit.discountPercent ?? LOYALTY.DEFAULT_DISCOUNT_PERCENT,
        freeServiceId: benefit.freeServiceId ?? LOYALTY.FREE_SERVICE_ANY,
        freeServiceName: benefit.freeServiceName ?? '',
      },
      repeat: settings.repeat ?? false,
      validity: {
        enabled: validity.enabled ?? false,
        days: validity.days ?? LOYALTY.DEFAULT_VALIDITY_DAYS,
      },
      showProgress: settings.showProgress ?? true,
    })
    setCustomCondition(!LOYALTY.CONDITION_PRESETS.includes(Number(settings.condition ?? settings.rewardEveryVisits ?? 6)))
    setCustomPct(!LOYALTY.DISCOUNT_PRESETS.includes(Number(benefit.discountPercent ?? 20)))
    setCustomValidityDays(!LOYALTY.VALIDITY_PRESETS.includes(Number(validity.days ?? 90)))
  }

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }))
  const setBenefit = (key, val) => setForm((prev) => ({
    ...prev,
    benefit: { ...prev.benefit, [key]: val },
  }))
  const setValidity = (key, val) => setForm((prev) => ({
    ...prev,
    validity: { ...prev.validity, [key]: val },
  }))

  const toggle = (key) => set(key, !form?.[key])

  const handleSave = async () => {
    try {
      await saveSettings(form)
      toast.success('Programa de beneficios guardado')
    } catch {
      toast.error('No se pudo guardar la configuración')
    }
  }

  if (isLoading || form === null) {
    return (
      <div className="flex items-center gap-2 text-brand-text-muted py-6">
        <Loader className="h-4 w-4 animate-spin" />
        <span className="text-sm">Cargando configuración...</span>
      </div>
    )
  }

  const unit = form.accumulation === LOYALTY.ACCUMULATION.SERVICES ? 'servicios' : 'visitas'
  const preview = `Cada ${form.condition} ${unit} obtenés ${getRewardPhrase(form)}`
  const freeServiceSpecific = form.benefit.type === LOYALTY.BENEFIT.FREE_SERVICE
    && form.benefit.freeServiceId
    && form.benefit.freeServiceId !== LOYALTY.FREE_SERVICE_ANY

  return (
    <div className="space-y-6">
      {/* ── Estado del programa ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-card p-4">
        <div>
          <p className="text-sm font-semibold text-brand-text">Programa de beneficios</p>
          <p className="mt-0.5 text-xs text-brand-text-muted">
            {form.enabled
              ? 'Activado: los clientes acumulan y reciben recompensas.'
              : 'Desactivado: no se acumulan visitas ni se muestra información a los clientes.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => toggle('enabled')}
          className={cn(
            'shrink-0 rounded-xl p-1 transition-colors',
            form.enabled ? 'text-brand-primary' : 'text-brand-text-muted'
          )}
          aria-pressed={form.enabled}
        >
          {form.enabled
            ? <ToggleRight className="h-8 w-8" />
            : <ToggleLeft className="h-8 w-8" />}
        </button>
      </div>

      {form.enabled && (
        <>
          {/* ── Vista previa en vivo ─────────────────────────────────────── */}
          <div className="flex items-center gap-3 rounded-xl border border-brand-primary/20 bg-brand-primary/5 px-4 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary/10">
              <Gift className="h-4 w-4 text-brand-primary" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-brand-text">Vista previa del programa</p>
              <p className="text-sm text-brand-text-muted leading-snug">{preview}</p>
            </div>
          </div>

          {/* ── Tipo de acumulación ─────────────────────────────────────── */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-brand-text">
              ¿Cómo se obtienen las recompensas?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <OptionCard
                active={form.accumulation === LOYALTY.ACCUMULATION.VISITS}
                onClick={() => set('accumulation', LOYALTY.ACCUMULATION.VISITS)}
                icon={<CalendarCheck className="h-5 w-5" />}
                title="Por cantidad de visitas"
                description="Cada cita completada suma una visita."
              />
              <OptionCard
                active={form.accumulation === LOYALTY.ACCUMULATION.SERVICES}
                onClick={() => set('accumulation', LOYALTY.ACCUMULATION.SERVICES)}
                icon={<Scissors className="h-5 w-5" />}
                title="Por cantidad de servicios"
                description="Cada servicio realizado suma un servicio."
              />
            </div>
          </div>

          {/* ── Condición numérica ──────────────────────────────────────── */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-brand-text">
              Condición para obtener el beneficio
            </label>
            <p className="text-xs text-brand-text-muted">
              Cantidad necesaria de {unit === 'servicios' ? 'servicios' : 'visitas'} para acceder a la recompensa.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {LOYALTY.CONDITION_PRESETS.map((c) => (
                <PresetButton
                  key={c}
                  active={!customCondition && form.condition === c}
                  onClick={() => { setCustomCondition(false); set('condition', c) }}
                >
                  {c}
                </PresetButton>
              ))}
              <PresetButton
                active={customCondition}
                onClick={() => setCustomCondition(true)}
              >
                Personalizado
              </PresetButton>
              {customCondition && (
                <div className="flex items-center gap-2">
                  <NumberInput
                    value={form.condition}
                    min={1}
                    onChange={(v) => set('condition', v)}
                  />
                  <span className="text-sm text-brand-text-muted">{unit}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Tipo de beneficio ───────────────────────────────────────── */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-brand-text">Tipo de beneficio</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <OptionCard
                active={form.benefit.type === LOYALTY.BENEFIT.DISCOUNT}
                onClick={() => setBenefit('type', LOYALTY.BENEFIT.DISCOUNT)}
                icon={<Percent className="h-5 w-5" />}
                title="Descuento porcentual"
                description="El cliente obtiene un descuento sobre cualquier servicio."
              />
              <OptionCard
                active={form.benefit.type === LOYALTY.BENEFIT.FREE_SERVICE}
                onClick={() => setBenefit('type', LOYALTY.BENEFIT.FREE_SERVICE)}
                icon={<Gift className="h-5 w-5" />}
                title="Servicio gratuito"
                description="El cliente obtiene un servicio sin cargo."
              />
            </div>
          </div>

          {/* ── Configuración del beneficio ─────────────────────────────── */}
          {form.benefit.type === LOYALTY.BENEFIT.DISCOUNT ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-brand-text">
                Porcentaje de descuento
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {LOYALTY.DISCOUNT_PRESETS.map((p) => (
                  <PresetButton
                    key={p}
                    active={!customPct && form.benefit.discountPercent === p}
                    onClick={() => { setCustomPct(false); setBenefit('discountPercent', p) }}
                  >
                    {p}%
                  </PresetButton>
                ))}
                <PresetButton active={customPct} onClick={() => setCustomPct(true)}>
                  Personalizado
                </PresetButton>
                {customPct && (
                  <div className="flex items-center gap-2">
                    <NumberInput
                      value={form.benefit.discountPercent}
                      min={1}
                      max={100}
                      onChange={(v) => setBenefit('discountPercent', v)}
                    />
                    <span className="text-sm text-brand-text-muted">%</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-brand-text">
                Servicio gratuito
              </label>
              <div className="flex flex-wrap gap-2">
                <PresetButton
                  active={form.benefit.freeServiceId === LOYALTY.FREE_SERVICE_ANY}
                  onClick={() => setBenefit('freeServiceId', LOYALTY.FREE_SERVICE_ANY)}
                >
                  Cualquier servicio
                </PresetButton>
                <PresetButton
                  active={freeServiceSpecific}
                  onClick={() => {
                    const first = services?.[0]
                    setBenefit('freeServiceId', first?.id ?? LOYALTY.FREE_SERVICE_ANY)
                    setBenefit('freeServiceName', first?.name ?? '')
                  }}
                >
                  Elegir servicio específico
                </PresetButton>
              </div>
              {freeServiceSpecific && (
                <select
                  value={form.benefit.freeServiceId}
                  onChange={(e) => {
                    const svc = services?.find((s) => s.id === e.target.value)
                    setBenefit('freeServiceId', e.target.value)
                    setBenefit('freeServiceName', svc?.name ?? '')
                  }}
                  className="h-10 w-full max-w-sm rounded-lg border border-brand-border bg-brand-bg px-3 text-sm text-brand-text focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                >
                  {services?.map((svc) => (
                    <option key={svc.id} value={svc.id}>{svc.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* ── Repetición automática ───────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-card p-4">
            <div className="flex items-start gap-3">
              <Repeat2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-text-muted" />
              <div>
                <p className="text-sm font-semibold text-brand-text">Repetir automáticamente</p>
                <p className="mt-0.5 text-xs text-brand-text-muted">
                  {form.repeat
                    ? 'El contador vuelve a cero al entregar la recompensa y comienza de nuevo.'
                    : 'El contador continúa acumulando después de cada recompensa.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle('repeat')}
              className={cn(
                'shrink-0 rounded-xl p-1 transition-colors',
                form.repeat ? 'text-brand-primary' : 'text-brand-text-muted'
              )}
              aria-pressed={form.repeat}
            >
              {form.repeat
                ? <ToggleRight className="h-8 w-8" />
                : <ToggleLeft className="h-8 w-8" />}
            </button>
          </div>

          {/* ── Vigencia ────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Timer className="mt-0.5 h-4 w-4 shrink-0 text-brand-text-muted" />
              <div>
                <label className="block text-sm font-medium text-brand-text">Vigencia (opcional)</label>
                <p className="text-xs text-brand-text-muted">
                  Las recompensas pueden no vencer o caducar después de un período.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <PresetButton
                active={!form.validity.enabled}
                onClick={() => setValidity('enabled', false)}
              >
                Sin vencimiento
              </PresetButton>
              <PresetButton
                active={form.validity.enabled && !customValidityDays}
                onClick={() => { setCustomValidityDays(false); setValidity('enabled', true) }}
              >
                Vencen luego de X días
              </PresetButton>
            </div>
            {form.validity.enabled && (
              <div className="flex flex-wrap items-center gap-2">
                {LOYALTY.VALIDITY_PRESETS.map((d) => (
                  <PresetButton
                    key={d}
                    active={!customValidityDays && form.validity.days === d}
                    onClick={() => { setCustomValidityDays(false); setValidity('days', d) }}
                  >
                    {d} días
                  </PresetButton>
                ))}
                <PresetButton active={customValidityDays} onClick={() => setCustomValidityDays(true)}>
                  Personalizado
                </PresetButton>
                {customValidityDays && (
                  <div className="flex items-center gap-2">
                    <NumberInput
                      value={form.validity.days}
                      min={1}
                      onChange={(v) => setValidity('days', v)}
                    />
                    <span className="text-sm text-brand-text-muted">días</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Mostrar progreso al cliente ─────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-card p-4">
            <div className="flex items-start gap-3">
              <Eye className="mt-0.5 h-4 w-4 shrink-0 text-brand-text-muted" />
              <div>
                <p className="text-sm font-semibold text-brand-text">Mostrar progreso al cliente</p>
                <p className="mt-0.5 text-xs text-brand-text-muted">
                  En el perfil del cliente aparecerá su avance hacia la próxima recompensa.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle('showProgress')}
              className={cn(
                'shrink-0 rounded-xl p-1 transition-colors',
                form.showProgress ? 'text-brand-primary' : 'text-brand-text-muted'
              )}
              aria-pressed={form.showProgress}
            >
              {form.showProgress
                ? <ToggleRight className="h-8 w-8" />
                : <ToggleLeft className="h-8 w-8" />}
            </button>
          </div>
        </>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            'flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors',
            'hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isSaving ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}

/** Selectable option card (used for accumulation type & benefit type). */
function OptionCard({ active, onClick, icon, title, description }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200',
        active
          ? 'border-brand-primary bg-brand-primary/10'
          : 'border-brand-border bg-brand-card hover:border-brand-primary/30 hover:bg-brand-pastel/20'
      )}
    >
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          active ? 'bg-brand-primary/15 text-brand-primary' : 'bg-brand-pastel/40 text-brand-text-muted'
        )}
      >
        {icon}
      </span>
      <span>
        <span className={cn('block text-sm font-medium', active ? 'text-brand-primary' : 'text-brand-text')}>
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-brand-text-muted">{description}</span>
      </span>
    </button>
  )
}

/** Pill-style preset selector button. */
function PresetButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
          : 'border-brand-border text-brand-text-muted hover:border-brand-primary/30'
      )}
    >
      {children}
    </button>
  )
}

/** Small numeric input. */
function NumberInput({ value, min = 1, max, onChange }) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-9 w-24 rounded-lg border border-brand-border bg-brand-bg px-3 text-sm text-brand-text focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
    />
  )
}
