import { useEffect, useId, useLayoutEffect, useRef, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { CircleAlert } from 'lucide-react'
import { CloseIcon } from '../ui/CloseIcon'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { GuideBubble } from '../guide/GuideBubble'
import type { Customer } from '../../data/customers'
import { acquireInert } from '../../lib/inertLock'
import { BODY_MAX, TITLE_MAX, charCount, type MemoWorkspace } from './useMemoWorkspace'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * 新規作成・編集の入力モーダル（予約管理・1:1チャットで共用）。
 * 閉じる操作は右上の✖。入力がある場合は、✖・背景クリック・Escのいずれでも破棄の確認を挟む。
 */
export function MemoForm({ ws, customer, guide = false }: { ws: MemoWorkspace; customer: Customer; guide?: boolean }) {
  const uid = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null) // 削除確認の「やめる」
  const saveRef = useRef<HTMLButtonElement>(null) // 破棄確認の「保存」
  const confirmRef = useRef<HTMLDivElement>(null)
  const beforeConfirm = useRef<HTMLElement | null>(null)
  const { draft, errors, pending, deleting } = ws
  const confirming = pending !== null || deleting

  // モーダルの背後（アプリ本体・予約詳細パネルなど）の操作とフォーカスを止める
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    const behind = [...document.body.children].filter(
      (el) => el !== wrap && !['SCRIPT', 'STYLE', 'LINK'].includes(el.tagName),
    )
    return acquireInert(behind)
  }, [])

  // 開いたら、タイトル欄へフォーカス
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true })
  }, [])

  // 保存エラー時は最初のエラー欄へ
  useEffect(() => {
    if (!ws.errorFocus) return
    ;(ws.errorFocus.field === 'title' ? titleRef.current : bodyRef.current)?.focus()
  }, [ws.errorFocus])

  // 確認が出たら安全側のボタン（保存／やめる）へ。閉じたら元の位置へ戻す
  useLayoutEffect(() => {
    if (confirming) {
      beforeConfirm.current = document.activeElement as HTMLElement | null
      ;(pending ? saveRef.current : keepRef.current)?.focus()
    } else if (beforeConfirm.current) {
      const back = beforeConfirm.current.isConnected ? beforeConfirm.current : titleRef.current
      back?.focus({ preventScroll: true })
      beforeConfirm.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirming])

  // Esc・フォーカストラップ。背後の予約詳細パネルのキー処理には渡さない
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (pending) ws.keepEditing()
      else if (deleting) ws.cancelDelete()
      else ws.cancelForm()
      return
    }
    if (e.key !== 'Tab') return
    e.stopPropagation()
    const dialog = pending ? confirmRef.current : dialogRef.current // 確認画面が出ている間は、その中だけを巡回
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

  const titleCount = charCount(draft.title)
  const bodyCount = charCount(draft.body)
  const heading = ws.editing ? 'お客様メモを編集' : 'お客様メモを新規作成' // 画面には出さず、読み上げ用の名前にだけ使う
  const deleteTarget = ws.editing?.title ? `「${ws.editing.title}」` : 'このメモ'

  return createPortal(
    <div ref={wrapRef} className="memo-modal" onKeyDown={onKeyDown}>
      <div
        className="memo-modal__backdrop"
        aria-hidden="true"
        onMouseDown={(e) => e.preventDefault()} // クリックでフォーカスを失わせない
        onClick={ws.cancelForm}
      />
      <div
        ref={dialogRef}
        className="memo-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-heading`}
        tabIndex={-1}
        inert={pending !== null}
      >
        <header className="memo-modal__head">
          <div className="memo-modal__titles">
            <h2 id={`${uid}-heading`} className="sr-only">
              {heading}
            </h2>
            <p className="memo-modal__customer t-body-strong">
              <Avatar initial={customer.avatarInitial} tone={customer.avatarTone} size={24} />
              <span>{customer.displayName}</span>
            </p>
          </div>
          <button type="button" className="memo-modal__close" aria-label="閉じる" onClick={ws.cancelForm}>
            <CloseIcon />
          </button>
        </header>

        <form
          className="memo-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            ws.save()
          }}
        >
          <div className="memo-form__body">
            <div className="field">
              <div className="field__label-row">
                <label htmlFor={`${uid}-title`} className="t-body-strong">
                  タイトル
                </label>
              </div>
              <input
                ref={titleRef}
                id={`${uid}-title`}
                className={`input${errors.title ? ' is-error' : ''}`}
                value={draft.title}
                onChange={(e) => ws.setTitle(e.target.value)}
                aria-invalid={errors.title ? true : undefined}
                aria-describedby={`${uid}-title-hint${errors.title ? ` ${uid}-title-err` : ''}`}
                autoComplete="off"
              />
              <div className="field__meta">
                {errors.title ? (
                  <p id={`${uid}-title-err`} className="field__error">
                    <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
                    {errors.title}
                  </p>
                ) : (
                  <span />
                )}
                <span id={`${uid}-title-hint`} className={`t-small field__count${titleCount > TITLE_MAX ? ' is-over' : ''}`}>
                  {titleCount} / {TITLE_MAX}文字
                </span>
              </div>
            </div>

            <div className="field">
              <div className="field__label-row">
                <label htmlFor={`${uid}-body`} className="t-body-strong">
                  本文
                </label>
              </div>
              <textarea
                ref={bodyRef}
                id={`${uid}-body`}
                className={`input input--textarea${errors.body ? ' is-error' : ''}`}
                value={draft.body}
                onChange={(e) => ws.setBody(e.target.value)}
                aria-invalid={errors.body ? true : undefined}
                aria-describedby={`${uid}-body-hint${errors.body ? ` ${uid}-body-err` : ''}`}
                rows={6}
              />
              <div className="field__meta">
                {errors.body ? (
                  <p id={`${uid}-body-err`} className="field__error">
                    <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
                    {errors.body}
                  </p>
                ) : (
                  <span />
                )}
                <span id={`${uid}-body-hint`} className={`t-small field__count${bodyCount > BODY_MAX ? ' is-over' : ''}`}>
                  {bodyCount} / {BODY_MAX}文字
                </span>
              </div>
            </div>
          </div>

          {deleting ? (
            <div
              className="memo-form__confirm"
              role="alertdialog"
              aria-labelledby={`${uid}-dl-t`}
              aria-describedby={`${uid}-dl-d`}
            >
              <p id={`${uid}-dl-t`} className="t-body-strong">
                このメモを削除しますか？
              </p>
              <p id={`${uid}-dl-d`} className="t-body">
                {deleteTarget}を削除すると、元に戻せません。
              </p>
              <div className="memo-form__actions">
                <Button variant="danger" onClick={ws.confirmDelete}>
                  削除する
                </Button>
                <Button ref={keepRef} onClick={ws.cancelDelete}>
                  やめる
                </Button>
              </div>
            </div>
          ) : (
            <div className="memo-form__footer">
              {ws.editing && (
                <Button variant="danger" onClick={ws.requestDelete}>
                  このメモを削除する
                </Button>
              )}
              <Button type="submit" variant="primary" className="memo-form__save">
                保存する
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* 操作ガイド：新規作成のときだけ、予約詳細パネルから開いたときの吹き出し（指のアイコンなし） */}
      {guide && !ws.editing && <GuideBubble step="create-modal" anchor={dialogRef} />}

      {/* 編集中に✖などで閉じようとしたときの確認（保存／破棄で選ぶ）。背景クリック・Escは「編集に戻る」 */}
      {pending && (
        <div className="memo-confirm">
          <div
            className="memo-confirm__backdrop"
            aria-hidden="true"
            onMouseDown={(e) => e.preventDefault()}
            onClick={ws.keepEditing}
          />
          <div
            ref={confirmRef}
            className="memo-confirm__dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${uid}-cf-t`}
          >
            <p id={`${uid}-cf-t`} className="t-heading">
              変更を破棄しますか？
            </p>
            <div className="memo-confirm__actions">
              <Button variant="danger" onClick={ws.confirmDiscard}>
                破棄
              </Button>
              <Button ref={saveRef} variant="primary" onClick={ws.confirmSave}>
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
