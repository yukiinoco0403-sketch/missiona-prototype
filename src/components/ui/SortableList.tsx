import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react'
import { AlignJustify } from 'lucide-react'

interface Props<T> {
  items: T[]
  getId: (item: T) => string
  /** ハンドルの読み上げ名に使う、項目の名前 */
  getName: (item: T, index: number) => string
  onMove: (from: number, to: number) => void
  renderItem: (item: T, index: number) => ReactNode
  className?: string
  itemClassName?: (item: T) => string
  ariaLabel: string
}

/**
 * 並べ替えできるリスト。左の「≡」をドラッグして並べ替える（既存の画面と同じ操作）。
 * キーボード：「≡」にフォーカスして ↑↓ で移動する。移動結果は音声読み上げ用に通知する。
 */
export function SortableList<T>({ items, getId, getName, onMove, renderItem, className = '', itemClassName, ariaLabel }: Props<T>) {
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [over, setOver] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const refocus = useRef<string | null>(null)

  useEffect(() => {
    if (!refocus.current) return
    document.querySelector<HTMLElement>(`[data-handle="${CSS.escape(refocus.current)}"]`)?.focus()
    refocus.current = null
  })

  const onKey = (e: KeyboardEvent, i: number, id: string, name: string) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    const to = e.key === 'ArrowUp' ? i - 1 : i + 1
    if (to < 0 || to >= items.length) return
    refocus.current = id
    onMove(i, to)
    setNote(`「${name || '無題'}」を${to + 1}番目に移動しました（全${items.length}件）`)
  }

  const onDrop = (e: DragEvent, to: number) => {
    e.preventDefault()
    if (dragFrom !== null && dragFrom !== to) onMove(dragFrom, to)
    setDragFrom(null)
    setOver(null)
  }

  return (
    <>
      <ul className={`sortable ${className}`.trim()} aria-label={ariaLabel}>
        {items.map((item, i) => {
          const id = getId(item)
          const name = getName(item, i)
          return (
            <li
              key={id}
              className={`sortable__item${over === i && dragFrom !== null && dragFrom !== i ? (dragFrom < i ? ' is-over-below' : ' is-over-above') : ''}${dragFrom === i ? ' is-dragging' : ''}`}
              onDragOver={(e) => {
                if (dragFrom === null) return
                e.preventDefault()
                if (over !== i) setOver(i)
              }}
              onDrop={(e) => onDrop(e, i)}
            >
              <button
                type="button"
                className="sortable__handle"
                data-handle={id}
                draggable
                aria-label={`「${name || '無題'}」を並べ替え（上下キーで移動）`}
                onKeyDown={(e) => onKey(e, i, id, name)}
                onDragStart={(e) => {
                  setDragFrom(i)
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', id)
                  const li = (e.currentTarget as HTMLElement).closest('li')
                  if (li) e.dataTransfer.setDragImage(li, 16, 16)
                }}
                onDragEnd={() => {
                  setDragFrom(null)
                  setOver(null)
                }}
              >
                <AlignJustify size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
              <div className={`sortable__body ${itemClassName ? itemClassName(item) : ''}`.trim()}>{renderItem(item, i)}</div>
            </li>
          )
        })}
      </ul>
      <p className="sr-only" role="status" aria-live="polite">
        {note}
      </p>
    </>
  )
}
