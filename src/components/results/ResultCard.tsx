import { cn } from '../../utils/cn'

export type ResultTone = 'default' | 'positive' | 'negative'

export interface ResultCardProps {
  label: string
  value: string
  hint?: string
  tone?: ResultTone
  emphasis?: boolean
}

const TONE_CLASSES: Record<ResultTone, string> = {
  default: 'text-slate-900 dark:text-slate-50',
  positive: 'text-emerald-700 dark:text-emerald-400',
  negative: 'text-red-700 dark:text-red-400',
}

export function ResultCard({
  label,
  value,
  hint,
  tone = 'default',
  emphasis = false,
}: ResultCardProps) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
      <dt className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</dt>
      <dd
        className={cn(
          'tabular-nums',
          emphasis ? 'text-xl font-semibold' : 'text-base font-semibold',
          TONE_CLASSES[tone],
        )}
      >
        <span className="flex flex-wrap items-center gap-1">
          {tone === 'negative' && (
            <>
              <span aria-hidden="true">▼</span>
              <span className="sr-only">negativo</span>
            </>
          )}
          <span>{value}</span>
        </span>
        {hint && (
          <span className="mt-0.5 block text-[11px] font-normal text-slate-500 dark:text-slate-400">
            {hint}
          </span>
        )}
      </dd>
    </div>
  )
}
