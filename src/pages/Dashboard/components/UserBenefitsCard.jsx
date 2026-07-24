import { Gem, Gift, Bell, History, Calendar } from 'lucide-react'

const BENEFITS = [
  { icon: Gift, text: 'Programa de beneficios con 20% de descuento cada 6 visitas.' },
  { icon: Bell, text: 'Recordatorios automáticos por WhatsApp (próximamente).' },
  { icon: History, text: 'Historial completo de servicios y visitas.' },
  { icon: Calendar, text: 'Reservas online 24/7 desde cualquier dispositivo.' },
]

function UserBenefitsCard() {
  return (
    <div className="rounded-2xl border border-brand-pastel bg-brand-card p-6 transition-all duration-300 hover:border-brand-primary/50 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/15 to-rose-500/10">
          <Gem className="h-5 w-5 text-amber-400" />
        </span>
        <div>
          <p className="text-sm font-medium text-brand-text">Beneficios patynails</p>
          <p className="text-xs text-brand-text-muted">Todo lo que ofrecemos para ti</p>
        </div>
      </div>

      <ul className="space-y-3">
        {BENEFITS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-pastel/30">
              <Icon className="h-3.5 w-3.5 text-brand-text-muted" />
            </span>
            <span className="text-sm text-brand-text-muted leading-relaxed">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default UserBenefitsCard
