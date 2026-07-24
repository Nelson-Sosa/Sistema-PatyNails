import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 }
}

export default function AvailableTimesGrid({
  slots,
  selectedTime,
  onSelectTime
}) {
  if (!slots || slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-brand-pastel/30 rounded-xl border border-dashed border-brand-border mt-4">
        <p className="text-brand-text font-medium">No hay horarios disponibles</p>
        <p className="text-sm text-brand-text-muted mt-1">Elegí otro día para ver más opciones</p>
      </div>
    )
  }

  return (
    <motion.div 
      className="grid grid-cols-2 gap-3 mt-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {slots.map((time) => {
        const isSelected = selectedTime === time
        
        return (
          <motion.button
            key={time}
            variants={item}
            type="button"
            onClick={() => onSelectTime(time)}
            className={cn(
              "flex items-center justify-center h-14 rounded-xl text-base font-semibold transition-all duration-200 border-2 select-none",
              isSelected 
                ? "bg-brand-primary border-brand-primary text-white shadow-md"
                : "bg-brand-card border-brand-border text-brand-text hover:border-brand-primary/50 hover:bg-brand-pastel/30"
            )}
          >
            {time}
          </motion.button>
        )
      })}
    </motion.div>
  )
}
