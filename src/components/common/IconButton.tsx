import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'
import { Button } from './Button'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  tone?: 'default' | 'danger'
}

export function IconButton({
  label,
  tone = 'default',
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={label}
      title={label}
      className={cn(
        'px-1.5 py-1',
        tone === 'danger' && 'text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950',
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  )
}
