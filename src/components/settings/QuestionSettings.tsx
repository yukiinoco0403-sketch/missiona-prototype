import {
  AlignLeft,
  ChevronDown,
  CircleHelp,
  Eye,
  EyeOff,
  Info,
  Link2,
  ListChecks,
  ListTodo,
  Plus,
  WrapText,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { SortableList } from '../ui/SortableList'
import {
  FRIEND_FIELDS,
  FRIEND_FIELD_LABEL,
  QUESTION_TYPES,
  QUESTION_TYPE_LABEL,
  canLinkFriend,
  isChoice,
  type FriendField,
  type Question,
  type QuestionType,
} from '../../data/booking'
import { FIELD, type QuestionEditor } from './useQuestionEditor'

const LABEL_MAX = 50

const TYPE_ICON: Record<QuestionType, ReactNode> = {
  short: <AlignLeft size={16} strokeWidth={1.75} aria-hidden="true" />,
  long: <WrapText size={16} strokeWidth={1.75} aria-hidden="true" />,
  single: <ListTodo size={16} strokeWidth={1.75} aria-hidden="true" />,
  multi: <ListChecks size={16} strokeWidth={1.75} aria-hidden="true" />,
}

interface Props {
  ed: QuestionEditor
  previewShown: boolean
  onTogglePreview: () => void
}

/**
 * 既存の「予約時のお客様への質問項目」画面。
 * 1 追加したい項目を選択 ／ 2 項目（一覧） ／ 3 編集 の3段構成。
 */
export function QuestionSettings({ ed, previewShown, onTogglePreview }: Props) {
  const sel = ed.questions.find((q) => q.id === ed.selected) ?? null
  return (
    <div className="qs">
      <h2 className="qs__title t-heading" tabIndex={-1} data-page-heading>予約時のお客様への質問項目</h2>
      <a href="#" className="qs__link t-small" onClick={(e) => e.preventDefault()}>
        回答内容をお客様に送信する方法はこちら
      </a>

      <section className="qs__band" aria-labelledby="qs-h1">
        <h3 id="qs-h1" className="qs__step t-body">
          <span className="qs__no">1</span>追加したい項目を選択してください
        </h3>
        <div className="qs__adds">
          {QUESTION_TYPES.map((t) => (
            <button key={t} type="button" className="qadd" onClick={() => ed.addQuestion(t)}>
              <span className="qadd__plus" aria-hidden="true">
                <Plus size={16} strokeWidth={2} />
              </span>
              {TYPE_ICON[t]}
              {QUESTION_TYPE_LABEL[t]}
              <span className="sr-only">の質問を追加</span>
            </button>
          ))}
        </div>
      </section>

      <div className="qs__cols">
        <section className="qs__list" aria-labelledby="qs-h2">
          <div className="qs__colhead">
            <h3 id="qs-h2" className="qs__step t-body">
              <span className="qs__no">2</span>項目
            </h3>
          </div>
          <SortableList
            items={ed.questions}
            getId={(q) => q.id}
            getName={(q) => q.label}
            ariaLabel="質問項目の一覧"
            onMove={ed.moveQuestion}
            itemClassName={(q) => (q.id === ed.selected ? 'is-selected' : '')}
            renderItem={(q) => (
              <button type="button" className="qitem" aria-current={q.id === ed.selected ? 'true' : undefined} onClick={() => ed.setSelected(q.id)}>
                <span className="qitem__top">
                  {TYPE_ICON[q.type]}
                  <span className="qitem__label">
                    {q.label}
                    {!q.label && <span className="sr-only">（質問内容が未入力）</span>}
                  </span>
                  <span className={`qbadge ${q.required ? 'qbadge--req' : 'qbadge--opt'}`}>{q.required ? '必須' : '任意'}</span>
                </span>
                <span className={`qitem__sub${q.friend ? ' is-linked' : ''}`}>
                  <Link2 size={16} strokeWidth={1.75} aria-hidden="true" />
                  {q.friend ? FRIEND_FIELD_LABEL[q.friend.field] : 'なし'}
                  <span className="sr-only">{q.friend ? '（友だち情報に回答を記録）' : '（友だち情報への記録なし）'}</span>
                </span>
              </button>
            )}
          />
        </section>

        <section className="qs__edit" aria-labelledby="qs-h3">
          <div className="qs__colhead">
            <h3 id="qs-h3" className="qs__step t-body">
              <span className="qs__no">3</span>編集
            </h3>
            {sel && (
              <span className="qpill qpill--static">
                {TYPE_ICON[sel.type]}
                {QUESTION_TYPE_LABEL[sel.type]}
              </span>
            )}
          </div>
          {sel && <EditForm key={sel.id} q={sel} ed={ed} />}
          {/* 削除とプレビューは誤操作を避けるため、左右の端に離して置く */}
          <div className="qs__foot">
            {sel ? (
              <button type="button" className="qdel" onClick={() => ed.removeQuestion(sel.id)}>
                この項目を削除
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="qpill" aria-pressed={previewShown} aria-controls="booking-preview" onClick={onTogglePreview}>
              {previewShown ? <Eye size={16} strokeWidth={1.75} aria-hidden="true" /> : <EyeOff size={16} strokeWidth={1.75} aria-hidden="true" />}
              プレビュー
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} className={`qtoggle${on ? ' is-on' : ''}`} onClick={() => onChange?.(!on)}>
      <span className="qtoggle__knob" />
    </button>
  )
}

function EditForm({ q, ed }: { q: Question; ed: QuestionEditor }) {
  const helpOpen = ed.helpOpen[q.id] ?? q.help !== ''
  const linkable = canLinkFriend(q.type)
  return (
    <div className="qform">
      <div className="qform__row">
        <label htmlFor={FIELD.label} className="qform__label">
          質問内容
        </label>
        <span className="qform__count t-small" aria-live="off">
          {Array.from(q.label).length}/{LABEL_MAX}
        </span>
      </div>
      <textarea id={FIELD.label} className="input input--textarea qform__text" rows={3} maxLength={LABEL_MAX} value={q.label} onChange={(e) => ed.patch(q.id, { label: e.target.value })} />

      <button type="button" className="qform__help-toggle t-small" aria-expanded={helpOpen} onClick={() => ed.toggleHelp(q.id, !helpOpen)}>
        質問の補足を入力
        <ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
      </button>
      {helpOpen && (
        <>
          <label htmlFor={FIELD.help} className="sr-only">
            質問の補足
          </label>
          <textarea id={FIELD.help} className="input input--textarea qform__text qform__text--help" rows={2} value={q.help} onChange={(e) => ed.patch(q.id, { help: e.target.value })} />
        </>
      )}

      <div className="qform__line">
        <span className="qform__label">回答設定</span>
        <span className="qform__switch">
          <span className={q.required ? 'is-on' : ''}>必須</span>
          <Toggle on={q.required} onChange={(v) => ed.patch(q.id, { required: v })} label="回答設定（オンで必須、オフで任意）" />
          <span className={!q.required ? 'is-off' : ''}>任意</span>
        </span>
      </div>

      {q.type === 'short' && (
        <div className="qform__line">
          <span className="qform__label">入力内容</span>
          <span className="qform__switch">
            <span>制限する</span>
            <Toggle on={false} disabled label="入力内容の制限（この試作では変更できません）" />
            <span className="is-off">制限しない</span>
          </span>
        </div>
      )}

      {q.type === 'single' && (
        <fieldset className="qform__group">
          <legend className="qform__label">表示方法</legend>
          <div className="qform__cards">
            <label className="qcard is-selected">
              <span className="qcard__head">
                <input type="radio" name="display" checked readOnly />
                ラジオボタン
              </span>
              <span className="qcard__desc">選択肢が少ない場合に適しています</span>
            </label>
            <label className="qcard is-disabled">
              <span className="qcard__head">
                <input type="radio" name="display" disabled />
                ドロップダウン
              </span>
              <span className="qcard__desc">選択肢が多い場合に適しています</span>
            </label>
          </div>
        </fieldset>
      )}

      <div className="qform__group">
        <label htmlFor="f-friend-info" className="qform__label">
          友だち情報に回答を記録 <CircleHelp size={16} strokeWidth={1.75} aria-hidden="true" />
        </label>
        <select
          id="f-friend-info"
          className="input qform__select"
          disabled={!linkable}
          value={q.friend ? 'link' : 'none'}
          onChange={(e) => ed.patch(q.id, { friend: e.target.value === 'link' ? { field: 'name', prefill: true } : null })}
        >
          <option value="none">利用しない</option>
          {linkable && <option value="link">すでに作成済みの友だち情報に回答を記録</option>}
        </select>
      </div>

      {q.friend && linkable && (
        <>
          <div className="qform__group">
            <label htmlFor="f-friend-field" className="qform__label">
              回答を記録する友だち情報を選択してください <CircleHelp size={16} strokeWidth={1.75} aria-hidden="true" />
            </label>
            <select
              id="f-friend-field"
              className="input qform__select"
              value={q.friend.field}
              onChange={(e) => ed.patch(q.id, { friend: { ...q.friend!, field: e.target.value as FriendField } })}
            >
              {FRIEND_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {FRIEND_FIELD_LABEL[f]}
                </option>
              ))}
            </select>
          </div>
          <label className={`pv-choice qform__prefill${q.friend.prefill ? ' is-checked' : ''}`}>
            <input
              type="checkbox"
              className="pv-check"
              checked={q.friend.prefill}
              onChange={(e) => ed.patch(q.id, { friend: { ...q.friend!, prefill: e.target.checked } })}
            />
            すでに友だち情報が登録されている場合、初めから入力された状態にする
          </label>
        </>
      )}

      {isChoice(q.type) && (
        <fieldset className="qform__group qopts">
          <legend className="qform__label">選択肢を入力</legend>
          {q.type === 'multi' && (
            <p className="qopts__note t-small">
              <Info size={16} strokeWidth={1.75} aria-hidden="true" />
              複数選択の場合、友だち情報に回答を紐付けすることはできません
            </p>
          )}
          <SortableList
            items={q.options}
            getId={(o) => o.id}
            getName={(o) => o.label}
            ariaLabel="選択肢の一覧"
            onMove={(from, to) => ed.moveOption(q.id, from, to)}
            className="sortable--options"
            renderItem={(o, i) => (
              <div className="qopt">
                <label htmlFor={FIELD.option(o.id)} className="sr-only">
                  選択肢{i + 1}
                </label>
                <input id={FIELD.option(o.id)} className="input" placeholder="選択肢を入力してください" autoComplete="off" value={o.label} onChange={(e) => ed.updateOption(q.id, o.id, e.target.value)} />
                <button type="button" className="qopt__remove" aria-label={`選択肢${i + 1}を削除`} onClick={() => ed.removeOption(q.id, o.id)}>
                  <X size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
            )}
          />
          <button type="button" className="qblue" onClick={() => ed.addOption(q.id)}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            選択肢追加
          </button>
        </fieldset>
      )}
    </div>
  )
}
