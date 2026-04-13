import clsx from 'clsx'

export default function Input({ 
  label, 
  error, 
  className, 
  ...props 
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label}
        </label>
      )}
      <input
        className={clsx(
          "w-full px-4 py-2 rounded-lg border bg-white/10 backdrop-blur-sm",
          "focus:outline-none focus:ring-2 focus:ring-primary",
          error ? "border-red-500" : "border-white/20",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}