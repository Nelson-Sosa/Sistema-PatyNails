import { useState, useEffect, useMemo } from 'react'
import { X, ChevronLeft, Check, Clock, Banknote, Info } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { useServices } from '@/hooks/useServices'
import { useActiveCategories } from '@/hooks/useServiceCategories'
import { useCreateAppointment } from '@/hooks/useAppointments'
import { usePaymentSettings } from '@/hooks/usePaymentSettings'
import { checkAppointmentConflict } from '@/services/appointments/appointmentsService'
import { BUSINESS_HOURS, USER_ROLES, PAYMENT_PROVIDERS } from '@/constants/app'
import { validateAppointmentDateTime } from '@/utils/dateValidation'
import { formatCurrency } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import TimeSelect from '@/components/ui/TimeSelect'
import PaymentProofUploader from './PaymentProofUploader'

const SCHEMA_STEP2 = z.object({
  date: z.string().min(1, 'Seleccioná una fecha'),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Hora inválida (HH:mm)'),
}).superRefine((data, ctx) => {
  if (!data.date || !data.time) return
  const [year, month, day] = data.date.split('-').map(Number)
  const [hours, minutes] = data.time.split(':').map(Number)
  const appointmentTime = new Date(year, month - 1, day, hours, minutes, 0)

  if (!BUSINESS_HOURS.DAYS.includes(appointmentTime.getDay())) {
    ctx.addIssue({ path: ['date'], code: z.ZodIssueCode.custom, message: 'El salón no atiende este día' })
  }
  if (data.time < BUSINESS_HOURS.START || data.time > BUSINESS_HOURS.END) {
    ctx.addIssue({ path: ['time'], code: z.ZodIssueCode.custom, message: `El horario de atención es de ${BUSINESS_HOURS.START} a ${BUSINESS_HOURS.END}` })
  }
  const minAllowedTime = new Date(Date.now() + 2 * 60 * 60 * 1000)
  if (appointmentTime < minAllowedTime) {
    ctx.addIssue({ path: ['time'], code: z.ZodIssueCode.custom, message: 'Debe ser con al menos 2 hs de anticipación' })
  }
})

const STEPS = { CATEGORY: 0, SERVICE: 1, DETAILS: 2, PAYMENT: 3 }

