import { useId, useState } from 'react'
import { cn } from '../../utils/cn'

export interface NumberInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  id?: string
  hint?: string
  suffix?: string
  placeholder?: string
  integer?: boolean
  min?: number
  max?: number
  disabled?: boolean
  className?: string
}

function toText(value: number): string {
  if (!Number.isFinite(value) || value === 0) {
    return ''
  }

  return String(value)
}

function parseText(text: string): number {
  const parsed = Number.parseFloat(text.replace(',', '.'))

  return Number.isFinite(parsed) ? parsed : 0
}

/** Acepta coma o punto como separador decimal y descarta cualquier otro carácter. */
function sanitizeText(input: string, integer: boolean): string {
  if (integer) {
    return input.replace(/\D/g, '')
  }

  const withoutInvalid = input.replace(/[^\d.,]/g, '')
  const separatorIndex = withoutInvalid.search(/[.,]/)

  if (separatorIndex === -1) {
    return withoutInvalid
  }

  const head = withoutInvalid.slice(0, separatorIndex + 1)
  const tail = withoutInvalid.slice(separatorIndex + 1).replace(/[.,]/g, '')

  return head + tail
}

export function NumberInput({
  label,
  value,
  onChange,
  id,
  hint,
  suffix,
  placeholder = '0',
  integer = false,
  min = 0,
  max,
  disabled = false,
  className,
}: NumberInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  /** Texto que el usuario está escribiendo; null = mostrar el valor del store. */
  const [draft, setDraft] = useState<string | null>(null)

  const displayValue = draft ?? toText(value)

  const clamp = (candidate: number): number => {
    const upper = max ?? Number.POSITIVE_INFINITY
    return Math.min(upper, Math.max(min, candidate))
  }

  const handleChange = (raw: string): void => {
    const sanitized = sanitizeText(raw, integer)
    setDraft(sanitized)

    const next = parseText(sanitized)
    if (next !== value) {
      onChange(next)
    }
  }

  const handleBlur = (): void => {
    const next = clamp(parseText(displayValue))
    setDraft(null)

    if (next !== value) {
      onChange(next)
    }
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode={integer ? 'numeric' : 'decimal'}
          autoComplete="off"
          value={displayValue}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={hintId}
          className={cn(
            'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800',
            'focus:border-sky-600 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:focus:ring-sky-900',
            suffix && 'pr-10',
          )}
        />
        {suffix && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500 dark:text-slate-400"
          >
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  )
}
