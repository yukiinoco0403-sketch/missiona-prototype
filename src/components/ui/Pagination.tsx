import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
}) {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1)
  return (
    <nav className="pagination" aria-label="ページ送り">
      <button
        type="button"
        className="pagination__item"
        disabled={page <= 1}
        aria-label="前のページ"
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={`pagination__item${p === page ? ' is-current' : ''}`}
          aria-current={p === page ? 'page' : undefined}
          aria-label={`${p}ページ目`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className="pagination__item"
        disabled={page >= pageCount}
        aria-label="次のページ"
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={16} strokeWidth={1.75} />
      </button>
    </nav>
  )
}
