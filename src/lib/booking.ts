/** 予約の流れ（ステップ・サンプル日時・回答の検証）。プレビューと保存の両方から使う。 */
import {
  FRIEND_SAMPLE,
  activeOptions,
  canLinkFriend,
  isChoice,
  type BookingSettings,
  type Question,
  type QuestionType,
} from '../data/booking'

export type StepId = 'top' | 'course' | 'staff' | 'datetime' | 'questions' | 'confirm' | 'done'

export const STEP_LABEL: Record<StepId, string> = {
  top: '店舗トップ・案内',
  course: 'コース選択',
  staff: 'スタッフ選択',
  datetime: '日時選択',
  questions: '質問入力',
  confirm: '予約内容確認',
  done: '完了',
}

/** スタッフ選択がOFF（または候補が0人）のとき、トップ画面を表示しない設定のときは、その画面をスキップする */
export function stepsFor(s: BookingSettings): StepId[] {
  const staff: StepId[] = s.staff.enabled && s.staff.members.length > 0 ? ['staff'] : []
  const top: StepId[] = s.top.show ? ['top'] : []
  return [...top, 'course', ...staff, 'datetime', 'questions', 'confirm', 'done']
}

/* ---------- サンプルの日時（実際の空き枠ではない） ---------- */
export interface SampleDay {
  index: number
  date: string // 'YYYY-MM-DD'
  day: number
  month: number
  weekday: string
}
const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']
export const sampleDays: SampleDay[] = WEEKDAYS.map((weekday, i) => {
  const d = new Date(Date.UTC(2026, 9, 26 + i))
  return {
    index: i,
    date: d.toISOString().slice(0, 10),
    day: d.getUTCDate(),
    month: d.getUTCMonth() + 1,
    weekday,
  }
})
export const sampleTimes = Array.from({ length: 15 }, (_, i) => {
  const m = 10 * 60 + i * 30
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
})

export interface Slot {
  date: string
  time: string
}
export const SAMPLE_SLOT: Slot = { date: '2026-10-29', time: '10:00' }

/** 月・火・日は予約不可、水は一部の時間のみ、木〜土は全時間帯（固定のサンプル） */
export function isAvailable(dayIndex: number, time: string): boolean {
  if (dayIndex === 0 || dayIndex === 1 || dayIndex === 6) return false
  if (dayIndex === 2) return time === '10:00' || time === '10:30' || time >= '15:00'
  return true
}

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const t = h * 60 + m + minutes
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export function formatSlot(slot: Slot, minutes: number): string {
  const day = sampleDays.find((d) => d.date === slot.date)
  const head = day ? `${day.month}月${day.day}日（${day.weekday}）` : slot.date
  return `${day ? '2026年' : ''}${head}${slot.time} - ${addMinutes(slot.time, minutes)}`
}

/* ---------- 数値の読み取り（入力途中の不正値はプレビューでは安全な値に） ---------- */
export const parseMinutes = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null)
export const parsePrice = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null)
export const formatYen = (s: string) => {
  const n = parsePrice(s)
  return n === null ? '—' : `${n.toLocaleString('ja-JP')}円（税込）`
}
export const formatMinutes = (s: string) => {
  const n = parseMinutes(s)
  return n === null ? '—' : `${n}分`
}

/* ---------- 仮回答 ---------- */
export interface AnswerEntry {
  /** 回答したときの形式。形式が変わったら、その質問の回答だけを捨てる */
  type: QuestionType
  value: string | string[]
}

/**
 * 現在の質問の形式・選択肢に合う回答だけを返す（合わなければ空）。
 * まだ何も入力していない質問は、友だち情報の「初めから入力された状態にする」がONなら、友だち情報の値（架空）を返す。
 */
export function readAnswer(q: Question, entry?: AnswerEntry): string | string[] {
  const empty = isChoice(q.type) && q.type === 'multi' ? [] : ''
  if (!entry && q.friend?.prefill && canLinkFriend(q.type)) return FRIEND_SAMPLE[q.friend.field]
  if (!entry || entry.type !== q.type) return empty
  if (q.type === 'single') {
    const v = typeof entry.value === 'string' ? entry.value : ''
    return activeOptions(q).some((o) => o.id === v) ? v : ''
  }
  if (q.type === 'multi') {
    const ids = new Set(activeOptions(q).map((o) => o.id))
    return Array.isArray(entry.value) ? entry.value.filter((v) => ids.has(v)) : []
  }
  return typeof entry.value === 'string' ? entry.value : ''
}

/** プレビュー用の仮の上限（エルメの実際の制限ではない） */
export const SHORT_MAX = 100
export const LONG_MAX = 1000

export function answerText(q: Question, entry?: AnswerEntry): string {
  const v = readAnswer(q, entry)
  if (Array.isArray(v)) {
    return v.map((id) => q.options.find((o) => o.id === id)?.label ?? '').filter(Boolean).join('、')
  }
  if (q.type === 'single') return q.options.find((o) => o.id === v)?.label ?? ''
  return v
}
