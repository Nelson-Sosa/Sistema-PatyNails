/* Premium, outline-style category icons for the Paty Nails services catalog.
   Shared visual treatment: round caps/joins, uniform 1.8 stroke, currentColor. */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

/* Manicura — elegant open hand with long, polished almond nails */
export function ManicureIcon({ className, ...props }) {
  return (
    <svg {...base} className={className} aria-hidden="true" {...props}>
      {/* Fingers */}
      <path d="M5.6 16.5 V6.6" />
      <path d="M9.2 16.5 V4.5" />
      <path d="M12.8 16.5 V3.4" />
      <path d="M16.4 16.5 V4.5" />
      {/* Thumb */}
      <path d="M18.6 15.2 L20.6 10.6" />
      {/* Palm & wrist */}
      <path d="M5.2 12.6 C4.4 17.2 5.8 19.6 8.6 20.1 C11.4 20.6 14.6 20 16.6 18.4 C18 17.4 19 16.2 18.9 14.6" />
      {/* Painted almond nails */}
      <path d="M5.6 4.5 C6.6 4.9 6.8 5.6 5.6 6.8 C4.4 5.6 4.6 4.9 5.6 4.5 Z" fill="currentColor" stroke="none" />
      <path d="M9.2 2.9 C10.2 3.3 10.4 4.0 9.2 5.2 C8.0 4.0 8.2 3.3 9.2 2.9 Z" fill="currentColor" stroke="none" />
      <path d="M12.8 1.5 C13.8 1.9 14.0 2.6 12.8 3.8 C11.6 2.6 11.8 1.9 12.8 1.5 Z" fill="currentColor" stroke="none" />
      <path d="M16.4 2.9 C17.4 3.3 17.6 4.0 16.4 5.2 C15.2 4.0 15.4 3.3 16.4 2.9 Z" fill="currentColor" stroke="none" />
      <path d="M20.6 8.8 C21.3 8.8 21.6 9.4 21.4 10.2 C20.6 10.5 19.9 10.2 20.6 8.8 Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

/* Pedicura — elegant foot with a perfectly groomed toenail */
export function PedicureIcon({ className, ...props }) {
  return (
    <svg {...base} className={className} aria-hidden="true" {...props}>
      {/* Foot silhouette (profile, pointing right) */}
      <path d="M7.2 8.6 C5.6 11.0 5.0 13.9 5.8 16.0 C4.0 17.2 3.3 19.0 4.6 20.1 C6.2 21.2 9.4 20.2 11.8 19.4 C14.6 18.5 16.4 17.5 17.4 15.6 C18.0 14.5 18.0 13.2 17.2 12.4 L18.0 10.6 C18.5 9.6 17.6 8.6 16.4 9.2 C15.5 9.6 15.0 10.5 14.6 11.4 C13.0 9.8 10.8 8.8 9.2 8.4 C8.4 8.2 7.7 8.1 7.2 8.0 Z" />
      {/* Painted toenail */}
      <path d="M18.4 12.6 C19.3 12.5 19.9 13.1 19.6 14.2 C18.7 14.6 17.9 14.0 18.4 12.6 Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

/* Cejas — a single stylized, arched eyebrow */
export function EyebrowIcon({ className, ...props }) {
  return (
    <svg {...base} className={className} aria-hidden="true" {...props}>
      <path d="M5 14.4 C8.2 10.2 13.4 9.8 17 11.6 C18.8 12.5 19.6 13.6 20 15.1" />
      <path d="M6.2 13.4 C7 11.9 8.3 10.7 9.9 10.1" opacity="0.6" strokeWidth="1.3" />
    </svg>
  )
}

/* Pestañas — minimal stylized eye with long lashes */
export function LashIcon({ className, ...props }) {
  return (
    <svg {...base} className={className} aria-hidden="true" {...props}>
      {/* Eye lid */}
      <path d="M4.3 10.5 C6.6 7.4 17.4 7.4 19.7 10.5 C17.4 13.6 6.6 13.6 4.3 10.5 Z" />
      {/* Iris hint */}
      <path d="M9.2 10.5 C9.2 9.6 14.8 9.6 14.8 10.5 C14.8 11.4 9.2 11.4 9.2 10.5 Z" strokeWidth="1.6" opacity="0.9" />
      {/* Upper lashes */}
      <path d="M6.3 8.0 L5.3 5.4" />
      <path d="M9.6 7.1 L9.2 4.5" />
      <path d="M13 6.0 L12.9 3.4" />
      <path d="M16.4 7.0 L17.0 4.4" />
      <path d="M18.9 8.4 L20.2 6.8" />
      {/* Lower lash hint */}
      <path d="M7.4 13.1 L6.6 15.0" />
      <path d="M16.6 13.0 L17.2 14.9" />
    </svg>
  )
}

/* Uñas Acrílicas / Soft Gel / Nail Art — premium nail-polish bottle with brush */
export function PolishIcon({ className, ...props }) {
  return (
    <svg {...base} className={className} aria-hidden="true" {...props}>
      {/* Brush handle */}
      <path d="M12 4.2 L12 5.6" />
      {/* Cap */}
      <path d="M10.6 5.6 h2.8 a.8 .8 0 0 1 .8 .8 v1.4 a.8 .8 0 0 1 -.8 .8 h-2.8 a.8 .8 0 0 1 -.8 -.8 v-1.4 a.8 .8 0 0 1 .8 -.8 Z" />
      {/* Bottle body */}
      <path d="M9.0 9.4 h6.0 a.95 .95 0 0 1 .95 .95 v7.7 a.95 .95 0 0 1 -.95 .95 h-6.0 a.95 .95 0 0 1 -.95 -.95 v-7.7 a.95 .95 0 0 1 .95 -.95 Z" />
      {/* Brush tip inside bottle */}
      <path d="M12 9.6 L12 13.4" />
    </svg>
  )
}