/* Pedicura — uses the branded pedicure illustration asset.
   Rendered as an <img> from the public folder so it scales cleanly
   (crisp at 2x on the small CategoryCard badge). */
export function PedicureIcon({ className, ...props }) {
  return (
    <img
      src="/pedicure.png"
      alt="Pedicura"
      draggable={false}
      className={className}
      {...props}
    />
  )
}

export default PedicureIcon