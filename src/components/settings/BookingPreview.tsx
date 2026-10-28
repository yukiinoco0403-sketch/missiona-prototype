import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronLeft, CircleAlert, CircleDollarSign, Menu, Timer } from 'lucide-react'
import { activeOptions, type BookingSettings, type Question } from '../../data/booking'
import {
  answerText,
  formatMinutes,
  formatSlot,
  formatYen,
  isAvailable,
  parseMinutes,
  parsePrice,
  readAnswer,
  sampleDays,
  sampleTimes,
  type SampleDay,
  type StepId,
} from '../../lib/booking'
import { COURSE_PHOTO } from '../../data/photos'
import { sanitizeHtml } from '../../lib/richText'
import type { PreviewSession } from './usePreviewSession'

interface Props {
  settings: BookingSettings
  session: PreviewSession
}

/** 既存の予約画面の見出し。「内容確認」は参照できる画面がないため、仮の文言 */
const SCREEN_TITLE: Partial<Record<StepId, string>> = {
  course: 'コースを選んでください',
  datetime: '希望日時を選んでください',
  questions: 'お客様情報を入力してください',
  confirm: '予約内容を確認してください',
  done: '予約完了',
}

function FieldError({ id, text }: { id: string; text?: string }) {
  if (!text) return null
  return (
    <p id={id} className="pv-error" role="alert">
      <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
      {text}
    </p>
  )
}

/** 所要時間：既存の予約画面と同じ「01時間00分」表記 */
const formatDuration = (minutes: string) => {
  const n = parseMinutes(minutes)
  if (n === null) return formatMinutes(minutes)
  const two = (v: number) => String(v).padStart(2, '0')
  return `${two(Math.floor(n / 60))}時間${two(n % 60)}分`
}
const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * 予約者側の画面。管理用の操作は持たず、お客様と同じ「戻る」「次へ進むボタン」だけで前後の画面へ移動する。
 */
export function BookingPreview({ settings, session }: Props) {
  const { state, steps } = session
  const step: StepId = steps.includes(state.step) ? state.step : 'course'
  const bodyRef = useRef<HTMLDivElement>(null)
  const handledNonce = useRef(state.focusNonce) // 表示し直したときにフォーカスを奪わない
  const course = settings.courses.find((c) => c.id === state.courseId) ?? null

  // 画面が変わったら、予約者側の画面の先頭に戻す（入力のたびには動かさない）
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
  }, [step])

  // 予約者側の操作で画面が変わったときだけ、見出しへフォーカスを移す
  useEffect(() => {
    if (state.focusNonce === handledNonce.current) return
    handledNonce.current = state.focusNonce
    document.querySelector<HTMLElement>('.pv-root [data-step-heading]')?.focus({ preventScroll: true })
  }, [state.focusNonce])

  const progress = steps.filter((s) => s !== 'top' && s !== 'done')
  const framed = step !== 'top'

  const footer = (
    <div className="pv-foot">
      <button type="button" className="pv-back" onClick={session.back}>
        <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
        戻る
      </button>
      {step !== 'done' && (
        <span className="pv-progress" aria-hidden="true">
          {progress.map((s) => (
            <span key={s} className={`pv-progress__seg${s === step ? ' is-current' : ''}`} />
          ))}
        </span>
      )}
    </div>
  )

  return (
    <div className="pv-root" role="region" aria-label="予約画面プレビュー">
      {framed && (
        <div className={`pv-head${step === 'done' ? ' pv-head--plain' : ''}`}>
          {step !== 'done' && (
            <button type="button" className="pv-back" onClick={session.back}>
              <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
              戻る
            </button>
          )}
          <h2 className="pv-head__title t-body-strong" tabIndex={-1} data-step-heading>
            {SCREEN_TITLE[step]}
          </h2>
          <Menu className="pv-head__menu" size={20} strokeWidth={1.75} aria-hidden="true" />
        </div>
      )}
      <div ref={bodyRef} className={`pv-body${step === 'top' ? ' pv-body--flush' : ''}${step === 'done' ? ' pv-body--done' : ''}`} tabIndex={0}>
        {step === 'top' && <TopScreen settings={settings} onStart={session.next} />}
        {step === 'course' && (
          <>
            <CourseScreen settings={settings} session={session} />
            {footer}
          </>
        )}
        {step === 'datetime' && (
          <>
            <DateTimeScreen session={session} courseName={course?.name} />
            {footer}
          </>
        )}
        {step === 'questions' && (
          <>
            <QuestionsScreen settings={settings} session={session} courseName={course?.name} />
            {footer}
          </>
        )}
        {step === 'confirm' && (
          <>
            <ConfirmScreen settings={settings} session={session} />
            {footer}
          </>
        )}
        {step === 'done' && (
          <DoneScreen
            courseName={course?.name ?? ''}
            price={course ? parsePrice(course.price) : null}
            when={state.slot ? formatSlot(state.slot, parseMinutes(course?.minutes ?? '') ?? 60) : ''}
            onBackToTalk={session.restart}
          />
        )}
      </div>
    </div>
  )
}

