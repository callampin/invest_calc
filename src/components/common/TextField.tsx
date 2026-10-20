import { useId, useState } from 'react'
import { cn } from '../../utils/cn'

export interface TextFieldProps {
  label: string
  value: string
  onCommit: (value: string) => void
  id?: string
  hint?: string
  placeholder?: string
  maxLength?: number
  className?: string
}

/**
 * Campo de texto que mantiene un borrador local y confirma al salir del campo
 * (o con Enter). Así el store puede normalizar sin romper la escritura.
 * Escape descarta el borrador sin salir del campo.
 */
export function TextField({
  label,
  value,
  onCommit,
  id,
  hint,
  placeholder,
  maxLength,
  className,
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  /** Borrador mientras se escribe; null = mostrar el valor del store. */
  const [draft, setDraft] = useState<string | null>(null)

  const displayValue = draft ?? value

  const commit = (): void => {
    const next = draft ?? value
    setDraft(null)

    if (next !== value) {
      onCommit(next)
    }
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        value={displayValue}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          }

          if (event.key === 'Escape') {
            event.preventDefault()
            setDraft(null)
          }
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-describedby={hintId}
        className={cn(
          'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500',
          'focus:border-sky-600 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:focus:ring-sky-900',
        )}
      />
      {hint && (
        <p id={hintId} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  )
}
