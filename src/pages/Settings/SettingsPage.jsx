import { Settings, CreditCard } from 'lucide-react'
import { usePageTitle } from '@/hooks/usePageTitle'
import PaymentSettingsSection from './components/PaymentSettingsSection'

function SettingsPage() {
  usePageTitle('Configuración')

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-text">Configuración</h1>
        <p className="mt-1 text-sm text-brand-text-muted">
          Administrá los ajustes del sistema del salón.
        </p>
      </div>

      {/* ── Payments section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-pastel">
            <CreditCard className="h-4 w-4 text-brand-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-brand-text">Pagos</h2>
            <p className="text-xs text-brand-text-muted">Configurá el sistema de seña por transferencia bancaria</p>
          </div>
        </div>
        <div className="rounded-2xl border border-brand-border bg-brand-card p-5">
          <PaymentSettingsSection />
        </div>
      </section>
    </div>
  )
}

export default SettingsPage
