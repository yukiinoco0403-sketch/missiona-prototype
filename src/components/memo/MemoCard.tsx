import { Pencil, Pin } from 'lucide-react'
import { formatDateTime } from '../../lib/datetime'
import { PIN_LIMIT, type CustomerMemo } from '../../store/memoStore'

/** 本文は全文展開・改行保持・カード内スクロールなし */
export function MemoCard({
  memo,
  onEdit,
  onTogglePin,
  pinLimitReached,
}: {
  memo: CustomerMemo
  onEdit: (id: string) => void
  onTogglePin: (id: string) => void
  /** 3件ピン留め済み（このメモはまだピン留めされていない場合に新しく留められない） */
  pinLimitReached: boolean
}) {
  const edited = memo.updatedAt !== memo.createdAt
  const pinned = Boolean(memo.pinnedAt)
  const name = memo.title || 'タイトルなし'
  const blocked = !pinned && pinLimitReached
  return (
    <article className="memo-card" aria-label={memo.title ? `${memo.title}のメモ` : 'タイトルなしのメモ'}>
      <header className="memo-card__head">
        <h4 className={`memo-card__title${memo.title ? '' : ' is-empty'}`}>{memo.title || 'タイトルなし'}</h4>
        <div className="memo-card__tools">
          <button
            type="button"
            className={`memo-card__pin${pinned ? ' is-pinned' : ''}`}
            data-memo-pin={memo.id}
            aria-label={`${name}をピン留め`}
            aria-pressed={pinned}
            aria-disabled={blocked || undefined}
            data-tip={pinned ? 'ピン留めを外す' : blocked ? `ピン留めは${PIN_LIMIT}件までです` : 'ピン留めする'}
            onClick={() => onTogglePin(memo.id)}
          >
            {/* 状態は色だけでなく形でも示す：ピン留め中＝塗りつぶし／なし＝線のみ */}
            <Pin size={16} strokeWidth={1.75} fill={pinned ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        <button
          type="button"
          className="memo-card__edit"
          data-memo-edit={memo.id}
          aria-label={memo.title ? `${memo.title}のメモを編集` : 'タイトルなしのメモを編集'}
          data-tip="編集する"
          onClick={() => onEdit(memo.id)}
        >
          <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
        </div>
      </header>
      {memo.body && <p className="memo-card__body">{memo.body}</p>}
      <footer className={`memo-card__foot t-caption${memo.body ? '' : ' memo-card__foot--solo'}`}>
        <span>
          作成：<time dateTime={memo.createdAt}>{formatDateTime(memo.createdAt)}</time>
        </span>
        {edited && (
          <span>
            更新：<time dateTime={memo.updatedAt}>{formatDateTime(memo.updatedAt)}</time>
          </span>
        )}
      </footer>
    </article>
  )
}
