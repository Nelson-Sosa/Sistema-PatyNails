/* Manicura — elegant, slightly inclined hand with long painted almond nails.
   Thin outline treatment, currentColor, matches the Paty Nails icon system. */
export function ManicureIcon({ className, ...props }) {
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
      {/* Palm & wrist */}
      <path d="M6.8 21.6 C6.0 18.6 6.4 15.6 8.1 13.6 C9.3 12.3 10.3 11.4 11.1 10.8" />
      <path d="M7.9 21.6 C9.4 21.3 10.6 20.5 11.4 19.3 C12.1 18.2 12.4 16.6 11.8 15.0" />
      {/* Thumb */}
      <path d="M8.9 15.8 C7.6 15.0 6.2 13.6 5.3 11.5" />
      {/* Fingers */}
      <path d="M11.8 16.4 C12.6 15.4 13.4 14.4 14.4 13.2" />
      <path d="M11.5 14.4 C13.0 13.1 14.3 11.8 16.2 10.3" />
      <path d="M11.3 12.5 C13.1 11.1 15.0 9.6 18.0 7.5" />
      <path d="M11.1 10.8 C13.0 9.3 15.6 7.6 19.6 5.0" />
      {/* Painted almond nails */}
      <g fill="currentColor" stroke="none">
        <path d="M5.83 11.27 C5.47 9.9 4.13 9.28 4.51 9.66 C4.5 9.12 4.03 10.52 4.77 11.73 C5.08 12.03 5.09 11.81 5.3 11.5 C5.67 11.56 5.83 11.71 5.83 11.27 Z" />
        <path d="M14.86 13.58 C15.92 12.64 15.84 11.15 15.68 11.66 C16.16 11.41 14.67 11.61 13.94 12.82 C13.82 13.24 14.02 13.14 14.4 13.2 C14.53 13.56 14.47 13.78 14.86 13.58 Z" />
        <path d="M16.58 10.79 C17.93 10 18.22 8.43 17.93 8.94 C18.49 8.77 16.89 8.69 15.82 9.81 C15.59 10.23 15.82 10.17 16.2 10.3 C16.24 10.7 16.12 10.91 16.58 10.79 Z" />
        <path d="M18.36 8.01 C19.86 7.22 20.33 5.6 19.97 6.12 C20.58 5.96 18.9 5.85 17.64 6.99 C17.36 7.42 17.61 7.36 18 7.5 C18 7.92 17.86 8.13 18.36 8.01 Z" />
        <path d="M19.97 5.5 C21.5 4.62 21.97 2.95 21.6 3.5 C22.23 3.3 20.5 3.28 19.23 4.5 C18.94 4.95 19.2 4.88 19.6 5 C19.6 5.42 19.46 5.65 19.97 5.5 Z" />
      </g>
    </svg>
  )
}

export default ManicureIcon