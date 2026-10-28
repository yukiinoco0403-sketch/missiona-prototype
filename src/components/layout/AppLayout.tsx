import type { ReactNode } from 'react'
import { Header } from './Header'
import { Sidebar, type Route } from './Sidebar'

export function AppLayout({ route, children }: { route: Route; children: ReactNode }) {
  return (
    <div className="app">
      <Header />
      <div className="app__body">
        <Sidebar route={route} />
        <main className={`app__main${route === 'chat' ? ' app__main--fill' : ''}`}>{children}</main>
      </div>
    </div>
  )
}
