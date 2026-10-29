import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { CircleAlert, CircleCheck, ListOrdered, Pin, Plus } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { PanelTopBar } from '../ui/PanelTopBar'
import type { Customer } from '../../data/customers'
import { GuideHint } from '../guide/GuideHint'
import { useGuide } from '../guide/GuideProvider'
import { MemoCard } from './MemoCard'
import { MemoForm } from './MemoForm'
import { MemoSortModal } from './MemoSortModal'
import { MemoYearMenu } from './MemoYearMenu'
import { PIN_LIMIT } from '../../store/memoStore'
import type { MemoWorkspace } from './useMemoWorkspace'

interface Props {
  ws: MemoWorkspace
  customer: Customer
  /** 予約詳細から開いた場合のみ指定（1:1チャットでは指定しない） */
  backLabel?: string
  onBack?: () => void
  /** 指定時のみ「閉じる」を表示 */
  onClose?: () => void
}

/** コンテナ内で el が見える位置までスクロール */
function ensureVisible(container: HTMLElement, el: HTMLElement) {
  const c = container.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  if (r.top < c.top || r.height > c.height) container.scrollTop += r.top - c.top
  else if (r.bottom > c.bottom) container.scrollTop += r.bottom - c.bottom
}

/**
 * お客様メモ（一覧／入力）。予約詳細パネルと1:1チャットで共通利用。
 * 見出し・お客様名・操作列は固定し、メモ一覧だけが縦スクロールする。
 */