/* ================= 予約者側の各画面 ================= */

/** 「ラベル（太字）＋グレーの枠」：選択済みの内容の表示（既存画面の「選択したメニュー」など） */
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="pv-sum">
      <p className="pv-label">{label}</p>
      <p className="pv-box">{value}</p>
    </div>
  )
}

function TopScreen({ settings, onStart }: { settings: BookingSettings; onStart: () => void }) {
  // 保存データを読み戻した場合も含め、許可した書式だけを描画する
  const intro = useMemo(() => sanitizeHtml(settings.top.introHtml), [settings.top.introHtml])
  return (
    <div className="pv-top">
      <div className="pv-top__menu" aria-hidden="true">
        <Menu size={20} strokeWidth={1.75} />
      </div>
      {settings.top.image ? <img className="pv-hero" src={settings.top.image} alt="" /> : <div className="pv-hero" aria-hidden="true" />}
      <div className="pv-top__text">
        <h2 className="pv-top__name" tabIndex={-1} data-step-heading>
          {settings.top.shopName}
        </h2>
        <div className="pv-top__intro rt" dangerouslySetInnerHTML={{ __html: intro }} />
        <button type="button" className="pv-btn" onClick={onStart}>
          {settings.top.startLabel}
        </button>
      </div>
    </div>
  )
}

function CourseScreen({ settings, session }: { settings: BookingSettings; session: PreviewSession }) {
  return (
    <div className="pv">
      <ul className="pv-cards">
        {settings.courses.map((c) => (
          <li key={c.id} className="pv-card">
            {COURSE_PHOTO[c.id] ? (
              <img className="pv-card__img" src={COURSE_PHOTO[c.id]} alt="" />
            ) : (
              <div className="pv-card__img" aria-hidden="true" />
            )}
            <div className="pv-card__body">
              <h3 className="pv-card__name">{c.name}</h3>
              <p className="pv-card__row">
                <Timer size={20} strokeWidth={1.5} aria-hidden="true" />
                {formatDuration(c.minutes)}
              </p>
              <p className="pv-card__row">
                <CircleDollarSign size={20} strokeWidth={1.5} aria-hidden="true" />
                {formatYen(c.price)}
              </p>
              <button
                type="button"
                className="pv-btn"
                onClick={() => {
                  session.selectCourse(c.id)
                  session.next()
                }}
              >
                このメニューを予約する
                <span className="sr-only">（{c.name}）</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** サンプルの「今日」と、予約できる日（固定のサンプル。実際の空き枠ではない） */
const SAMPLE_TODAY = '2026-10-27'
const availableDates = new Set(sampleDays.filter((d) => sampleTimes.some((t) => isAvailable(d.index, t))).map((d) => d.date))
const dayLabel = (d: SampleDay) => `${d.month}月${d.day}日（${d.weekday}）`

/** 月曜はじまりの月カレンダー（サンプルは2026年10月・11月） */
const MONTHS = [
  { year: 2026, month: 10 },
  { year: 2026, month: 11 },
]
function monthWeeks(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1))
  const offset = (first.getUTCDay() + 6) % 7 // 月=0
  const count = Math.ceil((offset + new Date(Date.UTC(year, month, 0)).getUTCDate()) / 7)
  return Array.from({ length: count }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.UTC(year, month - 1, 1 - offset + w * 7 + i))
      return { date: d.toISOString().slice(0, 10), day: d.getUTCDate(), inMonth: d.getUTCMonth() === month - 1 }
    }),
  )
}

