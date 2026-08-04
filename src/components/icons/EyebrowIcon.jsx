/* Cejas — stylized, feminine eyebrow with a defined arch and hair detail.
   Thin outline treatment, currentColor, matches the Paty Nails icon system. */
export function EyebrowIcon({ className, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Defined arch */}
      <path d="M3.8 14.2 C5.2 11.4 7.8 9.6 10.6 9.2 C12.2 9.0 13.6 9.6 14.4 10.6 C15.2 11.6 16.4 12.6 19.4 13.8" />
      {/* Inner sculpted hint */}
      <g opacity="0.55" strokeWidth={1.2}>
        <path d="M6.4 12.9 C7.4 11.8 8.6 10.9 10.0 10.5" />
      </g>
      {/* Outer hair strokes */}
      <g opacity="0.6" strokeWidth={1.3}>
        <path d="M15.6 11.9 L16.8 12.5" />
        <path d="M17.3 12.7 L18.4 13.3" />
      </g>
    </svg>
  )
}

export default EyebrowIcon