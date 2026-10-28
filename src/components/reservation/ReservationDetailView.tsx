import { useLayoutEffect, useRef } from 'react'
import { ArrowLeftRight, CreditCard, List, NotebookText, X } from 'lucide-react'
import { CloseIcon } from '../ui/CloseIcon'
import { DETAIL_HERO_PHOTO } from '../../data/photos'
import { Avatar } from '../ui/Avatar'
import type { Customer } from '../../data/customers'
import { formatDetailDate, shop, type Reservation } from '../../data/reservations'
import { ReservationHistorySections } from './ReservationHistorySections'

interface Props {
  reservation: Reservation
  customer: Customer
  tab: 'info' | 'payment'
  onTab: (t: 'info' | 'payment') => void
  /** 'info'＝予約情報／'history'＝予約履歴（同じパネル内で本文を切り替える） */
  mode: 'info' | 'history'
  onToggleMode: () => void
  initialScroll: number
  onScroll: (top: number) => void
  onClose: () => void
  onOpenMemo: (trigger: HTMLElement) => void
}

/** 予約の詳細パネルの上部の写真（装飾なので代替テキストは空） */
function HeroPhoto() {
  return <img className="detail__hero" src={DETAIL_HERO_PHOTO} alt="" />
}

function Field({ label, children, tall = false }: { label: string; children?: string; tall?: boolean }) {
  return (
    <>
      <dt className="detail__label t-small">{label}</dt>
      <dd className={`detail__field${tall ? ' detail__field--tall' : ''}`}>{children}</dd>
    </>
  )
}

export function ReservationDetailView({
  reservation: r,
  customer,
  tab,
  onTab,
  mode,
  onToggleMode,
  initialScroll,
  onScroll,
  onClose,
  onOpenMemo,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const cancelled = r.status === 'cancelled'

  // 戻ってきたときにスクロール位置を復元
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = initialScroll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="panel-view">
      <button type="button" className="detail__close" aria-label="閉じる" onClick={onClose}>
        <CloseIcon />
      </button>

      <div className="detail__scroll" ref={scrollRef} onScroll={(e) => onScroll(e.currentTarget.scrollTop)}>
        <HeroPhoto />

        <div className={`detail__status detail__status--${r.status}`}>
          <span className="detail__status-label">
            {cancelled ? (
              <X size={16} strokeWidth={3} aria-hidden="true" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="6" fill="none" stroke="#fff" strokeWidth="2.4" />
              </svg>
            )}
            {cancelled ? 'キャンセル' : '予約確定'}
          </span>
          <span className="detail__status-actions">
            {/* 改善②：お客様メモ（顧客IDで対象を特定） */}
            <button type="button" className="detail__chip" data-chip="memo" onClick={(e) => onOpenMemo(e.currentTarget)}>
              <NotebookText size={14} strokeWidth={2} aria-hidden="true" />
              お客様メモ
            </button>
            {/* クリックで「予約履歴」⇄「予約情報」と文言が切り替わる */}
            <button
              type="button"
              className="detail__chip"
              data-chip="toggle"
              aria-controls={mode === 'info' ? 'detail-panel-info' : 'detail-history'}
              onClick={() => {
                onToggleMode()
                // 帯（ボタン）が画面外や右上の×の下に隠れないよう、ヒーロー画像が少し見える位置までにそろえる
                const el = scrollRef.current
                if (el) el.scrollTop = Math.min(el.scrollTop, 222 - 56)
              }}
            >
              <ArrowLeftRight size={14} strokeWidth={2} aria-hidden="true" />
              {mode === 'info' ? '予約履歴' : '予約情報'}
            </button>
          </span>
        </div>

        <div className="detail__body">
          <div className="detail__customer">
            <Avatar initial={customer.avatarInitial} tone={customer.avatarTone} size={48} />
            <a href="#" id="detail-name" className="detail__name" onClick={(e) => e.preventDefault()}>
              {customer.displayName}
            </a>
          </div>

          <p className="detail__datetime">
            {formatDetailDate(r.date)} {r.startTime}~{r.endTime}
          </p>
          <p className="detail__course">
            {r.course} ({r.courseMinutes}分コース) / {r.staff}
          </p>

          <span className="sr-only" role="status">
            {mode === 'history' ? '予約履歴を表示しています' : '予約情報を表示しています'}
          </span>

          {mode === 'history' ? (
            <>
              <ReservationHistorySections reservation={r} />
              <div className="detail__footer detail__footer--history">
                <button type="button" className="detail__close-btn" onClick={onClose}>
                  閉じる
                </button>
              </div>
            </>
          ) : (
            <>
          <div className="detail__tabs" role="tablist" aria-label="詳細の種類">
            <button
              type="button"
              role="tab"
              id="detail-tab-info"
              aria-selected={tab === 'info'}
              aria-controls="detail-panel-info"
              className={`detail__tab${tab === 'info' ? ' is-selected' : ''}`}
              onClick={() => onTab('info')}
            >
              <List size={14} strokeWidth={2} aria-hidden="true" />
              お客様情報
            </button>
            <button
              type="button"
              role="tab"
              id="detail-tab-payment"
              aria-selected={tab === 'payment'}
              aria-controls="detail-panel-payment"
              className={`detail__tab${tab === 'payment' ? ' is-selected' : ''}`}
              onClick={() => onTab('payment')}
            >
              <CreditCard size={14} strokeWidth={2} aria-hidden="true" />
              決済情報
            </button>
          </div>

          {tab === 'info' ? (
            <div role="tabpanel" id="detail-panel-info" aria-labelledby="detail-tab-info">
              <a href="#" className="detail__edit" onClick={(e) => e.preventDefault()}>
                お客様情報を編集
              </a>
              <dl className="detail__answers">
                <Field label={`${shop.shortName}のご利用は初めてですか?`}>{r.answers.firstVisit}</Field>
                <Field label="お名前を入力してください">{r.answers.name}</Field>
                <Field label="メールアドレスを入力してください">{r.answers.email}</Field>
                <Field label="駐車場を利用しますか？(事前予約制)">{r.answers.parking}</Field>
                <Field label="備考欄:" tall>{r.answers.note}</Field>
              </dl>
              <p className="detail__notice t-small">
                当店はマンツーマンで営業をしております
                <br />
                ご予約状況によっては日時のご変更をお願いする場合がございます
              </p>
              <dl className="detail__answers detail__answers--agree">
                <dt className="sr-only">注意事項への同意</dt>
                <dd className="detail__field">{r.answers.agreement}</dd>
              </dl>
            </div>
          ) : (
            <div role="tabpanel" id="detail-panel-payment" aria-labelledby="detail-tab-payment">
              {/* 決済情報タブの中身はスクリーンショットに無いため未再現 */}
              <p className="detail__placeholder t-small">決済情報の表示内容は未確認のため未再現です。</p>
            </div>
          )}

          <div className="detail__footer">
            <p className="t-small detail__footnote">
              予約コース・日時を変更することはできません。変更する場合は、この予約を削除して新しく予約を手動追加してください。
            </p>
            <div className="detail__footer-actions">
              <button type="button" className="detail__close-btn" onClick={onClose}>
                閉じる
              </button>
              <button type="button" className="detail__delete">
                この予約を削除する
              </button>
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
