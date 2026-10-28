import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * 「過去の履歴を見る」年選択。メモが存在する年だけを表示する。
 * 絞り込みではなく、一覧内の該当年の見出しへ移動するための入口。
 * 一番新しい年（先頭）は「最新」と表示する（読み上げでは年も伝える）。
 */
export function MemoYearMenu({
  years,
  onSelect,
}: {
  years: number[]
  onSelect: (year: number) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const menuId = useId()
  const disabled = years.length === 0

  useEffect(() => {
    if (open) itemRefs.current[0]?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const focusItem = (i: number) => {
    const n = years.length
    itemRefs.current[(i + n) % n]?.focus()
  }

  const onMenuKey = (e: React.KeyboardEvent) => {
    const i = itemRefs.current.findIndex((el) => el === document.activeElement)
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        focusItem(i + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        focusItem(i - 1)
        break
      case 'Home':
        e.preventDefault()
        focusItem(0)
        break
      case 'End':
        e.preventDefault()
        focusItem(years.length - 1)
        break
      case 'Escape':
        e.preventDefault() // 外側（パネル）のEscape処理に渡さない
        setOpen(false)
        btnRef.current?.focus()
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div className="year-menu" ref={rootRef}>
      <button
        ref={btnRef}
        type="button"
        className="btn btn--default btn--md year-menu__button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        title={disabled ? 'メモがないため選択できません' : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !disabled) {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        過去の履歴を見る
        <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && (
        <ul id={menuId} className="year-menu__list" role="menu" aria-label="メモがある年" onKeyDown={onMenuKey}>
          {years.map((y, i) => (
            <li key={y} role="none">
              <button
                ref={(el) => {
                  itemRefs.current[i] = el
                }}
                type="button"
                role="menuitem"
                className="year-menu__item"
                onClick={() => {
                  setOpen(false)
                  onSelect(y)
                }}
              >
                {i === 0 ? (
                  <>
                    最新<span className="sr-only">（{y}年）</span>
                  </>
                ) : (
                  `${y}年`
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
