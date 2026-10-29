import type { ReactNode } from 'react'
import { GuideProvider } from '../guide/GuideProvider'
import { GuideRestart } from '../guide/GuideRestart'
import { Header } from './Header'
import { Sidebar, type Route } from './Sidebar'

export function AppLayout({ route, children }: { route: Route; children: ReactNode }) {
  return (
    <GuideProvider>
      <div className="app">
        <Header />
        <div className="app__body">
          <Sidebar route={route} />
          <main className={`app__main${route === 'chat' ? ' app__main--fill' : ''}`}>{children}</main>
        </div>
        <GuideRestart route={route} />
      </div>
    </GuideProvider>
  )
}
