import { useCallback, useMemo, useRef, useState } from 'react'
import { PIN_LIMIT, memoStore, useCustomerMemos, type CustomerMemo } from '../../store/memoStore'
import { yearOf } from '../../lib/datetime'

/** プロトタイプ上の仮の上限（エルメの既存の文字数制限ではない） */
export const TITLE_MAX = 100
export const BODY_MAX = 5000

export interface Draft {
  title: string
  body: string
}
export interface MemoErrors {
  title?: string
  body?: string
}
/** 一覧に戻ったときのスクロール／フォーカス制御 */
export type ListIntent =
  | { type: 'restore'; focusId: string | null }
  | { type: 'reveal'; memoId: string }
  /** ピン留めの付け外しのあと：移動先のカードのピンボタンへフォーカス */
  | { type: 'pin'; memoId: string; pinned: boolean }

export interface YearGroup {
  year: number
  memos: CustomerMemo[]
}

export interface Notice {
  id: number
  text: string
  /** success=完了の通知／info=できなかった理由などの案内 */
  tone: 'success' | 'info'
}

const EMPTY: Draft = { title: '', body: '' }

/**
 * 同じ年の中の並び：並べ替えで決めた順（order の小さい順）。
 * まだ順番のないメモ（並べ替え後に作ったもの）は、作成日時の新しい順で一番上に出す。
 */
function sortByOrder(ms: CustomerMemo[]): CustomerMemo[] {
  const has = (m: CustomerMemo) => typeof m.order === 'number'
  return [...ms].sort((a, b) => {
    if (has(a) !== has(b)) return has(a) ? 1 : -1
    return has(a) ? a.order! - b.order! : Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id)
  })
}
const count = (s: string) => Array.from(s).length

export function validate(d: Draft): MemoErrors {
  const errors: MemoErrors = {}
  const t = count(d.title)
  const b = count(d.body)
  // タイトル・本文はどちらも任意。ただし、両方が空の（空白だけの）メモは保存できない
  if (d.title.trim() === '' && d.body.trim() === '') errors.title = 'タイトルか本文のどちらかを入力してください'
  if (t > TITLE_MAX) errors.title = `タイトルは${TITLE_MAX}文字以内で入力してください（現在${t}文字）`
  if (b > BODY_MAX) errors.body = `本文は${BODY_MAX}文字以内で入力してください（現在${b}文字）`
  return errors
}

export const charCount = count

/**
 * お客様メモの画面状態（一覧／入力）。
 * データは共通ストアを顧客IDで参照するだけで、予約管理用・チャット用の複製は持たない。
 */
