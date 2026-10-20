import { CostList } from './components/costs/CostList'
import { Toaster } from './components/common/Toaster'
import { AnalysisSection } from './components/analysis/AnalysisSection'
import { EmptyProjects } from './components/layout/EmptyProjects'
import { Layout } from './components/layout/Layout'
import { Sidebar } from './components/layout/Sidebar'
import { ProductForm } from './components/product/ProductForm'
import { BreakdownTable } from './components/results/BreakdownTable'
import { ResultsPanel } from './components/results/ResultsPanel'
import { useProjectResult } from './hooks/useProjectResult'
import { selectActiveProject, useProjectsStore } from './store/useProjectsStore'

function App() {
  const activeProject = useProjectsStore(selectActiveProject)
  const result = useProjectResult(activeProject)

  return (
    <>
      <Layout
        sidebar={<Sidebar />}
        aside={
          activeProject && result ? (
            <ResultsPanel project={activeProject} result={result} />
          ) : undefined
        }
      >
        {activeProject && result ? (
          <div className="flex flex-col gap-4 pb-24 lg:pb-0">
            <ProductForm project={activeProject} />
            <CostList project={activeProject} />
            <BreakdownTable project={activeProject} result={result} />
            <AnalysisSection project={activeProject} result={result} />
          </div>
        ) : (
          <EmptyProjects />
        )}
      </Layout>
      <Toaster />
    </>
  )
}

export default App
