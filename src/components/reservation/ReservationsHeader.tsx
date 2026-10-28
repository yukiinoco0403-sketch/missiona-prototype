import { Calendar, CornerDownLeft } from 'lucide-react'
import { Button } from '../ui/Button'
import { Tabs } from '../ui/Tabs'
import { shop } from '../../data/reservations'
import { navigate } from '../../lib/navigation'

const tabs = [
  { id: 'today', label: '本日／新着の予約' },
  { id: 'calendar', label: '予約カレンダー' },
  { id: 'course', label: 'コース' },
  { id: 'settings', label: '予約設定' },
  { id: 'payment', label: '決済連携', tag: '利用なし' },
]

/** 予約管理の共通ヘッダー（パンくず・店舗名・上部タブ）。この2画面だけが移動先として動く。 */
export function ReservationsHeader({ active }: { active: 'today' | 'settings' }) {
  return (
    <>
      <nav className="breadcrumb t-small" aria-label="パンくず">
        <a href="#" onClick={(e) => e.preventDefault()}>カレンダー一覧</a>
        <span aria-hidden="true">&gt;</span>
        <span aria-current="page">{shop.shortName}</span>
      </nav>

      <div className="page__head">
        <h1 className="page__shop">{shop.name}</h1>
        <div className="page__actions">
          <Button icon={<Calendar size={16} strokeWidth={1.75} aria-hidden="true" />}>予約カレンダーを見る</Button>
          <Button icon={<CornerDownLeft size={16} strokeWidth={1.75} aria-hidden="true" />}>一覧ページに戻る</Button>
        </div>
      </div>

      <Tabs
        items={tabs}
        activeId={active}
        ariaLabel="予約管理メニュー"
        onSelect={(id) => {
          if (id === 'today') navigate('#/reservations')
          else if (id === 'settings') navigate('#/settings')
        }}
      />
    </>
  )
}