export function useMemoWorkspace(customerId: string) {
  const memos = useCustomerMemos(customerId)

  const [mode, setMode] = useState<'list' | 'form'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [errors, setErrors] = useState<MemoErrors>({})
  const [errorFocus, setErrorFocus] = useState<{ field: 'title' | 'body'; nonce: number } | null>(null)
  /** 未保存の変更があるまま離れようとしたときの確認。toList=一覧へ戻るだけの操作 */
  const [pending, setPending] = useState<null | { action: () => void; toList: boolean }>(null)
  const [deleting, setDeleting] = useState(false) // 削除の確認表示中
  const [notice, setNotice] = useState<Notice | null>(null)
  const [intent, setIntent] = useState<ListIntent | null>(null)
  const scrollTopRef = useRef(0)
  const noticeSeq = useRef(0)

  const editing = useMemo(() => memos.find((m) => m.id === editingId) ?? null, [memos, editingId])
  const initial: Draft = editing ? { title: editing.title, body: editing.body } : EMPTY
  const dirty = mode === 'form' && (draft.title !== initial.title || draft.body !== initial.body)

  // ピン留め中のメモ：一覧の最上部に、ピン留めした新しい順で表示（年のグループには含めない）
  const pinned = useMemo(
    () => memos.filter((m) => m.pinnedAt).sort((a, b) => Date.parse(b.pinnedAt!) - Date.parse(a.pinnedAt!)),
    [memos],
  )

  const groups = useMemo<YearGroup[]>(() => {
    const map = new Map<number, CustomerMemo[]>()
    for (const m of memos) {
      if (m.pinnedAt) continue
      const y = yearOf(m.createdAt) // 作成日時で判定（編集しても年は移動しない）
      map.set(y, [...(map.get(y) ?? []), m])
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([year, ms]) => ({ year, memos: sortByOrder(ms) }))
  }, [memos])

  const openCreate = useCallback(() => {
    setEditingId(null)
    setDraft(EMPTY)
    setErrors({})
    setPending(null)
    setDeleting(false)
    setMode('form')
  }, [])

  const openEdit = useCallback(
    (id: string) => {
      const m = memos.find((x) => x.id === id)
      if (!m) return
      setEditingId(id)
      setDraft({ title: m.title, body: m.body })
      setErrors({})
      setPending(null)
      setDeleting(false)
      setMode('form')
    },
    [memos],
  )

  const leaveToList = useCallback(() => {
    setIntent({ type: 'restore', focusId: editingId })
    setEditingId(null)
    setPending(null)
    setDeleting(false)
    setErrors({})
    setMode('list')
  }, [editingId])

  /** 未保存の変更があれば確認を挟み、無ければそのまま実行 */
  const requestLeave = useCallback(
    (action: () => void, toList = false) => {
      if (dirty) setPending({ action, toList })
      else action()
    },
    [dirty],
  )

  const cancelForm = useCallback(() => requestLeave(leaveToList, true), [requestLeave, leaveToList])

  const confirmDiscard = useCallback(() => {
    const p = pending
    setPending(null)
    p?.action()
  }, [pending])

  const keepEditing = useCallback(() => setPending(null), [])

  const setTitle = useCallback((title: string) => {
    setDraft((d) => ({ ...d, title }))
    setErrors((e) => ({ ...e, title: undefined }))
  }, [])
  const setBody = useCallback((body: string) => {
    setDraft((d) => ({ ...d, body }))
    setErrors((e) => ({ ...e, body: undefined }))
  }, [])

  /** 検証して保存する。保存できたら true（一覧へ戻り、保存したメモの位置へ移動）。 */
  const trySave = useCallback((): boolean => {
    const errs = validate(draft)
    setErrors(errs)
    if (errs.title || errs.body) {
      setErrorFocus({ field: errs.title ? 'title' : 'body', nonce: Date.now() })
      return false
    }
    const input = { title: draft.title.trim(), body: draft.body.trim() }
    let memoId: string
    if (editing) {
      memoStore.update(editing.id, input)
      memoId = editing.id
    } else {
      memoId = memoStore.create(customerId, input).id
    }
    setNotice({ id: ++noticeSeq.current, text: editing ? 'お客様メモを更新しました' : 'お客様メモを保存しました', tone: 'success' })
    setPending(null)
    setErrors({})
    setEditingId(null)
    setIntent({ type: 'reveal', memoId })
    setMode('list')
    return true
  }, [editing, draft, customerId])

  const save = useCallback(() => {
    if (editing && !dirty) {
      leaveToList() // 変更なし：更新日時を動かさず戻る
      return
    }
    trySave()
  }, [editing, dirty, leaveToList, trySave])

  /** 確認画面の「保存」：保存してから、離れようとしていた操作を続ける */
  const confirmSave = useCallback(() => {
    const p = pending
    setPending(null)
    if (!trySave()) return // 保存できない（入力エラー）なら入力画面に戻してエラーを見せる
    if (p && !p.toList) p.action()
  }, [pending, trySave])

  const togglePin = useCallback(
    (id: string) => {
      const m = memos.find((x) => x.id === id)
      if (!m) return
      const next = !m.pinnedAt
      if (!memoStore.setPinned(id, next)) {
        setNotice({ id: ++noticeSeq.current, text: `ピン留めは${PIN_LIMIT}件までです。他のメモのピン留めを外してください`, tone: 'info' })
        return
      }
      setNotice({ id: ++noticeSeq.current, text: next ? 'メモをピン留めしました' : 'ピン留めを外しました', tone: 'success' })
      setIntent({ type: 'pin', memoId: id, pinned: next })
    },
    [memos],
  )

  /** 並べ替えの保存（ピン留め以外のメモの順番）。保存したことは通知で伝える */
  const saveOrder = useCallback((orderedIds: string[]) => {
    memoStore.reorder(orderedIds)
    setNotice({ id: ++noticeSeq.current, text: 'メモの並び順を保存しました', tone: 'success' })
  }, [])

  const requestDelete = useCallback(() => {
    setPending(null)
    setDeleting(true)
  }, [])
  const cancelDelete = useCallback(() => setDeleting(false), [])
  const confirmDelete = useCallback(() => {
    if (!editing) return
    memoStore.remove(editing.id)
    setNotice({ id: ++noticeSeq.current, text: 'お客様メモを削除しました', tone: 'success' })
    setDeleting(false)
    setPending(null)
    setErrors({})
    setEditingId(null)
    setIntent({ type: 'restore', focusId: null })
    setMode('list')
  }, [editing])

  const reset = useCallback(() => {
    setMode('list')
    setDeleting(false)
    setEditingId(null)
    setDraft(EMPTY)
    setErrors({})
    setPending(null)
    setIntent(null)
    setNotice(null)
    scrollTopRef.current = 0
  }, [])

  return {
    customerId,
    memos,
    pinned,
    groups,
    years: groups.map((g) => g.year),
    mode,
    editing,
    draft,
    errors,
    errorFocus,
    dirty,
    pending,
    deleting,
    notice,
    intent,
    scrollTopRef,
    openCreate,
    openEdit,
    togglePin,
    saveOrder,
    cancelForm,
    requestLeave,
    confirmDiscard,
    confirmSave,
    keepEditing,
    requestDelete,
    cancelDelete,
    confirmDelete,
    setTitle,
    setBody,
    save,
    reset,
    consumeIntent: useCallback(() => setIntent(null), []),
    dismissNotice: useCallback(() => setNotice(null), []),
  }
}

export type MemoWorkspace = ReturnType<typeof useMemoWorkspace>
