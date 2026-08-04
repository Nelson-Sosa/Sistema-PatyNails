/* Inicio (user dashboard) — uses the branded manicure + pedicure illustration.
   Asset pre-processed to remove any white background so it blends into the
   pastel sidebar. Rendered slightly larger than the default glyphs, with an
   inline size so it wins over the shared `h-5 w-5` passed by the nav item. */
export function InicioIcon({ className, ...props }) {
  return (
    <img
      src="/iconoManicuraPedicura-transparente.png"
      alt="Inicio"
      draggable={false}
      className={className}
      style={{ width: 32, height: 28, objectFit: 'contain' }}
      {...props}
    />
  )
}

export default InicioIcon