import { useState, useEffect } from 'react'
import { CalendarDays, Plus, Phone, Upload, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppointmentsByClient, useCancelAppointment, useReplacePaymentProof } from '@/hooks/useAppointments'
import { useServices } from '@/hooks/useServices'
import { useAuth } from '@/context/AuthContext'
import { ROUTES } from '@/routes/routes'
import { APPOINTMENT_STATUS, PAYMENT_STATUS } from '@/constants/app'
import { formatCurrency } from '@/utils/formatters'
import { uploadImage } from '@/services/cloudinary/cloudinaryService'
import toast from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import UserBookingModal from './UserBookingModal'
import PaymentProofUploader from './PaymentProofUploader'

export default function UserAppointmentsView() {
  const { userProfile, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: services } = useServices()
  const servicePriceMap = {}
  if (services) {
    services.forEach((s) => { servicePriceMap[s.id] = s.price })
  }

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState(null)
  // Track which appointment is in "replace proof" mode
  const [replacingProofFor, setReplacingProofFor] = useState(null)

  const clientId = userProfile?.uid || user?.uid
  const { data: appointments, isLoading } = useAppointmentsByClient(clientId)
  const { mutate: cancelAppointment, isPending: isCancelling } = useCancelAppointment()
  const { mutate: replaceProof, isPending: isReplacing } = useReplacePaymentProof()

  const handleCancel = (appointmentId) => {
    cancelAppointment(appointmentId, {
      onSuccess: () => toast.success('Turno cancelado correctamente'),
      onError: () => toast.error('No se pudo cancelar el turno'),
    })
  }

  const handleReplaceProof = (appointmentId, proof) => {
    replaceProof({ id: appointmentId, proof }, {
      onSuccess: () => {
        toast.success('Comprobante enviado. Esperando revisión.')
        setReplacingProofFor(null)
      },
      onError: () => toast.error('No se pudo enviar el comprobante'),
    })
  }

  // Auto-open modal if navigated from Services catalog
  useEffect(() => {
    if (location.state?.selectedServiceId) {
      setSelectedServiceId(location.state.selectedServiceId)
      setIsModalOpen(true)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const handleOpenModal = () => { setSelectedServiceId(null); setIsModalOpen(true) }
  const handleCloseModal = () => { setIsModalOpen(false); setTimeout(() => setSelectedServiceId(null), 300) }

  // ── Payment status badge
  const getPaymentBadge = (payment) => {
    if (!payment?.enabled) return null
    switch (payment.status) {
      case PAYMENT_STATUS.PENDING_PROOF:
        return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">Seña pendiente</span>
      case PAYMENT_STATUS.PROOF_SUBMITTED:
        return <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">Comprobante enviado</span>
      case PAYMENT_STATUS.APPROVED:
        return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">Seña aprobada</span>
      case PAYMENT_STATUS.REJECTED:
        return <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-500">Seña rechazada</span>
      default:
        return null
    }
  }

  // ── Appointment status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case APPOINTMENT_STATUS.PENDING:
        return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">Pendiente</span>
      case APPOINTMENT_STATUS.CONFIRMED:
        return <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">Confirmado</span>
      case APPOINTMENT_STATUS.DONE:
        return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">Realizado</span>
      case APPOINTMENT_STATUS.CANCELLED:
        return <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-500">Cancelado</span>
      default:
        return <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-medium text-slate-500">{status}</span>
    }
  }

  return (
    <div className="flex h-full flex-col gap-6">
      {/* ── Phone missing alert */}
      {!userProfile?.phone && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-start sm:items-center gap-3">
            <Phone className="h-5 w-5 flex-shrink-0 text-amber-400 mt-0.5 sm:mt-0" />
            <p className="text-sm text-amber-300">
              <strong>Completá tu número de teléfono</strong> para recibir recordatorios de tus turnos por WhatsApp.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => navigate(ROUTES.PROFILE)}
            className="self-start sm:self-auto flex-shrink-0"
          >
            Completar ahora
          </Button>
        </div>
      )}

      {/* ── Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Mis Turnos</h1>
          <p className="mt-1 text-sm text-brand-text-muted">
            Revisá tu historial y próximos turnos agendados.
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={handleOpenModal}>
          Reservar Turno
        </Button>
      </div>

      {/* ── Appointments List */}
      <div className="flex-1 space-y-4">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : appointments?.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {appointments.map((appointment) => {
              const pmt = appointment.payment
              const isRejected = pmt?.enabled && pmt?.status === PAYMENT_STATUS.REJECTED
              const isReplacingThis = replacingProofFor === appointment.id

              return (
                <div
                  key={appointment.id}
                  className="flex flex-col rounded-xl border border-brand-border bg-brand-card p-4 shadow-sm"
                >
                  {/* Header row */}
                  <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-brand-text">
                      {appointment.serviceName}
                    </span>
                    {getStatusBadge(appointment.status)}
                  </div>

                  {/* Date + time + price */}
                  <div className="mt-2 flex flex-col gap-1 text-sm text-brand-text-muted">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-brand-text-muted" />
                      {appointment.date?.seconds
                        ? format(new Date(appointment.date.seconds * 1000), "EEEE d 'de' MMMM", { locale: es })
                        : 'Fecha pendiente'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-brand-text">{appointment.time} hs</span>
                      <span>•</span>
                      <span>{formatCurrency(servicePriceMap[appointment.serviceId] ?? appointment.price)}</span>
                    </span>
                  </div>

                  {/* Payment badge — independent of appointment status */}
                  {pmt?.enabled && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {getPaymentBadge(pmt)}
                      {pmt.amount > 0 && (
                        <span className="text-xs text-brand-text-muted">
                          Seña: {formatCurrency(pmt.amount)}
                        </span>
                      )}
                      {/* View proof link */}
                      {pmt.proof?.secureUrl && (
                        <a
                          href={pmt.proof.secureUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-brand-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Ver comprobante
                        </a>
                      )}
                    </div>
                  )}

                  {/* Rejection reason + replace proof */}
                  {isRejected && (
                    <div className="mt-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                      <p className="text-xs font-medium text-rose-400 mb-1">Comprobante rechazado</p>
                      {pmt.rejectionReason && (
                        <p className="text-xs text-rose-300 mb-2">Motivo: {pmt.rejectionReason}</p>
                      )}
                      {!isReplacingThis ? (
                        <button
                          onClick={() => setReplacingProofFor(appointment.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-brand-primary hover:text-brand-primary-hover transition-colors"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Reemplazar comprobante
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <PaymentProofUploader
                            onUploaded={(proof) => handleReplaceProof(appointment.id, proof)}
                            onClear={() => {}}
                            disabled={isReplacing}
                          />
                          <button
                            onClick={() => setReplacingProofFor(null)}
                            className="text-xs text-brand-text-muted hover:text-brand-text transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cancel button */}
                  {(appointment.status === APPOINTMENT_STATUS.PENDING ||
                    appointment.status === APPOINTMENT_STATUS.CONFIRMED) && (
                    <div className="mt-4 flex justify-end border-t border-brand-border pt-3">
                      <button
                        onClick={() => handleCancel(appointment.id)}
                        disabled={isCancelling}
                        className="text-xs font-medium text-brand-primary hover:text-brand-primary-hover disabled:opacity-50 transition-colors"
                      >
                        {isCancelling ? 'Cancelando...' : 'Cancelar turno'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-brand-border bg-brand-bg">
            <CalendarDays className="mb-3 h-10 w-10 text-brand-text-muted" />
            <p className="text-lg font-medium text-brand-text">Aún no tenés turnos</p>
            <p className="mt-1 text-sm text-brand-text-muted">Explorá nuestros servicios y reservá tu primer turno.</p>
            <Button className="mt-4" variant="secondary" onClick={handleOpenModal}>
              Reservar Turno
            </Button>
          </div>
        )}
      </div>

      <UserBookingModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        defaultServiceId={selectedServiceId}
      />
    </div>
  )
}
