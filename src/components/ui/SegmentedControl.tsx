import type { ReactNode } from 'react'

export interface SegmentItem {
  id: string
  label: string
  icon: ReactNode
}

export function SegmentedControl({
  items,
  activeId,
  onSelect,
  ariaLabel,
}: {
  items: SegmentItem[]
  activeId: string
  onSelect: (id: string) => void
  ariaLabel: string
}) {
  return (
    <div className="segmented" role="group" aria-label={ariaLabel}>
      {items.map((item) => {
        const selected = item.id === activeId
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected}
            className={`segmented__item${selected ? ' is-selected' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            {item.icon}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
