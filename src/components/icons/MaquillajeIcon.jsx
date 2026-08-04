/* Maquillaje — uses the branded makeup illustration asset.
   Rendered as an <img> from the public folder so it scales cleanly
   (crisp at 2x on the small CategoryCard badge). */
export function MaquillajeIcon({ className, ...props }) {
  return (
    <img
      src="/maquillaje.png"
      alt="Maquillaje"
      draggable={false}
      className={className}
      {...props}
    />
  )
}

export default MaquillajeIcon