function UserBookingModal({ isOpen, onClose, defaultServiceId = null }) {
  const { userProfile, user, role } = useAuth()
  const { data: services, isLoading: loadingServices } = useServices()
  const { data: categories } = useActiveCategories()
  const { mutateAsync: createAppointment, isPending } = useCreateAppointment()
  const { data: paymentSettings } = usePaymentSettings()

  const [step, setStep] = useState(STEPS.DETAILS)
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [selectedServiceId, setSelectedServiceId] = useState(defaultServiceId)
  const [uploadedProof, setUploadedProof] = useState(null) // { publicId, secureUrl }

  const availableCategories = categories?.filter((c) =>
    services?.some((s) => s.categoryId === c.id && s.active !== false)
  ) || []

  const servicesByCategory = useMemo(() => {
    if (!services || !selectedCategoryId) return []
    return services.filter((s) => s.categoryId === selectedCategoryId && s.active !== false)
  }, [services, selectedCategoryId])

  const selectedService = useMemo(() => {
    if (!services) return null
    return services.find((s) => s.id === selectedServiceId) || null
  }, [services, selectedServiceId])

  // Is payment (seña) required?
  const paymentEnabled = !!paymentSettings?.enabled

  // Calculate the deposit amount
  const depositAmount = useMemo(() => {
    if (!selectedService || !paymentEnabled) return 0
    const pct = paymentSettings?.percentage ?? 25
    return Math.round((selectedService.price * pct) / 100)
  }, [selectedService, paymentEnabled, paymentSettings?.percentage])

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, control } = useForm({
    resolver: zodResolver(SCHEMA_STEP2),
    defaultValues: { date: '', time: '10:00' }
  })

  useEffect(() => {
    if (!isOpen) return
    setUploadedProof(null)
    if (defaultServiceId) {
      setStep(STEPS.DETAILS)
      setSelectedServiceId(defaultServiceId)
      reset({ date: '', time: '10:00' })
    } else if (availableCategories.length === 0) {
      setStep(STEPS.SERVICE)
      setSelectedCategoryId(null)
      setSelectedServiceId(null)
      reset({ date: '', time: '10:00' })
    } else {
      setStep(STEPS.CATEGORY)
      setSelectedCategoryId(null)
      setSelectedServiceId(null)
      reset({ date: '', time: '10:00' })
    }
  }, [isOpen, defaultServiceId])

  useEffect(() => {
    if (defaultServiceId) {
      setValue('date', '')
      setValue('time', '10:00')
    }
  }, [defaultServiceId, setValue])

  // Called after date/time validation — either goes to payment step or submits
  const handleDetailsSubmit = async (data) => {
    if (!selectedService || !userProfile) {
      toast.error('Error al obtener datos')
      return
    }

    const dateValidation = validateAppointmentDateTime(data.date, data.time, role)
    if (!dateValidation.valid) {
      toast.error(dateValidation.message)
      return
    }

    const [year, month, day] = data.date.split('-').map(Number)
    const appointmentDate = new Date(year, month - 1, day, 12, 0, 0)

    const hasConflict = await checkAppointmentConflict(appointmentDate, data.time, selectedService.duration)
    if (hasConflict) {
      toast.error('Ese horario ya está ocupado. Elegí otro horario disponible.')
      return
    }

    if (paymentEnabled) {
      setStep(STEPS.PAYMENT)
    } else {
      await submitAppointment(data)
    }
  }

  // Final submission — always after payment step if enabled
  const submitAppointment = async (formData) => {
    try {
      const [year, month, day] = formData.date.split('-').map(Number)
      const appointmentDate = new Date(year, month - 1, day, 12, 0, 0)

      const clientId = userProfile?.uid || user?.uid
      const clientName = userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Usuario Registrado'

      const paymentPayload = paymentEnabled && uploadedProof
        ? {
            enabled: true,
            provider: paymentSettings?.provider ?? PAYMENT_PROVIDERS.MANUAL_TRANSFER,
            percentage: paymentSettings?.percentage ?? 25,
            amount: depositAmount,
            proof: uploadedProof,
            timeoutMinutes: paymentSettings?.paymentTimeoutMinutes ?? 30,
          }
        : null

      await createAppointment({
        clientId,
        clientName,
        clientPhone: userProfile?.phone || null,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        price: selectedService.price,
        duration: selectedService.duration,
        date: appointmentDate,
        time: formData.time,
        payment: paymentPayload,
      })

      toast.success(
        paymentEnabled
          ? 'Turno enviado. Esperando aprobación del comprobante.'
          : 'Turno agendado correctamente'
      )
      onClose()
      reset()
    } catch {
      toast.error('No se pudo reservar el turno')
    }
  }

  // Form submit handler — if we're on the payment step, finalize
  const onSubmit = async (data) => {
    if (step === STEPS.PAYMENT) {
      await submitAppointment(data)
    } else {
      await handleDetailsSubmit(data)
    }
  }

  if (!isOpen) return null

  const today = new Date()
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const totalSteps = paymentEnabled
    ? [STEPS.CATEGORY, STEPS.SERVICE, STEPS.DETAILS, STEPS.PAYMENT]
    : [STEPS.CATEGORY, STEPS.SERVICE, STEPS.DETAILS]

  const renderProgress = () => (
    <div className="flex items-center gap-2 mb-6">
      {totalSteps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors',
            step === s ? 'bg-brand-primary text-white' :
            step > s ? 'bg-emerald-500/20 text-emerald-400' :
            'bg-brand-pastel text-brand-text-muted'
          )}>
            {step > s ? <Check className="h-3 w-3" /> : i + 1}
          </div>
          {i < totalSteps.length - 1 && <div className={cn('h-px w-6', step > s ? 'bg-emerald-500/30' : 'bg-brand-border')} />}
        </div>
      ))}
    </div>
  )

  // ── Back button handler
  const handleBack = () => {
    if (step === STEPS.PAYMENT) {
      setUploadedProof(null)
      setStep(STEPS.DETAILS)
    } else if (step === STEPS.SERVICE) {
      setStep(STEPS.CATEGORY)
    } else if (step === STEPS.DETAILS && !defaultServiceId) {
      setSelectedServiceId(null)
      setStep(availableCategories.length > 0 ? STEPS.CATEGORY : STEPS.SERVICE)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-brand-border bg-brand-card p-4 sm:p-6 shadow-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1 text-brand-text-muted hover:bg-brand-pastel/30 hover:text-brand-text z-50">
          <X className="h-5 w-5" />
        </button>

        {step !== STEPS.CATEGORY && (
          <button onClick={handleBack} className="absolute left-4 top-4 rounded-lg p-1 text-brand-text-muted hover:bg-brand-pastel/30 hover:text-brand-text">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        <h2 className="text-xl font-bold text-brand-text text-center">Reservar Turno</h2>
        <p className="mb-4 mt-1 text-center text-sm text-brand-text-muted">
          {step === STEPS.PAYMENT
            ? 'Realizá el pago de la seña para confirmar tu turno.'
            : 'Podés agendar con hasta 2 horas de anticipación.'}
        </p>

        {availableCategories.length > 0 && renderProgress()}

        {/* ── Step 0: Category */}
        {step === STEPS.CATEGORY && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-brand-text">Elegí una categoría</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategoryId(cat.id); setStep(STEPS.SERVICE) }}
                  className={cn(
                    'rounded-xl border border-brand-border bg-brand-card p-4 text-left transition-all duration-200',
                    'hover:border-brand-primary/30 hover:bg-brand-pastel/30'
                  )}
                >
                  <p className="font-medium text-brand-text">{cat.name}</p>
                  <p className="mt-1 text-xs text-brand-text-muted">
                    {services?.filter((s) => s.categoryId === cat.id && s.active !== false).length} servicios
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 1: Service */}
        {step === STEPS.SERVICE && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-brand-text">
              {selectedCategoryId
                ? `Servicios de ${categories?.find((c) => c.id === selectedCategoryId)?.name || ''}`
                : 'Seleccioná un servicio'}
            </p>
            {loadingServices ? (
              <p className="text-sm text-brand-text-muted">Cargando servicios...</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(selectedCategoryId ? servicesByCategory : services?.filter((s) => s.active !== false) || []).map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => { setSelectedServiceId(svc.id); setStep(STEPS.DETAILS) }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border border-brand-border bg-brand-card p-4 text-left transition-all duration-200',
                      'hover:border-brand-primary/30 hover:bg-brand-pastel/30'
                    )}
                  >
                    <div>
                      <p className="font-medium text-brand-text">{svc.name}</p>
                      <p className="mt-0.5 text-xs text-brand-text-muted">{svc.duration} min</p>
                    </div>
                    <p className="font-semibold text-emerald-400">{formatCurrency(svc.price)}</p>
                  </button>
                ))}
                {selectedCategoryId && servicesByCategory.length === 0 && (
                  <p className="text-sm text-brand-text-muted">No hay servicios en esta categoría.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Date + Time (shared form for steps 2 and 3) */}
        {(step === STEPS.DETAILS || step === STEPS.PAYMENT) && (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {/* Service summary chip */}
            {selectedService && (
              <div className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-card p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-pastel">
                  <Clock className="h-4 w-4 text-brand-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-brand-text">{selectedService.name}</p>
                  <p className="text-xs text-brand-text-muted">{formatCurrency(selectedService.price)} · {selectedService.duration} min</p>
                </div>
              </div>
            )}

            {/* Date + Time inputs — visible in both step 2 and step 3 (read-only in 3) */}
            {step === STEPS.DETAILS && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Fecha"
                  min={role === USER_ROLES.ADMIN ? undefined : minDate}
                  error={errors.date?.message}
                  {...register('date')}
                />
                <Controller
                  name="time"
                  control={control}
                  render={({ field }) => (
                    <TimeSelect
                      label="Hora"
                      startHour={7}
                      endHour={20}
                      stepMinutes={15}
                      error={errors.time?.message}
                      {...field}
                    />
                  )}
                />
              </div>
            )}

            {/* ── Step 3: Payment */}
            {step === STEPS.PAYMENT && (
              <div className="space-y-4">
                {/* Deposit summary */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="h-4 w-4 text-amber-400" />
                    <p className="text-sm font-semibold text-amber-400">Pago de seña</p>
                  </div>
                  <Row label="Monto requerido" value={formatCurrency(depositAmount)} copyable />
                </div>

                {/* Bank info */}
                <div className="rounded-xl border border-brand-border bg-brand-bg p-4 space-y-2">
                  <p className="text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Datos bancarios</p>
                  {paymentSettings?.bank && (
                    <Row label="Banco" value={paymentSettings.bank} />
                  )}
                  {paymentSettings?.owner && (
                    <Row label="Titular" value={paymentSettings.owner} />
                  )}
                  {paymentSettings?.accountNumber && (
                    <Row label="Número de cuenta" value={paymentSettings.accountNumber} copyable />
                  )}
                  {paymentSettings?.accountAlias && (
                    <Row label="Alias" value={paymentSettings.accountAlias} copyable />
                  )}


                </div>

                {/* Instructions */}
                <div className="flex gap-2 rounded-xl border border-brand-border bg-brand-card p-3">
                  <Info className="h-4 w-4 text-brand-text-muted shrink-0 mt-0.5" />
                  <p className="text-xs text-brand-text-muted">
                    {paymentSettings?.instructions || 'Después de realizar la transferencia, sube el comprobante para confirmar tu reserva.'}
                  </p>
                </div>

                {/* Timeout notice */}
                {paymentSettings?.paymentTimeoutMinutes && (
                  <p className="text-xs text-brand-text-muted text-center">
                    Tenés {paymentSettings.paymentTimeoutMinutes} minutos para enviar el comprobante.
                  </p>
                )}

                {/* Proof uploader */}
                <div>
                  <p className="mb-2 text-sm font-medium text-brand-text">
                    Subí el comprobante de transferencia
                  </p>
                  <PaymentProofUploader
                    onUploaded={(proof) => setUploadedProof(proof)}
                    onClear={() => setUploadedProof(null)}
                    disabled={isPending}
                  />
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose} disabled={isSubmitting || isPending}>
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={isSubmitting || isPending}
                disabled={step === STEPS.PAYMENT && !uploadedProof}
              >
                {step === STEPS.PAYMENT ? 'Enviar comprobante' : 'Continuar'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// Small helper for bank info rows
function Row({ label, value, copyable = false }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    // Strip non-numeric characters if it's currency format for amount copying, else copy verbatim
    const textToCopy = value.toString().replace(/[₲\s\.]/g, '')
    navigator.clipboard.writeText(copyable && label === 'Monto requerido' ? textToCopy : value)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-brand-text-muted shrink-0">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-brand-text">{value}</span>
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "rounded px-1.5 py-0.5 text-xs transition-colors flex items-center gap-1",
              copied 
                ? "bg-emerald-500/10 text-emerald-500" 
                : "text-brand-primary hover:bg-brand-pastel/30"
            )}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copiado
              </>
            ) : (
              '📋 Copiar'
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export default UserBookingModal
