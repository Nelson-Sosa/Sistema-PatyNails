import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

export default function WeekNavigator({
  currentWeekStart,
  currentWeekEnd,
  onPrevWeek,
  onNextWeek,
  canGoPrevWeek,
}) {
  const formatMonth = (date) => {
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  }

  const startMonth = formatMonth(currentWeekStart)
  const endMonth = formatMonth(currentWeekEnd)
  
  // Show "Julio 2026 - Agosto 2026" if the week spans two months, else just "Julio 2026"
  const monthDisplay = startMonth === endMonth ? startMonth : `${startMonth.split(' ')[0]} - ${endMonth}`

  return (
    <div className="flex flex-col items-center mb-6">
      <h3 className="text-sm font-semibold text-brand-text capitalize mb-2">{monthDisplay}</h3>
      <div className="flex items-center justify-between w-full">
        <button
          type="button"
          onClick={onPrevWeek}
          disabled={!canGoPrevWeek}
          className={cn(
            "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            canGoPrevWeek
              ? "text-brand-text hover:bg-brand-pastel/50"
              : "text-brand-text-muted/50 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Semana anterior
        </button>
        <span className="text-xs text-brand-text-muted">
          {currentWeekStart.getDate()} - {currentWeekEnd.getDate()}
        </span>
        <button
          type="button"
          onClick={onNextWeek}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-brand-text hover:bg-brand-pastel/50 transition-colors"
        >
          Semana siguiente
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
