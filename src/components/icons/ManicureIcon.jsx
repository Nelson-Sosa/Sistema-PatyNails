/* Manicura — uses the branded manicure illustration asset.
   Rendered as an <img> from the public folder so it scales cleanly
   (crisp at 2x on the small CategoryCard badge). */
export function ManicureIcon({ className, ...props }) {
  return (
    <img
      src="/manicura.png"
      alt="Manicura"
      draggable={false}
      className={className}
      {...props}
    />
  )
}

export default ManicureIcon