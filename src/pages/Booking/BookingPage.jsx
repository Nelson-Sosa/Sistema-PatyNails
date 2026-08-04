import { useState, useEffect, useMemo, useCallback } from 'react'
import { X, Check, Banknote, Info, PartyPopper, Sparkles, UserRoundCheck } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { useServices } from '@/hooks/useServices'
import { useActiveCategories } from '@/hooks/useServiceCategories'
import { usePaymentSettings } from '@/hooks/usePaymentSettings'
import { useBusinessSettings } from '@/hooks/useBusinessSettings'
import { usePageTitle } from '@/hooks/usePageTitle'
import {
  createGuestAppointment,
  createUserAppointment,
  checkAppointmentConflict,
} from '@/services/appointments/appointmentsService'
import { validateAppointmentDateTime } from '@/utils/dateValidation'
import { canStartServiceAt, getScheduleErrorMessage } from '@/services/scheduleService'
import { formatCurrency, formatPhoneStoragePY } from '@/utils/formatters'
import { PAYMENT_PROVIDERS, USER_ROLES } from '@/constants/app'
import { ROUTES } from '@/routes/routes'
import { cn } from '@/utils/cn'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import WeeklyAvailabilityCalendar from '@/components/booking/WeeklyAvailabilityCalendar'
import PaymentProofUploader from '@/pages/Appointments/components/PaymentProofUploader'
import BookingCheckout from '@/components/booking/BookingCheckout'

const STEPS = { CATEGORY: 0, SERVICE: 1, SLOT: 2, IDENTITY: 3, PAYMENT: 4, SUCCESS: 5 }

const DRAFT_KEY = 'patynails_booking_draft'

