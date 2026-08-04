const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

/* Manicura — elegant female hand with long, polished almond nails */
export function ManicureIcon({ className, ...props }) {
  return (
    <svg {...base} className={className} aria-hidden="true" {...props}>
      {/* Fingers */}
      <path d="M5.6 16.5 V6.4" />
      <path d="M9 16.5 V4.8" />
      <path d="M12.4 16.5 V3.8" />
      <path d="M15.8 16.5 V4.8" />
      {/* Thumb */}
      <path d="M18.2 15 V10.2" />
      {/* Palm & wrist */}
      <path d="M5.2 14.2 C4.4 17.4 5.6 19.4 7.6 20.2 L15 20.2 C17.6 20 18.6 18.2 18.8 15.4" />
      {/* Painted almond nails */}
      <path d="M5.6 6.0 C6.5 6.4 6.6 7.2 5.6 8.3 C4.6 7.2 4.7 6.4 5.6 6.0 Z" fill="currentColor" stroke="none" />
      <path d="M9.0 4.4 C9.9 4.8 10.0 5.6 9.0 6.7 C8.0 5.6 8.1 4.8 9.0 4.4 Z" fill="currentColor" stroke="none" />
      <path d="M12.4 3.4 C13.3 3.8 13.4 4.6 12.4 5.7 C11.4 4.6 11.5 3.8 12.4 3.4 Z" fill="currentColor" stroke="none" />
      <path d="M15.8 4.4 C16.7 4.8 16.8 5.6 15.8 6.7 C14.8 5.6 14.9 4.8 15.8 4.4 Z" fill="currentColor" stroke="none" />
      <path d="M19.6 8.0 C20.3 8.0 20.8 8.5 20.5 9.5 C19.8 9.8 19.0 9.5 19.6 8.0 Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

/* Pedicura — elegant foot with a perfectly groomed toenail */
export function PedicureIcon({ className, ...props }) {
  return (
    <svg {...base} className={className} aria-hidden="true" {...props}>
      {/* Foot silhouette pointing right */}
      <path d="M5.6 9.9 C4.2 13.1 4.8 16.4 7.2 17.3 Q13.4 18.9 15.9 17.1 Q17.9 15.9 17.1 13.7 L17.5 12.2 C17.0 10.6 15.6 10.2 14.7 11.0 L14.1 12.9 C12.5 11.7 10.7 10.9 8.2 10.5 C7.2 10.2 6.3 10.0 5.6 9.9 Z" />
      {/* Painted toenail */}
      <path d="M16.8 11.3 C17.9 11.9 17.9 12.8 17.3 13.9 C16.2 13.5 15.8 12.5 16.8 11.3 Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

/* Cejas — a single stylized, arched eyebrow */
export function EyebrowIcon({ className, ...props }) {
  return (
    <svg {...base} className={className} aria-hidden="true" {...props}>
      <path d="M5 14.2 C7.5 10.9 11.8 10.4 15.2 11.6 C17.4 12.4 18.6 13.4 19.2 14.8 C17.4 14.2 15.4 13.9 13.4 14.0 C10.0 14.0 7.4 15.2 6.2 16.0 C5.6 15.4 5.2 14.8 5 14.2 Z" />
    </svg>
  )
}

/* Pestañas — a minimal stylized eye with long lashes */
export function LashIcon({ className, ...props }) {
  return (
    <svg {...base} className={className} aria-hidden="true" {...props}>
      {/* Eye lid */}
      <path d="M4.3 10.5 C6.6 7.4 17.4 7.4 19.7 10.5 C17.4 13.6 6.6 13.6 4.3 10.5 Z" />
      {/* Upper lashes */}
      <path d="M6.3 8.0 L5.2 5.4" />
      <path d="M9.5 7.2 L9.1 4.5" />
      <path d="M13 6.3 L12.9 3.6" />
      <path d="M16.4 7.1 L17.0 4.4" />
      <path d="M18.8 8.4 L20.2 6.8" />
    </svg>
  )
}

/* Uñas Acrílicas / Soft Gel / Nail Art — premium nail-polish bottle with brush */
export function PolishIcon({ className, ...props }) {
  return (
    <svg {...base} className={className} aria-hidden="true" {...props}>
      {/* Brush handle */}
      <path d="M12 4.2 L12 5.8" />
      {/* Cap */}
      <path d="M10.6 5.8 h2.8 a.8 .8 0 0 1 .8 .8 v1.4 a.8 .8 0 0 1 -.8 .8 h-2.8 a.8 .8 0 0 1 -.8 -.8 v-1.4 a.8 .8 0 0 1 .8 -.8 Z" />
      {/* Bottle body */}
      <path d="M9.0 9.2 h6.0 a.9 .9 0 0 1 .9 .9 v8.2 a.9 .9 0 0 1 -.9 .9 h-6.0 a.9 .9 0 0 1 -.9 -.9 v-8.2 a.9 .9 0 0 1 .9 -.9 Z" />
      {/* Brush tip inside bottle */}
      <path d="M12 9.4 L12 13.4" />
    </svg>
  )
}
