/* Servicios — uses the branded services illustration asset.
   Transparent background, rendered slightly larger than the default glyphs
   with an inline size so it wins over the shared `h-5 w-5` passed by the nav. */
export function ServiciosIcon({ className, ...props }) {
  return (
    <img
      src="/sevicios.png"
      alt="Servicios"
      draggable={false}
      className={className}
      style={{ width: 30, height: 30, objectFit: 'contain' }}
      {...props}
    />
  )
}

export default ServiciosIcon