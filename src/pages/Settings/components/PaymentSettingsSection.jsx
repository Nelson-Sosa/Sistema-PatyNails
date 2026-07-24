import { useState } from 'react'
import { Save, ToggleLeft, ToggleRight, Loader } from 'lucide-react'
import { usePaymentSettings, useUpdatePaymentSettings } from '@/hooks/usePaymentSettings'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'

const PERCENTAGE_PRESETS = [25, 50]

/**
 * PaymentSettingsSection
 *
 * Admin form for managing deposit (seña) configuration.
 * Data is saved to Firestore (settings/payments) — independent document.
 */
export default function PaymentSettingsSection() {
  const { data: settings, isLoading } = usePaymentSettings()
  const { mutateAsync: saveSettings, isPending: isSaving } = useUpdatePaymentSettings()

  const [form, setForm] = useState(null)
  const [customPct, setCustomPct] = useState(false)

  // Initialize form from fetched settings (only once)
  if (settings && form === null) {
    const pct = settings.percentage ?? 25
    setForm({ ...settings })
    setCustomPct(!PERCENTAGE_PRESETS.includes(pct))
  }

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }))

  const handleToggleEnabled = () => set('enabled', !form?.enabled)

  const handlePercentagePreset = (pct) => {
    setCustomPct(false)
    set('percentage', pct)
  }

  const handleCustomPercentage = () => {
    setCustomPct(true)
    set('percentage', form?.percentage ?? 25)
  }

  const handleSave = async () => {
    try {
      await saveSettings(form)
      toast.success('Configuración de pagos guardada')
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

    return (
    <div className="space-y-6">
      {/* ── Enable toggle */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-brand-border bg-brand-card p-4">
        <div>
          <p className="text-sm font-semibold text-brand-text">Solicitar seña al reservar</p>
          <p className="mt-0.5 text-xs text-brand-text-muted">
            Cuando está activo, el cliente debe pagar una seña antes de que el turno sea confirmado.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleEnabled}
          className={cn(
            'shrink-0 rounded-xl p-1 transition-colors',
            form.enabled ? 'text-brand-primary' : 'text-brand-text-muted'
          )}
        >
          {form.enabled
            ? <ToggleRight className="h-8 w-8" />
            : <ToggleLeft className="h-8 w-8" />}
        </button>
      </div>

      {/* ── Fields — only shown when enabled */}
      {form.enabled && (
        <>
          {/* Percentage */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-brand-text">Porcentaje de seña</label>
            <div className="flex flex-wrap gap-2">
              {PERCENTAGE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePercentagePreset(p)}
                  className={cn(
                    'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                    !customPct && form.percentage === p
                      ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                      : 'border-brand-border text-brand-text-muted hover:border-brand-primary/30'
                  )}
                >
                  {p}%
                </button>
              ))}
              <button
                type="button"
                onClick={handleCustomPercentage}
                className={cn(
                  'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  customPct
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border-brand-border text-brand-text-muted hover:border-brand-primary/30'
                )}
              >
                Personalizado
              </button>
            </div>
            {customPct && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.percentage}
                  onChange={(e) => set('percentage', Number(e.target.value))}
                  className="h-9 w-24 rounded-lg border border-brand-border bg-brand-bg px-3 text-sm text-brand-text focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
                <span className="text-sm text-brand-text-muted">%</span>
              </div>
            )}
          </div>

          {/* Timeout */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-brand-text">
              Tiempo límite para enviar el comprobante
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={5}
                max={1440}
                value={form.paymentTimeoutMinutes ?? 30}
                onChange={(e) => set('paymentTimeoutMinutes', Number(e.target.value))}
                className="h-9 w-24 rounded-lg border border-brand-border bg-brand-bg px-3 text-sm text-brand-text focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
              <span className="text-sm text-brand-text-muted">minutos</span>
            </div>
            <p className="text-xs text-brand-text-muted">
              El modelo registra <code className="text-brand-primary">expiresAt</code> en el turno. La cancelación automática se activará con Cloud Functions.
            </p>
          </div>

          {/* Bank info */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-brand-text">Datos bancarios</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Nombre del banco"
                value={form.bank ?? ''}
                onChange={(v) => set('bank', v)}
                placeholder="Ej: Ueno, Familiar..."
              />
              <Field
                label="Titular de la cuenta"
                value={form.owner ?? ''}
                onChange={(v) => set('owner', v)}
                placeholder="Nombre completo"
              />
              <Field
                label="Número de cuenta"
                value={form.accountNumber ?? ''}
                onChange={(v) => set('accountNumber', v)}
                placeholder="Ej: 0000-1234567"
              />
              <Field
                label="Alias"
                value={form.accountAlias ?? ''}
                onChange={(v) => set('accountAlias', v)}
                placeholder="Ej: PATYNAILS"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-brand-text">
              Instrucciones para el cliente
            </label>
            <textarea
              rows={3}
              value={form.instructions ?? ''}
              onChange={(e) => set('instructions', e.target.value)}
              placeholder="Ej: Transferí el monto exacto al alias indicado y subí la captura del comprobante..."
              className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text placeholder:text-brand-text-muted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none"
            />
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

// Small input field helper
function Field({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-brand-text-muted">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-brand-border bg-brand-bg px-3 text-sm text-brand-text placeholder:text-brand-text-muted focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
      />
    </div>
  )
}
