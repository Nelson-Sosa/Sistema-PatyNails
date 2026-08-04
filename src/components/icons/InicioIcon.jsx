/* Inicio (user dashboard) — uses the branded manicure + pedicure illustration.
   Asset pre-processed to remove any white background so it blends into the
   pastel sidebar. Rendered as an <img>, letterboxed to keep proportions. */
export function InicioIcon({ className, ...props }) {
  return (
    <img
      src="/iconoManicuraPedicura-transparente.png"
      alt="Inicio"
      draggable={false}
      className={`${className ?? ''} object-contain`}
      {...props}
    />
  )
}

export default InicioIcon