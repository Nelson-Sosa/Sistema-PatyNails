import { useState } from 'react'
import { Save, Loader, ToggleLeft, ToggleRight, Trash2, Plus } from 'lucide-react'
import { useBusinessSettings } from '@/hooks/useBusinessSettings'
import { toMinutes } from '@/services/scheduleService'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'

const INTERVAL_OPTIONS = [15, 30, 45, 60]

const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const DAY_LABELS = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

const timeInputClass =
  'h-8 sm:h-9 w-full min-w-0 flex-1 rounded-lg border border-brand-border bg-brand-bg px-2 text-sm text-brand-text focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary lg:min-w-[120px]'

const timeRowClass =
  'flex items-center gap-3 sm:gap-4 2xl:gap-5'

/**
 * Validate a single day schedule against business rules.
 * Returns an error message or null when valid.
 * @param {Object} day - { enabled, blocks }
 * @param {number} interval - configured slot interval in minutes
 * @returns {string|null}
 */
function validateDaySchedule(day, interval) {
  if (!day.enabled) return null
  const blocks = day.blocks || []
  if (blocks.length === 0) return 'Agregá al menos un bloque horario o cerrá el día'

  const seen = new Set()
  const sorted = []

  for (const b of blocks) {
    if (!b.start || !b.end) return 'Completá la hora de inicio y fin de cada bloque'
    const s = toMinutes(b.start)
    const e = toMinutes(b.end)
    if (e <= s) return 'La hora de fin debe ser mayor a la de inicio'
    if (e - s < interval) return `La duración del bloque debe ser de al menos ${interval} minutos`
    const dupKey = `${b.start}-${b.end}`
    if (seen.has(dupKey)) return 'Hay bloques duplicados'
    seen.add(dupKey)
    sorted.push({ s, e })
  }

  sorted.sort((a, b) => a.s - b.s)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].s < sorted[i - 1].e) return 'Los bloques no pueden superponerse'
  }

  return null
}

/**
 * BusinessSettingsSection
 *
 * Admin form for managing business hours (weekly attention blocks), the
 * appointment interval and the minimum appointment duration.
 * Data is saved to Firestore (settings/business).
 */
