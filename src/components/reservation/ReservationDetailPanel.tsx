import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MemoView } from '../memo/MemoView'
import { useMemoWorkspace } from '../memo/useMemoWorkspace'
import { getCustomer } from '../../data/customers'
import { acquireInert } from '../../lib/inertLock'
import type { Reservation } from '../../data/reservations'
import { ReservationDetailView } from './ReservationDetailView'

interface Props {
  reservation: Reservation
  onClose: () => void
}

type View = 'detail' | 'memo'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * 右側の予約詳細パネル。詳細／お客様メモ／予約履歴を同じパネル内で切り替える。
 * 背景は暗転させず、操作だけを無効化する（inert + 透明な背景クリック領域）。
 */
export function ReservationDetailPanel({ reservation: r, onClose }: Props) {
  const customer = getCustomer(r.customerId) // 顧客は顧客IDで特定する
  const ws = useMemoWorkspace(r.customerId)
  const [view, setView] = useState<View>('detail')
  const [tab, setTab] = useState<'info' | 'payment'>('info')
  const [mode, setMode] = useState<'info' | 'history'>('info')
  const detailScroll = useRef(0)
  const panelRef = useRef<HTMLElement>(null)
  const returnFocusKey = useRef<string | null>(null)
  const firstRender = useRef(true)

  // 背景（アプリ本体）の操作・フォーカスを止める
  useLayoutEffect(() => {
    const root = document.getElementById('root')
    return root ? acquireInert([root]) : undefined
  }, [])

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true })
  }, [])

  /** 未保存の入力があれば確認してから閉じる */
  const requestClose = useCallback(() => ws.requestLeave(onClose), [ws.requestLeave, onClose])

  const latest = useRef({ requestClose, pending: ws.pending, keepEditing: ws.keepEditing })
  latest.current = { requestClose, pending: ws.pending, keepEditing: ws.keepEditing }

  // Escape（確認表示中は「編集を続ける」）とフォーカストラップ
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault()
        if (latest.current.pending) latest.current.keepEditing()
        else latest.current.requestClose()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (!panel.contains(active) || (e.shiftKey && (active === first || active === panel))) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // 画面切り替え時のフォーカス：戻る→開いたボタン／進む→見出し
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (view === 'detail') {
      // 詳細ビューは再マウントされるため、開いたボタンをキーで探し直す
      panelRef.current?.querySelector<HTMLElement>(`[data-chip="${returnFocusKey.current}"]`)?.focus({ preventScroll: true })
    }
    else panelRef.current?.querySelector<HTMLElement>('[data-view-heading]')?.focus({ preventScroll: true })
  }, [view])

  const goTo = (next: View, trigger?: HTMLElement) => {
    if (trigger) returnFocusKey.current = trigger.dataset.chip ?? null
    setView(next)
  }
  const backToDetail = () => ws.requestLeave(() => setView('detail'))

  const label = view === 'detail' ? `予約詳細：${customer.displayName}` : 'お客様メモ'

  return createPortal(
    <>
      <div className="detail-backdrop" aria-hidden="true" onClick={requestClose} />
      <aside
        ref={panelRef}
        className="detail"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
      >
        {view === 'detail' && (
          <ReservationDetailView
            reservation={r}
            customer={customer}
            tab={tab}
            onTab={setTab}
            mode={mode}
            onToggleMode={() => setMode((m) => (m === 'info' ? 'history' : 'info'))}
            initialScroll={detailScroll.current}
            onScroll={(t) => {
              detailScroll.current = t
            }}
            onClose={requestClose}
            onOpenMemo={(el) => goTo('memo', el)}
          />
        )}
        {view === 'memo' && (
          <MemoView
            ws={ws}
            customer={customer}
            backLabel="予約詳細へ戻る"
            onBack={backToDetail}
            onClose={requestClose}
          />
        )}
      </aside>
    </>,
    document.body,
  )
}
