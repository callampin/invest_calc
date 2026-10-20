export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Calculadora de Inversión
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Estima inversión, ganancia y punto de equilibrio. Tus datos se guardan solo en este
          navegador.
        </p>
      </div>
    </header>
  )
}
