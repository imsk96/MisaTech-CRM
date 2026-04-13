import clsx from 'clsx'

export default function GlassCard({ children, className, ...props }) {
  return (
    <div 
      className={clsx("glass-card p-6", className)}
      {...props}
    >
      {children}
    </div>
  )
}