// Capitalize the first letter of a label
function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function BookingPage() {
  usePageTitle('Reservar Turno')
  const navigate = useNavigate()
  const location = useLocation()

  const { user, userProfile, isAuthenticated, loading: authLoading, logout } = useAuth()
  const { data: services, isLoading: loadingServices } = useServices()
  const { data: categories } = useActiveCategories()
  const { data: paymentSettings } = usePaymentSettings()
  const { settings: businessSettings } = useBusinessSettings()

  const [step, setStep] = useState(STEPS.CATEGORY)
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  const [slotDate, setSlotDate] = useState('')
  const [slotTime, setSlotTime] = useState('')
  const [uploadedProof, setUploadedProof] = useState(null)
  const [guestData, setGuestData] = useState(null) // { name, phone, email }
  const [submitting, setSubmitting] = useState(false)

  const availableCategories = useMemo(
    () => categories?.filter((c) => services?.some((s) => s.categoryId === c.id && s.active !== false)) || [],
    [categories, services]
  )

  const servicesByCategory = useMemo(() => {
    if (!services || !selectedCategoryId) return []
    return services.filter((s) => s.categoryId === selectedCategoryId && s.active !== false)
  }, [services, selectedCategoryId])

  const selectedService = useMemo(
    () => services?.find((s) => s.id === selectedServiceId) || null,
    [services, selectedServiceId]
  )

  const paymentEnabled = !!paymentSettings?.enabled

  const depositAmount = useMemo(() => {
    if (!selectedService || !paymentEnabled) return 0
    const pct = paymentSettings?.percentage ?? 25
    return Math.round((selectedService.price * pct) / 100)
  }, [selectedService, paymentEnabled, paymentSettings?.percentage])

  // ─── Draft persistence (keeps the wizard alive across login redirects) ────
  const saveDraft = useCallback(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
        step,
        selectedCategoryId,
        selectedServiceId,
        slotDate,
        slotTime,
        guestData,
      }))
    } catch { /* ignore quota / private mode errors */ }
  }, [step, selectedCategoryId, selectedServiceId, slotDate, slotTime, guestData])

  useEffect(() => {
    if (step !== STEPS.SUCCESS) saveDraft()
  }, [step, selectedCategoryId, selectedServiceId, slotDate, slotTime, guestData, saveDraft])

  // Restore draft or prefill from the Services catalog
  useEffect(() => {
    const prefill = location.state?.selectedServiceId
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (raw) {
        const draft = JSON.parse(raw)
        if (draft && draft.step !== STEPS.SUCCESS && !prefill) {
          setStep(draft.step)
          setSelectedCategoryId(draft.selectedCategoryId)
          setSelectedServiceId(draft.selectedServiceId)
          setSlotDate(draft.slotDate || '')
          setSlotTime(draft.slotTime || '')
          if (draft.guestData) setGuestData(draft.guestData)
        }
      }
    } catch { /* ignore corrupt draft */ }

    if (prefill) {
      setSelectedServiceId(prefill)
      setStep(STEPS.SLOT)
      window.history.replaceState({}, document.title)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clearDraft = () => {
    try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
  }

  // ─── Slot validation & continue to identity ───────────────────────────────
  const continueFromSlot = async () => {
    if (!selectedService) {
      toast.error('Seleccioná un servicio')
      setStep(STEPS.SERVICE)
      return
    }
    if (!slotDate || !slotTime) {
      toast.error('Elegí una fecha y un horario disponible')
      return
    }

    const dateValidation = validateAppointmentDateTime(slotDate, slotTime, USER_ROLES.USER)
    if (!dateValidation.valid) {
      toast.error(dateValidation.message)
      return
    }

    if (businessSettings) {
      const [year, month, day] = slotDate.split('-').map(Number)
      const slotDay = new Date(year, month - 1, day, 12, 0, 0)
      const scheduleCheck = canStartServiceAt(businessSettings, slotDay, slotTime, selectedService.duration)
      if (!scheduleCheck.valid) {
        toast.error(getScheduleErrorMessage(scheduleCheck.reason))
        return
      }
    }

    const [year, month, day] = slotDate.split('-').map(Number)
    const appointmentDate = new Date(year, month - 1, day, 12, 0, 0)

    const hasConflict = await checkAppointmentConflict(appointmentDate, slotTime, selectedService.duration)
    if (hasConflict) {
      toast.error('Ese horario ya está ocupado. Elegí otro horario disponible.')
      return
    }

    setStep(STEPS.IDENTITY)
  }

  // ─── Identity resolution ──────────────────────────────────────────────────
  const handleGuestSubmit = (values) => {
    setGuestData(values)
    // Identity resolved → continue to payment (or submit directly if no seña)
    setStep(paymentEnabled ? STEPS.PAYMENT : STEPS.SUCCESS)
    if (!paymentEnabled) {
      submitAppointment({ values })
    }
  }

  const handleAuthedContinue = () => {
    setStep(paymentEnabled ? STEPS.PAYMENT : STEPS.SUCCESS)
    if (!paymentEnabled) {
      submitAppointment({})
    }
  }

  const handleLogin = () => {
    navigate(ROUTES.LOGIN, { state: { from: location } })
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      /* ignore */
    }
  }

  // ─── Final submission (shared) ────────────────────────────────────────────
  const submitAppointment = async ({ values } = {}) => {
    if (!selectedService) return
    try {
      setSubmitting(true)

      const [year, month, day] = slotDate.split('-').map(Number)
      const appointmentDate = new Date(year, month - 1, day, 12, 0, 0)

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

      if (isAuthenticated) {
        const uid = user?.uid || userProfile?.uid
        await createUserAppointment({
          clientId: uid,
          userId: uid,
          clientName: userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Usuario',
          clientPhone: userProfile?.phone || null,
          email: user?.email || userProfile?.email || null,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          price: selectedService.price,
          duration: selectedService.duration,
          date: appointmentDate,
          time: slotTime,
          payment: paymentPayload,
        })
      } else {
        const guestPhone = formatPhoneStoragePY(values?.phone || guestData?.phone || '')
        await createGuestAppointment({
          clientName: (values?.name || guestData?.name || '').trim(),
          clientPhone: guestPhone,
          email: (values?.email || guestData?.email || '')?.trim() || null,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          price: selectedService.price,
          duration: selectedService.duration,
          date: appointmentDate,
          time: slotTime,
          payment: paymentPayload,
        })
      }

      clearDraft()
      setStep(STEPS.SUCCESS)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      console.error('[booking] error al crear turno:', err)
      toast.error('No se pudo reservar el turno. Intentá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Payment step action (proof must be uploaded) ─────────────────────────
  const handlePaymentSubmit = () => {
    if (!uploadedProof) {
      toast.error('Subí el comprobante para confirmar la seña')
      return
    }
    submitAppointment({ values: isAuthenticated ? {} : guestData })
  }

  // ─── Derived UI values ────────────────────────────────────────────────────
  const dateLabel = slotDate
    ? capitalize(new Date(slotDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }))
    : ''

  const currentUserName = userProfile?.displayName || user?.displayName || user?.email?.split('@')[0] || null

  const totalSteps = paymentEnabled
    ? [STEPS.SERVICE, STEPS.SLOT, STEPS.IDENTITY, STEPS.PAYMENT]
    : [STEPS.SERVICE, STEPS.SLOT, STEPS.IDENTITY]

  if (authLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* ── Header + progress ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-text">Reservar Turno</h1>
        <p className="mt-1 text-sm text-brand-text-muted">
          Elegí tu servicio, el horario y confirmá tu reserva sin necesidad de crear una cuenta.
        </p>

        {step !== STEPS.SUCCESS && (
          <div className="mt-4 flex items-center gap-2">
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
        )}
      </div>

      {/* ── Step: Category ────────────────────────────────────────────────── */}
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

      {/* ── Step: Service ─────────────────────────────────────────────────── */}
      {step === STEPS.SERVICE && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-brand-text">
            {selectedCategoryId
              ? `Servicios de ${categories?.find((c) => c.id === selectedCategoryId)?.name || ''}`
              : 'Seleccioná un servicio'}
          </p>
          {loadingServices ? (
            <div className="py-8 text-center text-sm text-brand-text-muted">Cargando servicios…</div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {(selectedCategoryId ? servicesByCategory : services?.filter((s) => s.active !== false) || []).map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => { setSelectedServiceId(svc.id); setStep(STEPS.SLOT) }}
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

      {/* ── Step: Slot (date + time) ──────────────────────────────────────── */}
      {step === STEPS.SLOT && (
        <div className="space-y-4">
          {selectedService && (
            <div className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-card p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-pastel">
                <Sparkles className="h-4 w-4 text-brand-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-brand-text">{selectedService.name}</p>
                <p className="text-xs text-brand-text-muted">
                  {formatCurrency(selectedService.price)} · {selectedService.duration} min
                </p>
              </div>
            </div>
          )}

          <WeeklyAvailabilityCalendar
            serviceDuration={selectedService?.duration || 60}
            value={{ date: slotDate, time: slotTime }}
            onChange={(val) => {
              setSlotDate(val.date)
              setSlotTime(val.time)
            }}
          />

          <div className="flex justify-end">
            <Button onClick={continueFromSlot}>Continuar</Button>
          </div>
        </div>
      )}

      {/* ── Step: Identity (checkout) ─────────────────────────────────────── */}
      {step === STEPS.IDENTITY && selectedService && (
        <BookingCheckout
          service={selectedService}
          dateLabel={dateLabel}
          time={slotTime}
          paymentEnabled={paymentEnabled}
          depositAmount={depositAmount}
          isAuthenticated={isAuthenticated}
          authLoading={authLoading}
          userName={currentUserName}
          userEmail={user?.email || userProfile?.email || null}
          userPhone={userProfile?.phone || null}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onBack={() => setStep(STEPS.SLOT)}
          onGuestSubmit={handleGuestSubmit}
          onContinue={handleAuthedContinue}
          guestSubmitting={submitting}
        />
      )}

      {/* ── Step: Payment (seña) ──────────────────────────────────────────── */}
      {step === STEPS.PAYMENT && selectedService && (
        <div className="flex flex-col gap-5">
          {/* Deposit summary */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-semibold text-amber-400">Pago de seña</p>
            </div>
            <PaymentRow label="Monto requerido" value={formatCurrency(depositAmount)} copyable />
          </div>

          {/* Bank info */}
          <div className="rounded-xl border border-brand-border bg-brand-card p-4 space-y-2">
            <p className="text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Datos bancarios</p>
            {paymentSettings?.bank && <PaymentRow label="Banco" value={paymentSettings.bank} />}
            {paymentSettings?.owner && <PaymentRow label="Titular" value={paymentSettings.owner} />}
            {paymentSettings?.accountNumber && <PaymentRow label="Número de cuenta" value={paymentSettings.accountNumber} copyable />}
            {paymentSettings?.accountAlias && <PaymentRow label="Alias" value={paymentSettings.accountAlias} copyable />}
          </div>

          {/* Instructions */}
          <div className="flex gap-2 rounded-xl border border-brand-border bg-brand-card p-3">
            <Info className="h-4 w-4 text-brand-text-muted shrink-0 mt-0.5" />
            <p className="text-xs text-brand-text-muted">
              {paymentSettings?.instructions || 'Después de realizar la transferencia, sube el comprobante para confirmar tu reserva.'}
            </p>
          </div>

          {paymentSettings?.paymentTimeoutMinutes && (
            <p className="text-xs text-brand-text-muted text-center">
              Tenés {paymentSettings.paymentTimeoutMinutes} minutos para enviar el comprobante.
            </p>
          )}

          {/* Proof uploader */}
          <div>
            <p className="mb-2 text-sm font-medium text-brand-text">Subí el comprobante de transferencia</p>
            <PaymentProofUploader
              onUploaded={(proof) => setUploadedProof(proof)}
              onClear={() => setUploadedProof(null)}
              disabled={submitting}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setStep(STEPS.IDENTITY)} disabled={submitting}>
              Volver
            </Button>
            <Button
              onClick={handlePaymentSubmit}
              loading={submitting}
              disabled={!uploadedProof}
            >
              Enviar comprobante
            </Button>
          </div>
        </div>
      )}

      {/* ── Step: Success ─────────────────────────────────────────────────── */}
      {step === STEPS.SUCCESS && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 sm:p-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
            <PartyPopper className="h-7 w-7 text-emerald-400" />
          </div>

          <h2 className="mt-4 text-xl sm:text-2xl font-bold text-brand-text">
            ¡Tu turno fue solicitado correctamente!
          </h2>

          {paymentEnabled ? (
            <p className="mt-2 text-sm text-brand-text-muted max-w-md">
              Recibimos tu comprobante de seña. Está en revisión y te confirmaremos tu turno
              apenas sea aprobado.
            </p>
          ) : (
            <p className="mt-2 text-sm text-brand-text-muted max-w-md">
              Tu turno quedó agendado. Te esperamos en PatyNails.
            </p>
          )}

          {selectedService && slotDate && (
            <div className="mt-4 rounded-xl border border-brand-border bg-brand-card p-4 w-full max-w-sm text-left space-y-1.5">
              <p className="text-sm font-medium text-brand-text">{selectedService.name}</p>
              <p className="text-xs text-brand-text-muted capitalize">{dateLabel} · {slotTime} hs</p>
            </div>
          )}

          {/* Guest → invite to create an account (not required) */}
          {!isAuthenticated && (
            <div className="mt-6 w-full max-w-sm rounded-xl border border-brand-border bg-brand-card p-4 text-left">
              <p className="text-sm font-semibold text-brand-text">¿Querés llevar tu historial con vos?</p>
              <p className="mt-1 text-xs text-brand-text-muted">
                Creá una cuenta gratis para guardar tu historial, consultar próximos turnos y
                acceder a beneficios de fidelidad.
              </p>
              <Button
                className="mt-3 w-full"
                variant="secondary"
                leftIcon={<UserRoundCheck className="h-4 w-4" />}
                onClick={() => navigate(`/register?phone=${encodeURIComponent(guestData?.phone || '')}`)}
              >
                Crear cuenta
              </Button>
              <p className="mt-2 text-center text-[11px] text-brand-text-muted">
                La creación de cuenta es opcional.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => navigate(ROUTES.SERVICES)}
            >
              Volver a servicios
            </Button>
            {isAuthenticated && (
              <Button onClick={() => navigate(ROUTES.APPOINTMENTS)}>
                Ver mis turnos
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Floating close (redundant with sidebar, kept for quick exit) */}
      {step !== STEPS.SUCCESS && (
        <button
          onClick={() => { clearDraft(); navigate(ROUTES.SERVICES) }}
          className="mt-6 inline-flex items-center gap-1 text-xs text-brand-text-muted hover:text-brand-text transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Salir y descartar
        </button>
      )}
    </div>
  )
}

/**
 * Small row used in the payment step (with copy support for amounts/accounts).
 */
function PaymentRow({ label, value, copyable = false }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const textToCopy = String(value).replace(/[₲\s.]/g, '')
    navigator.clipboard.writeText(copyable && label === 'Monto requerido' ? textToCopy : String(value))
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
              'rounded px-1.5 py-0.5 text-xs transition-colors',
              copied ? 'bg-emerald-500/10 text-emerald-500' : 'text-brand-primary hover:bg-brand-pastel/30'
            )}
          >
            {copied ? <Check className="h-3 w-3" /> : 'Copiar'}
          </button>
        )}
      </div>
    </div>
  )
}

export default BookingPage