export default function BusinessSettingsSection() {
  const { settings, isLoading, updateSettings, isUpdating } = useBusinessSettings()
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})

  // Initialize form from fetched settings (only once)
  if (settings && form === null) {
    setForm({ ...settings, weeklySchedule: { ...settings.weeklySchedule } })
  }

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }))

  const setDay = (dayKey, updatedDay) => {
    setForm((prev) => ({
      ...prev,
      weeklySchedule: { ...prev.weeklySchedule, [dayKey]: updatedDay },
    }))
    setErrors((prev) => ({ ...prev, [dayKey]: undefined }))
  }

  const handleSave = async () => {
    if (!form) return

    if (!INTERVAL_OPTIONS.includes(form.slotInterval)) {
      toast.error('El intervalo seleccionado no es válido')
      return
    }

    // Validate every day's blocks before saving
    const newErrors = {}
    for (const dayKey of DAY_KEYS) {
      const err = validateDaySchedule(form.weeklySchedule?.[dayKey], form.slotInterval)
      if (err) newErrors[dayKey] = err
    }
    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      toast.error('Revisá los bloques horarios antes de guardar')
      return
    }

    try {
      await updateSettings({
        slotInterval: form.slotInterval,
        minimumAppointmentDuration: form.minimumAppointmentDuration,
        weeklySchedule: form.weeklySchedule,
      })
      toast.success('Horarios de atención actualizados')
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
      {/* ── Intervalo de agenda + Duración mínima (se mantienen) ───────────── */}
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

      {/* ── Horarios de atención por día ─────────────────────────────────── */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-brand-text">
              Horarios de atención
            </h3>
            <p className="text-xs text-brand-text-muted mt-0.5">
              Definí bloques horarios por cada día. Los días cerrados no permiten reservas.
            </p>
          </div>
          <span className="rounded-full border border-brand-pastel bg-brand-pastel/30 px-2.5 py-1 text-[11px] font-medium text-brand-text-muted">
            7 días
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4">
          {DAY_KEYS.map((dayKey) => (
            <DayScheduleCard
              key={dayKey}
              dayKey={dayKey}
              label={DAY_LABELS[dayKey]}
              day={form.weeklySchedule?.[dayKey] || { enabled: false, blocks: [] }}
              error={errors[dayKey]}
              onChange={setDay}
            />
          ))}
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

/**
 * DayScheduleCard — single day editor with an Abierto/Cerrado switch and a list
 * of time blocks. Fully responsive (stacks gracefully on small screens).
 */
function DayScheduleCard({ dayKey, label, day, error, onChange }) {
  const blocks = day.blocks || []

  const toggleEnabled = () => {
    onChange(dayKey, { ...day, enabled: !day.enabled })
  }

  const updateBlock = (idx, field, val) => {
    const nextBlocks = blocks.map((b, i) => (i === idx ? { ...b, [field]: val } : b))
    onChange(dayKey, { ...day, blocks: nextBlocks })
  }

  const addBlock = () => {
    onChange(dayKey, { ...day, blocks: [...blocks, { start: '', end: '' }] })
  }

  const removeBlock = (idx) => {
    onChange(dayKey, { ...day, blocks: blocks.filter((_, i) => i !== idx) })
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-3 sm:p-4 transition-colors',
        day.enabled
          ? 'border-brand-pastel bg-brand-card'
          : 'border-brand-border bg-brand-bg/50'
      )}
    >
      {/* Day header + switch */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              'h-2 w-2 shrink-0 rounded-full',
              day.enabled ? 'bg-emerald-500' : 'bg-brand-text-muted'
            )}
          />
          <span className="font-medium text-brand-text">{label}</span>
          {day.enabled && blocks.length > 0 && (
            <span className="shrink-0 rounded-full bg-brand-pastel/40 px-1.5 py-0.5 text-[10px] font-medium text-brand-text-muted">
              {blocks.length} {blocks.length === 1 ? 'bloque' : 'bloques'}
            </span>
          )}
          <span
            className={cn(
              'text-[11px] font-medium',
              day.enabled ? 'text-emerald-500' : 'text-brand-text-muted'
            )}
          >
            {day.enabled ? 'Abierto' : 'Cerrado'}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleEnabled}
          aria-label={day.enabled ? `Cerrar ${label}` : `Abrir ${label}`}
          className={cn(
            'shrink-0 transition-colors',
            day.enabled ? 'text-brand-success' : 'text-brand-text-muted'
          )}
        >
          {day.enabled
            ? <ToggleRight className="h-6 w-6 sm:h-7 sm:w-7" />
            : <ToggleLeft className="h-6 w-6 sm:h-7 sm:w-7" />}
        </button>
      </div>

      {/* Blocks (only when open) */}
      {day.enabled && (
        <div className="mt-3 space-y-2">
          {blocks.map((block, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-brand-border bg-brand-bg/40 p-2 sm:p-2.5"
            >
              <p className="mb-1.5 text-[11px] font-medium text-brand-text-muted">
                Bloque {idx + 1}
              </p>
              {/* Labels row — alineados sobre sus inputs */}
              <div className={timeRowClass}>
                <label className="block min-w-0 flex-1 text-[10px] font-medium text-brand-text-muted">
                  Inicio
                </label>
                <span className="invisible w-4 shrink-0 select-none text-center text-sm font-medium text-brand-text-muted" aria-hidden="true">→</span>
                <label className="block min-w-0 flex-1 text-[10px] font-medium text-brand-text-muted">
                  Fin
                </label>
              </div>

              {/* Inputs row — separación uniforme, inputs flexibles */}
              <div className={`mt-1 ${timeRowClass}`}>
                <input
                  type="time"
                  value={block.start}
                  onChange={(e) => updateBlock(idx, 'start', e.target.value)}
                  className={timeInputClass}
                  aria-label="Hora de inicio"
                />
                <span className="w-4 shrink-0 select-none text-center text-sm font-medium text-brand-text-muted" aria-hidden="true">→</span>
                <input
                  type="time"
                  value={block.end}
                  onChange={(e) => updateBlock(idx, 'end', e.target.value)}
                  className={timeInputClass}
                  aria-label="Hora de fin"
                />
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeBlock(idx)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-400 transition-colors hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar bloque
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addBlock}
            className={cn(
              'inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-brand-pastel py-2.5 text-sm font-medium text-brand-primary',
              'transition-colors hover:border-brand-primary/50 hover:bg-brand-primary/5'
            )}
          >
            <Plus className="h-4 w-4" />
            Agregar bloque horario
          </button>
        </div>
      )}

      {/* Inline validation error */}
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
