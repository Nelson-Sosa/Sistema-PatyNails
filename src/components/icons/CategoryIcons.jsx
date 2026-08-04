/* Premium, outline-style category icons for the Paty Nails services catalog.
   Shared visual treatment: round caps/joins, uniform 1.8 stroke, currentColor.
   Manicura, Pedicura and Cejas live in their own component files. */
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
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