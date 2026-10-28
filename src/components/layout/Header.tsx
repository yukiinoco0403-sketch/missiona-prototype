import { Bell, CircleQuestionMark, MessageCircleMore, QrCode, Sparkles } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Logo } from './Logo'
import { operator, shop } from '../../data/reservations'

const Caret = () => (
  <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
    <path d="M0 0h10L5 6z" fill="currentColor" />
  </svg>
)

export function Header() {
  return (
    <header className="header">
      <div className="header__brand">
        <Logo />
      </div>

      <button type="button" className="header__shop" aria-label={`アカウント切り替え：${shop.name}`}>
        <Avatar initial={shop.initial} tone="dark" size={24} />
        <span className="header__shop-name">{shop.name}</span>
        <Caret />
      </button>

      <button type="button" className="header__qr" aria-label="QRコードを表示">
        <QrCode size={20} strokeWidth={1.75} />
      </button>

      <div className="header__right">
        <Button
          variant="outline-link"
          size="sm"
          icon={<Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />}
        >
          アップグレード
        </Button>

        <div className="header__tools">
          <button type="button" className="header__tool">
            <MessageCircleMore size={20} strokeWidth={1.75} aria-hidden="true" />
            <span className="t-small">配信数</span>
          </button>
          <button type="button" className="header__tool">
            <CircleQuestionMark size={20} strokeWidth={1.75} aria-hidden="true" />
            <span className="t-small">サポート</span>
          </button>
          <button type="button" className="header__tool header__tool--notice">
            <span className="header__tool-icon">
              <Bell size={20} strokeWidth={1.75} aria-hidden="true" />
              <span className="header__dot" aria-hidden="true" />
            </span>
            <span className="t-small">お知らせ</span>
            <span className="sr-only">（未読あり）</span>
          </button>
        </div>

        <button type="button" className="header__user" aria-label={`ユーザーメニュー：${operator.name}`}>
          <span className="header__user-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="12" fill="var(--color-gray-ddd)" />
              <circle cx="12" cy="9.500" r="4" fill="var(--color-white)" />
              <path d="M4.500 20c1.400-3.600 4.200-5.300 7.500-5.300s6.100 1.700 7.500 5.300A11.900 11.900 0 0 1 12 24c-2.900 0-5.600-1.100-7.500-4z" fill="var(--color-white)" />
            </svg>
          </span>
          <span className="t-body-strong header__user-name">{operator.name}</span>
          <Caret />
        </button>
      </div>
    </header>
  )
}
