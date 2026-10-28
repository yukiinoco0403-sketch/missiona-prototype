import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/ui.css'
import './styles/pages.css'
import './styles/detail.css'
import './styles/memo.css'
import './styles/chat.css'
import './styles/settings.css'
import { AppLayout } from './components/layout/AppLayout'
import type { Route } from './components/layout/Sidebar'
import { ChatPage } from './pages/ChatPage'
import { ReservationSettings } from './pages/ReservationSettings'
import { TodayReservations } from './pages/TodayReservations'
import { watchNavigation } from './lib/navigation'

const readRoute = (): Route =>
  location.hash.startsWith('#/chat') ? 'chat' : location.hash.startsWith('#/settings') ? 'settings' : 'reservations'

const TITLES: Record<Route, string> = {
  chat: '1:1チャット',
  settings: '予約設定',
  reservations: '本日／新着の予約',
}

function App() {
  const [route, setRoute] = useState<Route>(readRoute)
  useEffect(() => {
    return watchNavigation(() => setRoute(readRoute()))
  }, [])
  useEffect(() => {
    document.title = `${TITLES[route]} | L Message（採用課題用プロトタイプ）`
  }, [route])

  return (
    <AppLayout route={route}>
      {route === 'chat' ? <ChatPage /> : route === 'settings' ? <ReservationSettings /> : <TodayReservations />}
    </AppLayout>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
