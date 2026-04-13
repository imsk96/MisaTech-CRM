import clsx from 'clsx'

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  isLoading,
  className,
  ...props 
}) {
  const baseClasses = "font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
  
  const variants = {
    primary: "bg-primary text-white hover:opacity-90",
    secondary: "bg-white/20 hover:bg-white/30 text-current",
    danger: "bg-red-500 text-white hover:bg-red-600",
  }

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg",
  }

  return (
    <button
      className={clsx(
        baseClasses,
        variants[variant],
        sizes[size],
        "rounded-lg",
        className
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  )
}