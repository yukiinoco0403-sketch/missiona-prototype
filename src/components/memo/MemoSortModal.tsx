import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Ellipsis } from 'lucide-react'
import { Button } from '../ui/Button'
import { CloseIcon } from '../ui/CloseIcon'
import { SortableList } from '../ui/SortableList'
import type { CustomerMemo } from '../../store/memoStore'
import { acquireInert } from '../../lib/inertLock'
import type { MemoWorkspace } from './useMemoWorkspace'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const nameOf = (m: CustomerMemo) => m.title || 'タイトルなし'

interface YearList {
  year: number
  ids: string[]
}

const move = <T,>(arr: T[], from: number, to: number): T[] => {
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** 行の右端の「…」：一番上へ／一番下へ（ドラッグが難しい人・長い一覧向けの近道） */
function RowMenu({ name, isFirst, isLast, onTop, onBottom }: { name: string; isFirst: boolean; isLast: boolean; onTop: () => void; onBottom: () => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus()
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const choose = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  return (
    <span className="msort__menu" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="msort__more"
        aria-label={`「${name}」のその他の操作`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Ellipsis size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && (
        <ul
          id={menuId}
          className="msort__list"
          role="menu"
          aria-label={`「${name}」の並び順`}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation() // モーダル自体は閉じない
              setOpen(false)
              btnRef.current?.focus()
            }
          }}
        >
          <li role="none">
            <button type="button" role="menuitem" className="msort__item" disabled={isFirst} onClick={() => choose(onTop)}>
              一番上へ
            </button>
          </li>
          <li role="none">
            <button type="button" role="menuitem" className="msort__item" disabled={isLast} onClick={() => choose(onBottom)}>
              一番下へ
            </button>
          </li>
        </ul>
      )}
    </span>
  )
}

/**
 * メモの「並べ替え」画面（モーダル）。ピン留め以外のメモを、同じ年の中で並べ替える。
 * 操作：左の「≡」をドラッグ／フォーカスして上下キー、右の「…」から「一番上へ・一番下へ」。
 * 「変更を保存」で確定する。保存せずに閉じようとしたら、メモ入力と同じく「変更を破棄しますか？」を挟む。
 */
export function MemoSortModal({ ws, onClose }: { ws: MemoWorkspace; onClose: () => void }) {
  const uid = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLDivElement>(null)
  const saveRef = useRef<HTMLButtonElement>(null)
  const [asking, setAsking] = useState(false)

  const initial = useMemo<YearList[]>(() => ws.groups.map((g) => ({ year: g.year, ids: g.memos.map((m) => m.id) })), []) // eslint-disable-line react-hooks/exhaustive-deps
  const [lists, setLists] = useState<YearList[]>(initial)
  const byId = useMemo(() => new Map(ws.memos.map((m) => [m.id, m])), [ws.memos])
  const dirty = JSON.stringify(lists) !== JSON.stringify(initial)
  const showYear = lists.length > 1 // 年が1つだけなら見出しは出さない

  // 背後（アプリ本体・予約詳細パネルなど）の操作とフォーカスを止める
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const behind = [...document.body.children].filter((el) => el !== wrap && !['SCRIPT', 'STYLE', 'LINK'].includes(el.tagName))
    return acquireInert(behind)
  }, [])

  // 開いたら最初の「≡」へ。破棄の確認が出たら「保存」へ
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLElement>('.sortable__handle')?.focus({ preventScroll: true })
  }, [])
  useLayoutEffect(() => {
    if (asking) saveRef.current?.focus()
  }, [asking])

  const requestClose = () => (dirty ? setAsking(true) : onClose())
  const save = () => {
    if (dirty) ws.saveOrder(lists.flatMap((l) => l.ids))
    onClose()
  }

  const update = (year: number, fn: (ids: string[]) => string[]) =>
    setLists((ls) => ls.map((l) => (l.year === year ? { ...l, ids: fn(l.ids) } : l)))

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (asking) setAsking(false)
      else requestClose()
      return
    }
    if (e.key !== 'Tab') return
    e.stopPropagation()
    const dialog = asking ? confirmRef.current : dialogRef.current
    if (!dialog) return
    const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (!dialog.contains(active) || (e.shiftKey && (active === first || active === dialog))) {
      e.preventDefault()
      ;(e.shiftKey ? last : first).focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div ref={wrapRef} className="memo-modal" onKeyDown={onKeyDown}>
      <div className="memo-modal__backdrop" aria-hidden="true" onMouseDown={(e) => e.preventDefault()} onClick={requestClose} />
      <div ref={dialogRef} className="memo-modal__dialog msort" role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`} tabIndex={-1} inert={asking}>
        <header className="msort__head">
          <h2 id={`${uid}-title`} className="msort__title t-heading">
            並べ替え
          </h2>
          <button type="button" className="memo-modal__close msort__close" aria-label="閉じる" onClick={requestClose}>
            <CloseIcon />
          </button>
        </header>

        <div className="msort__body">
          {ws.pinned.length > 0 && (
            <p className="msort__note t-caption">ピン留め中のメモは上部に固定されるため、ここでは並べ替えません。</p>
          )}
          {lists.map((l) => (
            <section key={l.year} className="msort__group" aria-label={showYear ? `${l.year}年のメモ` : undefined}>
              {showYear && <h3 className="msort__year t-body-strong">{l.year}年</h3>}
              <SortableList
                items={l.ids.map((id) => byId.get(id)).filter((m): m is CustomerMemo => Boolean(m))}
                getId={(m) => m.id}
                getName={nameOf}
                ariaLabel={showYear ? `${l.year}年のメモの並び順` : 'メモの並び順'}
                onMove={(from, to) => update(l.year, (ids) => move(ids, from, to))}
                className="sortable--memos"
                renderItem={(m, i) => (
                  <div className="msort__row">
                    <span className={`msort__name${m.title ? '' : ' is-empty'}`}>{nameOf(m)}</span>
                    <RowMenu
                      name={nameOf(m)}
                      isFirst={i === 0}
                      isLast={i === l.ids.length - 1}
                      onTop={() => update(l.year, (ids) => move(ids, i, 0))}
                      onBottom={() => update(l.year, (ids) => move(ids, i, ids.length - 1))}
                    />
                  </div>
                )}
              />
            </section>
          ))}
        </div>

        <footer className="msort__foot">
          <Button variant="outline-link" onClick={save}>
            変更を保存
          </Button>
        </footer>
      </div>

      {asking && (
        <div className="memo-confirm">
          <div className="memo-confirm__backdrop" aria-hidden="true" onMouseDown={(e) => e.preventDefault()} onClick={() => setAsking(false)} />
          <div ref={confirmRef} className="memo-confirm__dialog" role="alertdialog" aria-modal="true" aria-labelledby={`${uid}-cf`}>
            <p id={`${uid}-cf`} className="t-heading">
              変更を破棄しますか？
            </p>
            <div className="memo-confirm__actions">
              <Button variant="danger" onClick={onClose}>
                破棄
              </Button>
              <Button ref={saveRef} variant="primary" onClick={save}>
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
