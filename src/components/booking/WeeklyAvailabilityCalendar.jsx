import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAvailability } from '@/hooks/useAvailability'
import WeekNavigator from './WeekNavigator'
import AvailabilityDayCard from './AvailabilityDayCard'
import AvailableTimesGrid from './AvailableTimesGrid'
import { Clock } from 'lucide-react'

// Skeleton component for loading state
function CalendarSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex justify-between items-center px-4">
        <div className="h-8 w-24 bg-brand-border/40 rounded-lg" />
        <div className="h-4 w-32 bg-brand-border/40 rounded" />
        <div className="h-8 w-24 bg-brand-border/40 rounded-lg" />
      </div>
      
      <div className="flex gap-3 overflow-hidden pb-4 px-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="min-w-[80px] h-[100px] bg-brand-border/40 rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-14 bg-brand-border/40 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default function WeeklyAvailabilityCalendar({
  serviceDuration = 60,
  value, // { date: string (YYYY-MM-DD), time: string (HH:mm) }
  onChange
}) {
  const {
    currentWeekStart,
    currentWeekEnd,
    weekDays,
    selectedDate,
    setSelectedDate,
    selectedDayInfo,
    nextWeek,
    prevWeek,
    isLoading,
    isError,
    canGoPrevWeek
  } = useAvailability(serviceDuration)

  const [selectedTime, setSelectedTime] = useState(value?.time || null)
  const scrollContainerRef = useRef(null)

  // Sync internal state with external value if needed
  useEffect(() => {
    if (value?.date && value?.time) {
      // If parent sets a specific date/time, we might want to sync, 
      // but for this UI, the selection usually drives the parent, not the other way around.
      // We'll just ensure time is synced.
      setSelectedTime(value.time)
    }
  }, [value])

  // Clear selected time when day changes
  useEffect(() => {
    if (selectedDate && value?.date) {
      const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
      if (selectedDateStr !== value.date) {
        setSelectedTime(null)
        onChange({ date: selectedDateStr, time: '' }) // Clear time in parent
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  const handleTimeSelect = (time) => {
    setSelectedTime(time)
    if (selectedDate) {
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
      onChange({ date: dateStr, time })
    }
  }

  if (isError) {
    return (
      <div className="p-6 text-center text-brand-text-muted">
        Ocurrió un error al cargar la disponibilidad.
      </div>
    )
  }

  if (isLoading && weekDays.length === 0) {
    return <CalendarSkeleton />
  }

  return (
    <div className="w-full">
      <WeekNavigator
        currentWeekStart={currentWeekStart}
        currentWeekEnd={currentWeekEnd}
        onPrevWeek={prevWeek}
        onNextWeek={nextWeek}
        canGoPrevWeek={canGoPrevWeek}
      />

      {/* Horizontal scroll for days */}
      <div className="relative -mx-4 sm:mx-0">
        <div 
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto pb-4 pt-1 px-4 sm:px-1 snap-x scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {weekDays.map((dayInfo) => {
            const isSelected = selectedDate?.getTime() === dayInfo.date.getTime()
            return (
              <div key={dayInfo.date.getTime()} className="snap-start shrink-0">
                <AvailabilityDayCard
                  dateInfo={dayInfo}
                  isSelected={isSelected}
                  onClick={() => setSelectedDate(dayInfo.date)}
                />
              </div>
            )
          })}
        </div>
        {/* Gradients for scroll hint */}
        <div className="absolute left-0 top-0 bottom-4 w-4 bg-gradient-to-r from-brand-card to-transparent pointer-events-none sm:hidden" />
        <div className="absolute right-0 top-0 bottom-4 w-4 bg-gradient-to-l from-brand-card to-transparent pointer-events-none sm:hidden" />
      </div>

      <div className="mt-2 min-h-[250px]">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 mt-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 bg-brand-border/40 rounded-xl" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDate ? selectedDate.getTime() : 'empty'}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              {selectedDayInfo && (
                <>
                  <div className="flex items-center gap-2 mb-3 px-1 text-brand-text-muted">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Horarios disponibles</span>
                  </div>
                  <AvailableTimesGrid
                    slots={selectedDayInfo.slots}
                    selectedTime={selectedTime}
                    onSelectTime={handleTimeSelect}
                  />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
