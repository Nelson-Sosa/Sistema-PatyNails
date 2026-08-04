/* Pedicura — elegant female foot in profile with distinct toes and polished nails.
   Thin outline treatment, currentColor, matches the Paty Nails icon system. */
export function PedicureIcon({ className, ...props }) {
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
      {/* Foot silhouette: heel → ankle → instep → toes → sole */}
      <path d="M3.6 18.6 C2.9 17.0 3.2 15.2 4.1 13.8 C5.0 12.4 6.1 11.6 6.9 10.6 C7.6 9.8 7.9 8.8 8.2 7.9 C8.5 7.0 9.3 6.5 10.3 6.8 C10.9 7.0 11.2 7.6 10.9 8.1 C10.7 8.6 10.1 8.7 9.9 9.2 C9.7 9.7 9.8 10.3 9.6 10.9 C9.4 11.4 9.0 11.5 9.2 12.1 C9.4 12.8 9.3 13.6 9.6 14.3 C9.9 15.0 9.9 15.8 9.5 16.5 C8.6 17.9 7.2 18.5 5.8 18.2 C5.0 18.1 4.2 18.4 3.6 18.6 Z" />
      {/* Painted toenails */}
      <g fill="currentColor" stroke="none">
        <path d="M11.06 7.98 C12.19 7.39 12.37 5.98 12.14 6.42 C12.63 6.32 11.22 6.1 10.34 7.02 C10.16 7.38 10.36 7.34 10.7 7.5 C10.75 7.87 10.66 8.05 11.06 7.98 Z" />
        <path d="M10.05 10.26 C10.88 9.7 10.84 8.55 10.71 8.92 C11.08 8.8 9.93 8.73 9.35 9.54 C9.25 9.84 9.41 9.8 9.7 9.9 C9.79 10.2 9.74 10.35 10.05 10.26 Z" />
        <path d="M9.89 12.53 C10.45 11.87 10.11 10.92 10.1 11.26 C10.39 11.07 9.39 11.27 9.11 12.08 C9.11 12.35 9.22 12.28 9.5 12.3 C9.66 12.53 9.65 12.67 9.89 12.53 Z" />
      </g>
    </svg>
  )
}

export default PedicureIcon