import type { ReactNode } from 'react'
import { Header } from './Header'

export interface LayoutProps {
  sidebar: ReactNode
  aside?: ReactNode
  children: ReactNode
}

export function Layout({ sidebar, aside, children }: LayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-6 md:flex-row md:items-start md:gap-6">
        <aside className="md:w-56 md:shrink-0">
          <div className="md:sticky md:top-6">{sidebar}</div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
        {aside && (
          <aside aria-label="Resultados del proyecto" className="lg:w-80 lg:shrink-0">
            <div className="lg:sticky lg:top-6">{aside}</div>
          </aside>
        )}
      </div>
    </div>
  )
}
