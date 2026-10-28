import {
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  CircleX,
  ClipboardList,
  CalendarDays,
  FileText,
  LogOut,
  Megaphone,
  MessageCircle,
  MessageCircleMore,
  QrCode,
  Rows3,
  Store,
  Table,
  UserRound,
  Wallet,
  Workflow,
  Wrench,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { setSidebarCollapsed, useSidebarCollapsed } from '../../store/sidebarStore'

export type Route = 'reservations' | 'chat' | 'settings'

interface NavItem {
  label: string
  route?: Route
  icon: ReactNode
  hasChildren?: boolean
  badge?: number
}

interface NavSection {
  title: string
  items: NavItem[]
}

const ic = (Icon: typeof Table) => <Icon size={16} strokeWidth={1.75} aria-hidden="true" />

/** スクリーンショットで確認できた項目のみ（順序も同じ） */
const sections: NavSection[] = [
  { title: 'お気に入り', items: [] },
  {
    title: 'メッセージ関連',
    items: [
      { label: '1:1チャット', route: 'chat', icon: ic(MessageCircle), hasChildren: true, badge: 4 },
      { label: 'テンプレート', icon: ic(FileText) },
      { label: 'メッセージ配信', icon: ic(MessageCircleMore) },
      { label: 'ステップ配信', icon: ic(Workflow) },
      { label: 'あいさつメッセージ', icon: ic(UserRound), hasChildren: true },
    ],
  },
  {
    title: 'よく使われる機能',
    items: [
      { label: 'リッチメニュー', icon: ic(Table) },
      { label: 'フォーム作成', icon: ic(ClipboardList) },
      { label: '自動応答', icon: ic(Megaphone) },
      { label: 'QRコードアクション', icon: ic(QrCode) },
      { label: 'データ管理', icon: ic(Rows3), hasChildren: true },
    ],
  },
  {
    title: 'その他の機能',
    items: [
      { label: '予約管理', route: 'reservations', icon: ic(CalendarDays), hasChildren: true },
      { label: '商品販売', icon: ic(Store) },
      { label: 'データ分析', icon: ic(ChartColumn), hasChildren: true },
      { label: '便利ツール', icon: ic(Wrench), hasChildren: true },
      { label: '有料プラン限定', icon: ic(Wallet), hasChildren: true },
    ],
  },
  {
    title: 'システム関連',
    items: [
      { label: '送信エラー', icon: ic(CircleX) },
      { label: 'ログアウト', icon: ic(LogOut) },
    ],
  },
]

export function Sidebar({ route: pageRoute }: { route: Route }) {
  // 予約設定は「予約管理」の中の画面なので、サイドバーでは予約管理を選択中にする
  const route = pageRoute === 'settings' ? 'reservations' : pageRoute
  const collapsed = useSidebarCollapsed()
  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <nav className="sidebar__scroll" aria-label="メインメニュー" tabIndex={0}>
        {sections.map((section) => (
          <div className="sidebar__section" key={section.title}>
            <p className="sidebar__title t-small">{section.title}</p>
            <ul>
              {section.items.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.route ? `#/${item.route}` : '#'}
                    className={`sidebar__item${item.route === route ? ' is-current' : ''}`}
                    aria-current={item.route === route ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    onClick={item.route ? undefined : (e) => e.preventDefault()}
                  >
                    <span className="sidebar__icon">{item.icon}</span>
                    <span className="sidebar__label">{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="sidebar__badge" aria-label={`未読${item.badge}件`}>
                        {item.badge}
                      </span>
                    )}
                    {item.hasChildren && (
                      <ChevronRight className="sidebar__chevron" size={16} strokeWidth={1.75} aria-hidden="true" />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <button
        type="button"
        className="sidebar__collapse"
        aria-label={collapsed ? 'サイドバーを開く' : 'サイドバーを閉じる'}
        aria-expanded={!collapsed}
        onClick={() => setSidebarCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight size={14} strokeWidth={2} aria-hidden="true" /> : <ChevronLeft size={14} strokeWidth={2} aria-hidden="true" />}
      </button>
    </aside>
  )
}
