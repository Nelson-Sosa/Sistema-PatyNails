import { useState } from 'react'
import { Save, Loader, Clock } from 'lucide-react'
import { useBusinessSettings } from '@/hooks/useBusinessSettings'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'

const INTERVAL_OPTIONS = [15, 30, 45, 60]

/**
 * BusinessSettingsSection
 *
 * Admin form for managing business hours and appointment intervals.
 * Data is saved to Firestore (settings/business).
 */
export default function BusinessSettingsSection() {
  const { settings, isLoading, updateSettings, isUpdating } = useBusinessSettings()
  const [form, setForm] = useState(null)

  // Initialize form from fetched settings
  if (settings && form === null) {
    setForm({ ...settings })
  }

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }))

  const handleSave = async () => {
    // Validation
    const [openH, openM] = form.openingTime.split(':').map(Number)
    const [closeH, closeM] = form.closingTime.split(':').map(Number)
    const openMin = openH * 60 + openM
    const closeMin = closeH * 60 + closeM

    if (openMin >= closeMin) {
      toast.error('La hora de apertura debe ser menor a la de cierre')
      return
    }

    if (!INTERVAL_OPTIONS.includes(form.slotInterval)) {
      toast.error('El intervalo seleccionado no es válido')
      return
    }

    try {
      await updateSettings(form)
      toast.success('Horarios del negocio actualizados')
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Opening Time */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-brand-text">
            Horario de apertura
          </label>
          <input
            type="time"
            value={form.openingTime}
            onChange={(e) => set('openingTime', e.target.value)}
            className="w-full h-10 rounded-lg border border-brand-border bg-brand-bg px-3 text-sm text-brand-text focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>

        {/* Closing Time */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-brand-text">
            Horario de cierre
          </label>
          <input
            type="time"
            value={form.closingTime}
            onChange={(e) => set('closingTime', e.target.value)}
            className="w-full h-10 rounded-lg border border-brand-border bg-brand-bg px-3 text-sm text-brand-text focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Slot Interval */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-brand-text">
            Intervalo de agenda
          </label>
          <select
            value={form.slotInterval}
            onChange={(e) => set('slotInterval', Number(e.target.value))}
            className="w-full h-10 rounded-lg border border-brand-border bg-brand-bg px-3 text-sm text-brand-text focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          >
            {INTERVAL_OPTIONS.map(opt => (
              <option key={opt} value={opt}>
                {opt} minutos
              </option>
            ))}
          </select>
          <p className="text-xs text-brand-text-muted mt-1">
            Cada cuánto tiempo se pueden agendar turnos.
          </p>
        </div>

        {/* Minimum Duration */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-brand-text">
            Duración mínima (minutos)
          </label>
          <input
            type="number"
            min={15}
            step={15}
            value={form.minimumAppointmentDuration}
            onChange={(e) => set('minimumAppointmentDuration', Number(e.target.value))}
            className="w-full h-10 rounded-lg border border-brand-border bg-brand-bg px-3 text-sm text-brand-text focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
      </div>

      {/* Info Notice */}
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
        <p className="text-sm font-semibold text-sky-500 mb-2">
          ℹ️ Los horarios de atención afectan automáticamente:
        </p>
        <ul className="list-disc list-inside text-xs text-brand-text-muted space-y-1">
          <li>Reservas online</li>
          <li>Agenda administrativa</li>
          <li>Disponibilidad de clientes</li>
          <li>Validaciones de turnos</li>
        </ul>
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isUpdating}
          className={cn(
            'flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors',
            'hover:bg-brand-primary-hover disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isUpdating ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isUpdating ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
