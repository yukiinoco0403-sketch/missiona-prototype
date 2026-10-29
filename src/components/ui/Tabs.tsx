import type { ReactNode } from 'react'

export interface TabItem {
  id: string
  label: string
  tag?: string
}

export function Tabs({
  items,
  activeId,
  onSelect,
  ariaLabel,
}: {
  items: TabItem[]
  activeId: string
  onSelect?: (id: string) => void
  ariaLabel: string
}): ReactNode {
  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const selected = item.id === activeId
        return (
          <button
            key={item.id}
            role="tab"
            data-tab={item.id}
            type="button"
            aria-selected={selected}
            className={`tabs__tab${selected ? ' is-selected' : ''}`}
            onClick={() => onSelect?.(item.id)}
          >
            {item.label}
            {item.tag && <span className="tabs__tag">{item.tag}</span>}
          </button>
        )
      })}
    </div>
  )
}
