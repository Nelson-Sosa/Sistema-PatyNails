/* Uñas acrílicas / esmalte — uses the branded nail-polish illustration asset.
   Rendered as an <img> from the public folder so it scales cleanly. */
export function NailPolishIcon({ className, ...props }) {
  return (
    <img
      src="/esmalte-de-unas.png"
      alt="Esmalte de uñas"
      draggable={false}
      className={className}
      {...props}
    />
  )
}

export default NailPolishIcon