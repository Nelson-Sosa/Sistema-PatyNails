import { cn } from '@/utils/cn'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function AvailabilityDayCard({
  dateInfo,
  isSelected,
  onClick
}) {
  const { date, isAvailable, isFull, isFew, isPast, isWorkingDay, availableCount } = dateInfo

  const dayName = DAYS[date.getDay()]
  const dayNumber = date.getDate()

  const isDisabled = isPast || !isWorkingDay || isFull

  let statusText = ''
  let statusColorClass = ''

  if (isDisabled) {
    statusText = isPast || !isWorkingDay ? 'No disp.' : 'Completo'
    statusColorClass = 'text-brand-text-muted bg-brand-border/30'
  } else if (isFew) {
    statusText = `Quedan ${availableCount}`
    statusColorClass = 'text-amber-600 bg-amber-100'
  } else {
    statusText = `${availableCount} horarios`
    statusColorClass = 'text-emerald-600 bg-emerald-100'
  }

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center p-3 rounded-xl min-w-[80px] transition-all duration-200 border-2 select-none',
        isDisabled
          ? 'opacity-50 cursor-not-allowed border-transparent bg-brand-card/50'
          : 'cursor-pointer hover:border-brand-primary/50 bg-brand-card shadow-sm',
        isSelected && !isDisabled
          ? 'border-brand-primary bg-brand-primary/5'
          : (!isDisabled && 'border-transparent')
      )}
    >
      <span className={cn(
        'text-xs font-semibold uppercase tracking-wider mb-1',
        isSelected ? 'text-brand-primary' : 'text-brand-text-muted'
      )}>
        {dayName}
      </span>
      <span className={cn(
        'text-xl font-bold mb-2',
        isSelected ? 'text-brand-primary' : 'text-brand-text'
      )}>
        {dayNumber}
      </span>
      <span className={cn(
        'text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap',
        statusColorClass
      )}>
        {statusText}
      </span>
    </button>
  )
}