export function MemoView({ ws, customer, backLabel, onBack, onClose }: Props) {
  const uid = useId()
  const scrollRef = useRef<HTMLDivElement>(null)
  const createBtnRef = useRef<HTMLButtonElement>(null)
  const { complete: completeGuide } = useGuide()
  const isForm = ws.mode === 'form'

  // 並べ替え画面（モーダル）。閉じたら、開いたボタンへフォーカスを戻す
  const sortBtnRef = useRef<HTMLButtonElement>(null)
  const [sorting, setSorting] = useState(false)
  const wasSorting = useRef(false)
  useEffect(() => {
    if (sorting) wasSorting.current = true
    else if (wasSorting.current) {
      wasSorting.current = false
      sortBtnRef.current?.focus({ preventScroll: true })
    }
  }, [sorting])
  // 並べ替えられるのは、同じ年に2件以上あるとき（ピン留め中のメモは対象外）
  const canSort = ws.groups.some((g) => g.memos.length >= 2)
  const togglePin = (id: string) => {
    completeGuide('pin-button') // ピン留めを操作したら、このガイドは役目を終える
    ws.togglePin(id)
  }
  // 操作ガイド：一覧の先頭にあるメモのピンボタン
  const firstPinButton = () => scrollRef.current?.querySelector<HTMLElement>('[data-memo-pin]') ?? null
  const yearId = (y: number) => `${uid}-year-${y}`

  // 操作ガイド：新規作成の入力モーダルが閉じたら（保存・破棄・✖のどれでも）、吹き出しは役目を終える
  const openedNew = useRef(false)
  useEffect(() => {
    if (isForm) openedNew.current = !ws.editing
    else if (openedNew.current) {
      openedNew.current = false
      if (backLabel) completeGuide('create-modal')
    }
  }, [isForm, ws.editing, backLabel, completeGuide])

  // 一覧へ戻った時：スクロール位置の復元／新規・編集メモの表示位置への移動
  useLayoutEffect(() => {
    if (isForm) return
    const el = scrollRef.current
    if (!el) return
    const intent = ws.intent
    el.scrollTop = ws.scrollTopRef.current
    if (!intent) return
    if (intent.type === 'restore') {
      const target = intent.focusId
        ? el.querySelector<HTMLElement>(`[data-memo-edit="${CSS.escape(intent.focusId)}"]`)
        : createBtnRef.current
      target?.focus({ preventScroll: true })
    } else if (intent.type === 'reveal') {
      const btn = el.querySelector<HTMLElement>(`[data-memo-edit="${CSS.escape(intent.memoId)}"]`)
      const li = btn?.closest('li')
      if (btn && li) {
        ensureVisible(el, li)
        if (!li.previousElementSibling) {
          const h = li.parentElement?.previousElementSibling as HTMLElement | null
          if (h) {
            // 年の見出しごと見える位置へ（先頭の年なら一番上まで戻す）
            const above = h.parentElement?.previousElementSibling
            if (!above || above.matches('.memo__pinned--empty')) el.scrollTop = 0
            else ensureVisible(el, h)
          }
        }
        btn.focus({ preventScroll: true })
      }
    }
    ws.scrollTopRef.current = el.scrollTop
    ws.consumeIntent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isForm])

  // ピン留めの付け外しのあと：ピン留め→最上部へ／解除→元の年の位置へ移動し、ピンボタンへフォーカス
  useLayoutEffect(() => {
    const intent = ws.intent
    if (intent?.type !== 'pin') return
    const el = scrollRef.current
    if (!el) return
    const btn = el.querySelector<HTMLElement>(`[data-memo-pin="${CSS.escape(intent.memoId)}"]`)
    const li = btn?.closest('li')
    if (btn && li) {
      if (intent.pinned) el.scrollTop = 0
      else ensureVisible(el, li)
      btn.focus({ preventScroll: true })
    }
    ws.scrollTopRef.current = el.scrollTop
    ws.consumeIntent()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.intent])

  // 保存成功の通知は一定時間で消す
  useEffect(() => {
    if (!ws.notice) return
    const t = window.setTimeout(ws.dismissNotice, 5000)
    return () => window.clearTimeout(t)
  }, [ws.notice, ws.dismissNotice])

  const goToYear = (year: number) => {
    const el = scrollRef.current
    const h = document.getElementById(yearId(year))
    if (!el || !h) return
    // ヘッダーはスクロール領域の外にあるため、見出しが隠れることはない
    el.scrollTop += h.getBoundingClientRect().top - el.getBoundingClientRect().top - 8
    ws.scrollTopRef.current = el.scrollTop
    h.focus({ preventScroll: true })
  }

  return (
    <section className="panel-view memo" aria-label="お客様メモ">
      <PanelTopBar
        backLabel={backLabel}
        onBack={onBack}
        onClose={onClose}
      />

      <header className="memo__head">
        <h2 className="sr-only" tabIndex={-1} data-view-heading>
          お客様メモ
        </h2>
        <p className="memo__customer t-screen">
          <Avatar initial={customer.avatarInitial} tone={customer.avatarTone} size={32} />
          <span>{customer.displayName}</span>
        </p>
        <div className="memo__actions">
          <MemoYearMenu years={ws.years} onSelect={goToYear} guide={Boolean(backLabel)} />
          <div className="memo__actions-end">
            <Button
              ref={sortBtnRef}
              className="memo__sort"
              icon={<ListOrdered size={16} strokeWidth={1.75} aria-hidden="true" />}
              aria-label="メモを並べ替え"
              aria-haspopup="dialog"
              title={canSort ? '並べ替え' : '並べ替えできるメモがありません（同じ年に2件以上で使えます）'}
              disabled={!canSort}
              onClick={() => setSorting(true)}
            />
            <Button
              ref={createBtnRef}
              variant="primary"
              icon={<Plus size={16} strokeWidth={1.75} aria-hidden="true" />}
              onClick={() => {
                completeGuide('create-button') // 新規作成を開いたら、このガイドは役目を終える
                ws.openCreate()
              }}
            >
              新規作成
            </Button>
          </div>
        </div>
      </header>
      {/* 操作ガイド：予約詳細パネルのときだけ（1:1チャットのメモ欄には出さない）。ボタンの後ろに置く */}
      {backLabel && <GuideHint step="create-button" target={createBtnRef} />}

      {/* 新規作成・編集は別モーダル。一覧はそのまま背面に残す */}
      {/* 並べ替え画面 */}
      {sorting && <MemoSortModal ws={ws} onClose={() => setSorting(false)} />}

      {isForm && <MemoForm ws={ws} customer={customer} guide={Boolean(backLabel)} />}

      <div
        ref={scrollRef}
        className="memo__scroll"
        tabIndex={0}
        role="region"
        aria-label="メモ一覧"
        onScroll={(e) => {
          ws.scrollTopRef.current = e.currentTarget.scrollTop
        }}
      >
        {ws.memos.length === 0 ? (
          <div className="memo__empty">
            <p className="t-body-strong">お客様メモはまだありません</p>
            <p className="t-caption">「新規作成」から登録できます。</p>
          </div>
        ) : (
          <>
            {ws.pinned.length === 0 ? (
              // ピン留めが0件のときだけ、使い方の案内を出す
              <div className="memo__pinned memo__pinned--empty">
                <p className="memo__year memo__year--pinned t-heading">
                  <Pin size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span className="sr-only">ピン留めボタン</span>
                  <span className="memo__pinned-note t-caption">をクリックすると上段に固定されます</span>
                </p>
              </div>
            ) : (
              // 1件以上あるときは案内の代わりに「ピン留め 1/3件」
              <div className="memo__pinned" role="group" aria-labelledby={`${uid}-pinned`}>
                <h3 id={`${uid}-pinned`} className="memo__year memo__year--pinned t-heading" tabIndex={-1}>
                  ピン留め {ws.pinned.length}/{PIN_LIMIT}件
                </h3>
                <ul className="memo__cards">
                  {ws.pinned.map((m) => (
                    <li key={m.id}>
                      <MemoCard memo={m} onEdit={ws.openEdit} onTogglePin={togglePin} pinLimitReached={ws.pinned.length >= PIN_LIMIT} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ws.groups.map((g) => (
              <section key={g.year} className="memo__group" aria-labelledby={yearId(g.year)}>
                <h3 id={yearId(g.year)} className="memo__year t-heading" tabIndex={-1}>
                  {g.year}年
                </h3>
                <ul className="memo__cards">
                  {g.memos.map((m) => (
                    <li key={m.id}>
                      <MemoCard memo={m} onEdit={ws.openEdit} onTogglePin={togglePin} pinLimitReached={ws.pinned.length >= PIN_LIMIT} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </div>

      {/* 操作ガイド：予約詳細パネルのときだけ。一覧の後ろに置く（ボタンができてから位置を測る） */}
      {backLabel && !isForm && <GuideHint step="pin-button" target={firstPinButton} />}

      <div className="memo__notice-area" role="status" aria-live="polite">
        {ws.notice && (
          <p className={`memo__notice${ws.notice.tone === 'info' ? ' memo__notice--info' : ''}`}>
            {ws.notice.tone === 'info' ? (
              <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <CircleCheck size={16} strokeWidth={1.75} aria-hidden="true" />
            )}
            {ws.notice.text}
          </p>
        )}
      </div>
    </section>
  )
}
