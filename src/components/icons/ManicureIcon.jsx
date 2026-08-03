export function ManicureIcon({ className, ...props }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Pinky */}
      <path d="M5 12V7a1.5 1.5 0 0 0-3 0v6" />
      {/* Ring */}
      <path d="M9 12V5a1.5 1.5 0 0 0-3 0v7" />
      {/* Middle */}
      <path d="M13 12V4a1.5 1.5 0 0 0-3 0v8" />
      {/* Index */}
      <path d="M17 12V6a1.5 1.5 0 0 0-3 0v6" />
      {/* Hand body & Thumb */}
      <path d="M2 13v3c0 3 2.5 6 5.5 6h5c3 0 5.5-3 5.5-6v-3" />
      <path d="M18 13v-1a1.5 1.5 0 0 1 3 0v3" />
      
      {/* Painted Nails */}
      {/* Pinky */}
      <path d="M4.5 6.5C4.5 5 4 4.5 3.5 4.5C3 4.5 2.5 5 2.5 6.5V7.5H4.5V6.5Z" fill="currentColor" stroke="none" />
      {/* Ring */}
      <path d="M8.5 4.5C8.5 3 8 2.5 7.5 2.5C7 2.5 6.5 3 6.5 4.5V5.5H8.5V4.5Z" fill="currentColor" stroke="none" />
      {/* Middle */}
      <path d="M12.5 3.5C12.5 2 12 1.5 11.5 1.5C11 1.5 10.5 2 10.5 3.5V4.5H12.5V3.5Z" fill="currentColor" stroke="none" />
      {/* Index */}
      <path d="M16.5 5.5C16.5 4 16 3.5 15.5 3.5C15 3.5 14.5 4 14.5 5.5V6.5H16.5V5.5Z" fill="currentColor" stroke="none" />
      {/* Thumb */}
      <path d="M20.5 11.5C20.5 10 20 9.5 19.5 9.5C19 9.5 18.5 10 18.5 11.5V12.5H20.5V11.5Z" fill="currentColor" stroke="none" />
    </svg>
  )
}