const CircleMark = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
)

function DateTimeScreen({ session, courseName }: { session: PreviewSession; courseName?: string }) {
  // 既存の予約画面と同じく、最初は月表示。日にちを選ぶと週表示になり、右上の「週／月」で切り替えられる
  const [view, setView] = useState<'month' | 'week'>('month')
  const [monthIdx, setMonthIdx] = useState(0)
  const weekToggle = useRef<HTMLButtonElement>(null)
  const focusWeek = useRef(false)

  useEffect(() => {
    if (focusWeek.current && view === 'week') weekToggle.current?.focus({ preventScroll: true })
    focusWeek.current = false
  }, [view])

  const first = sampleDays[0]
  const last = sampleDays[sampleDays.length - 1]
  const cur = MONTHS[monthIdx]

  return (
    <div className="pv">
      <Summary label="選択したメニュー" value={courseName ?? ''} />

      <div className="pv-cal__bar">
        <button type="button" className="pv-cal__btn" disabled={view === 'week' || monthIdx === 0} onClick={() => setMonthIdx(0)}>
          今日
        </button>
        <span className="pv-cal__seg" role="group" aria-label="表示の切り替え">
          <button ref={weekToggle} type="button" className={view === 'week' ? 'is-on' : ''} aria-pressed={view === 'week'} onClick={() => setView('week')}>
            週
          </button>
          <button type="button" className={view === 'month' ? 'is-on' : ''} aria-pressed={view === 'month'} onClick={() => setView('month')}>
            月
          </button>
        </span>
      </div>

      {view === 'month' ? (
        <>
          <div className="pv-cal__range">
            <button type="button" className="pv-cal__btn pv-cal__btn--icon" disabled={monthIdx === 0} aria-label="前の月" onClick={() => setMonthIdx(monthIdx - 1)}>
              <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            </button>
            <p className="pv-cal__title" aria-live="polite">
              {cur.year}年{cur.month}月
            </p>
            <button type="button" className="pv-cal__btn pv-cal__btn--icon" disabled={monthIdx === MONTHS.length - 1} aria-label="次の月" onClick={() => setMonthIdx(monthIdx + 1)}>
              <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" style={{ transform: 'scaleX(-1)' }} />
            </button>
          </div>
          <table className="pv-month">
            <caption className="sr-only">
              {cur.year}年{cur.month}月のサンプルカレンダー（○の日を選ぶと、その週の時間帯が表示されます）
            </caption>
            <thead>
              <tr>
                {['月', '火', '水', '木', '金', '土', '日'].map((w) => (
                  <th key={w} scope="col">
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthWeeks(cur.year, cur.month).map((week) => (
                <tr key={week[0].date}>
                  {week.map((c) => {
                    const num = pad2(c.day)
                    const sd = sampleDays.find((d) => d.date === c.date)
                    if (c.inMonth && sd && availableDates.has(c.date)) {
                      return (
                        <td key={c.date} className="is-open">
                          <button
                            type="button"
                            className="pv-month__day"
                            aria-label={`${dayLabel(sd)}の時間を選ぶ`}
                            onClick={() => {
                              focusWeek.current = true
                              setView('week')
                            }}
                          >
                            <span className="pv-month__num">{num}</span>
                            <CircleMark />
                          </button>
                        </td>
                      )
                    }
                    const state = !c.inMonth ? ' is-out' : c.date === SAMPLE_TODAY ? ' is-today' : ' is-none'
                    return (
                      <td key={c.date} className={state.trim()}>
                        <span className="pv-month__num">{num}</span>
                        {c.inMonth && c.date !== SAMPLE_TODAY && <span className="sr-only">予約できません</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <>
          {/* サンプルは1週間分の固定なので、週の移動は表示のみ */}
          <div className="pv-cal__range">
            <button type="button" className="pv-cal__btn pv-cal__btn--icon" disabled aria-label="前の週（サンプルでは使えません）">
              <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            </button>
            <p className="pv-cal__title">
              2026年{first.month}月{first.day}日 - {pad2(last.day)}日
            </p>
            <button type="button" className="pv-cal__btn pv-cal__btn--icon" disabled aria-label="次の週（サンプルでは使えません）">
              <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" style={{ transform: 'scaleX(-1)' }} />
            </button>
          </div>

          <table className="pv-week">
            <caption className="sr-only">サンプルの予約枠（○が選択できる枠）</caption>
            <thead>
              <tr>
                <td />
                {sampleDays.map((d) => (
                  <th key={d.date} scope="col">
                    <span className="pv-week__day">{pad2(d.day)}</span>
                    <span className={`pv-week__wd${d.weekday === '土' ? ' is-sat' : d.weekday === '日' ? ' is-sun' : ''}`}>({d.weekday})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleTimes.map((t) => (
                <tr key={t}>
                  <th scope="row" className={t.endsWith(':00') ? 'is-hour' : ''}>
                    {t}
                  </th>
                  {sampleDays.map((d) => {
                    if (!isAvailable(d.index, t)) {
                      return (
                        <td key={d.date} className="is-none">
                          <span className="pv-week__none" aria-label="予約不可">
                            –
                          </span>
                        </td>
                      )
                    }
                    return (
                      <td key={d.date}>
                        <button
                          type="button"
                          className="pv-slot"
                          aria-label={`${dayLabel(d)}${t}`}
                          onClick={() => {
                            session.selectSlot({ date: d.date, time: t })
                            session.next()
                          }}
                        >
                          <CircleMark />
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

function QuestionBlock({ q, session }: { q: Question; session: PreviewSession }) {
  const { state } = session
  const uid = useId()
  const value = readAnswer(q, state.answers[q.id])
  const error = state.errors.questions[q.id]
  const errId = `${uid}-err`
  const options = activeOptions(q)

  const head = (
    <>
      <span className="pv-q__label">{q.label}</span>
      {q.required && (
        <>
          <span className="pv-req" aria-hidden="true">
            *
          </span>
          <span className="sr-only">（必須）</span>
        </>
      )}
    </>
  )
  const help = q.help.trim() ? (
    <p id={`${uid}-help`} className="pv-q__help">
      {q.help}
    </p>
  ) : null
  const describedBy = [q.help.trim() ? `${uid}-help` : '', error ? errId : ''].filter(Boolean).join(' ') || undefined

  if (q.type === 'single' || q.type === 'multi') {
    return (
      <fieldset className="pv-q" data-preview-question={q.id} aria-describedby={describedBy} aria-required={q.required || undefined}>
        <legend className="pv-q__legend">{head}</legend>
        {help}
        {options.map((o) => {
          const checked = q.type === 'single' ? value === o.id : (value as string[]).includes(o.id)
          return (
            <label key={o.id} className={`pv-choice${checked ? ' is-checked' : ''}`}>
              <input
                type={q.type === 'single' ? 'radio' : 'checkbox'}
                className={q.type === 'single' ? 'pv-radio' : 'pv-check'}
                name={`${uid}-choice`}
                checked={checked}
                onChange={() => {
                  if (q.type === 'single') session.setAnswer(q.id, q.type, o.id)
                  else {
                    const cur = value as string[]
                    session.setAnswer(q.id, q.type, checked ? cur.filter((x) => x !== o.id) : [...cur, o.id])
                  }
                }}
              />
              {o.label}
            </label>
          )
        })}
        <FieldError id={errId} text={error} />
      </fieldset>
    )
  }

  const common = {
    id: `${uid}-in`,
    value: value as string,
    onChange: (e: { target: { value: string } }) => session.setAnswer(q.id, q.type, e.target.value),
    'aria-invalid': error ? true : undefined,
    'aria-required': q.required || undefined,
    'aria-describedby': describedBy,
    autoComplete: 'off',
  } as const
  return (
    <div className="pv-q" data-preview-question={q.id}>
      <label htmlFor={`${uid}-in`} className="pv-q__legend">
        {head}
      </label>
      {help}
      {q.type === 'long' ? (
        <textarea {...common} rows={4} className={`input input--textarea${error ? ' is-error' : ''}`} />
      ) : (
        <input {...common} className={`input${error ? ' is-error' : ''}`} />
      )}
      <FieldError id={errId} text={error} />
    </div>
  )
}

function QuestionsScreen({ settings, session, courseName }: { settings: BookingSettings; session: PreviewSession; courseName?: string }) {
  const { state } = session
  const course = settings.courses.find((c) => c.id === state.courseId)
  return (
    <div className="pv">
      <Summary label="選択したメニュー" value={courseName ?? ''} />
      {state.slot && <Summary label="選択した日時" value={formatSlot(state.slot, parseMinutes(course?.minutes ?? '') ?? 60)} />}
      <h3 className="pv-sub">お客様情報入力</h3>
      {settings.questions.map((q) => (
        <QuestionBlock key={q.id} q={q} session={session} />
      ))}
      <button type="button" className="pv-btn pv-btn--next" onClick={session.next}>
        内容の最終確認にすすむ
      </button>
    </div>
  )
}

function ConfirmScreen({ settings, session }: { settings: BookingSettings; session: PreviewSession }) {
  const { state } = session
  const course = settings.courses.find((c) => c.id === state.courseId)
  const minutes = parseMinutes(course?.minutes ?? '') ?? 60
  return (
    <div className="pv">
      <Summary label="選択したメニュー" value={course ? `${course.name}（${formatDuration(course.minutes)}・${formatYen(course.price)}）` : ''} />
      {state.slot && <Summary label="選択した日時" value={formatSlot(state.slot, minutes)} />}
      <h3 className="pv-sub">お客様情報入力</h3>
      {settings.questions.map((q) => (
        <Summary key={q.id} label={q.label} value={answerText(q, state.answers[q.id])} />
      ))}
      <button type="button" className="pv-btn pv-btn--next" onClick={session.confirm}>
        予約を確定する
      </button>
    </div>
  )
}

/** 予約完了（既存の予約画面）。「トークに戻る」はLINEのトーク画面へ戻る操作なので、プレビューでは質問入力の最初に戻す */
function DoneScreen({ courseName, price, when, onBackToTalk }: { courseName: string; price: number | null; when: string; onBackToTalk: () => void }) {
  return (
    <div className="pv-done">
      <p className="pv-done__thanks">ご予約ありがとうございました</p>
      <dl className="pv-done__list">
        <div className="pv-done__row">
          <dt className="pv-label">予約日時</dt>
          <dd>{when}</dd>
        </div>
        <div className="pv-done__row">
          <dt className="pv-label">メニュー</dt>
          <dd>{courseName}</dd>
        </div>
        <div className="pv-done__row">
          <dt className="pv-label">料金（税込）</dt>
          <dd>{price === null ? '—' : `¥${price.toLocaleString('ja-JP')}-`}</dd>
        </div>
      </dl>
      <button type="button" className="pv-btn pv-done__back" onClick={onBackToTalk}>
        トークに戻る
      </button>
    </div>
  )
}
