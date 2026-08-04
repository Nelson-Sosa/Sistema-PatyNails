/* Inicio (user dashboard) — uses the branded nail-polish illustration.
   Transparent background, rendered slightly larger than the default glyphs
   with an inline size so it wins over the shared `h-5 w-5` passed by the nav. */
export function InicioIcon({ className, ...props }) {
  return (
    <img
      src="/esmalte-de-unas%20inicio.png"
      alt="Inicio"
      draggable={false}
      className={className}
      style={{ width: 30, height: 30, objectFit: 'contain' }}
      {...props}
    />
  )
}

export default InicioIcon