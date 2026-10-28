/** 予約データ（顧客とは customerId で紐づく）。すべて架空。 */
import { splitDate, weekdayOf } from '../lib/datetime'

export type ReservationStatus = 'cancelled' | 'confirmed'

export interface Reservation {
  id: string
  customerId: string
  /** 'YYYY-MM-DD'（日本時間） */
  date: string
  startTime: string
  endTime: string
  status: ReservationStatus
  course: string
  courseMinutes: number
  staff: string
  amount: number
  paymentNote: string
  /** 「本日／新着の予約」一覧に表示するか（false は予約履歴にのみ表示） */
  listed: boolean
  /** 予約フォームの回答（詳細パネルの「お客様情報」） */
  answers: {
    firstVisit: string
    name: string
    email: string
    parking: string
    note: string
    agreement: string
  }
}

export const shop = {
  name: 'SAMPLE Hair&Spa',
  shortName: 'SAMPLE',
  initial: 'S',
}

export const operator = { name: '運営 太郎' }

export const todayLabel = { year: 2026, month: 10, day: 26, weekday: '月' }

const agreement = 'わかりました'

export const reservations: Reservation[] = [
  {
    id: 'r-001',
    customerId: 'c-001',
    date: '2026-10-29',
    startTime: '13:00',
    endTime: '14:00',
    status: 'cancelled',
    course: 'ヘッドスパ',
    courseMinutes: 60,
    staff: '運営者',
    amount: 9900,
    paymentNote: '決済なし',
    listed: true,
    answers: {
      firstVisit: '初めてです',
      name: '山田さくら',
      email: 'sakura.yamada@example.com',
      parking: '利用する',
      note: '',
      agreement,
    },
  },
  {
    id: 'r-002',
    customerId: 'c-002',
    date: '2026-10-30',
    startTime: '13:30',
    endTime: '14:30',
    status: 'confirmed',
    course: 'ヘッドスパ',
    courseMinutes: 60,
    staff: '運営者',
    amount: 9900,
    paymentNote: '決済なし',
    listed: true,
    answers: {
      firstVisit: '2回目以降です',
      name: '佐藤れん',
      email: 'ren.sato@example.com',
      parking: '利用しない',
      note: '',
      agreement,
    },
  },
  // 同じ顧客（c-001）の別予約。別予約から開いても同じメモが表示されることの確認用
  {
    id: 'r-003',
    customerId: 'c-001',
    date: '2026-11-05',
    startTime: '15:00',
    endTime: '16:00',
    status: 'confirmed',
    course: 'ヘッドスパ',
    courseMinutes: 60,
    staff: '運営者',
    amount: 9900,
    paymentNote: '決済なし',
    listed: true,
    answers: {
      firstVisit: '2回目以降です',
      name: '山田さくら',
      email: 'sakura.yamada@example.com',
      parking: '利用しない',
      note: '',
      agreement,
    },
  },
  // 過去の予約（予約履歴にのみ表示）
  ...[
    { id: 'r-h1', date: '2026-09-12', startTime: '11:00', endTime: '12:00', course: 'ヘッドスパ', courseMinutes: 60 },
    { id: 'r-h2', date: '2026-06-14', startTime: '15:00', endTime: '16:30', course: 'カラー', courseMinutes: 90 },
    { id: 'r-h3', date: '2025-11-20', startTime: '17:00', endTime: '18:00', course: 'カット', courseMinutes: 60 },
  ].map(
    (h): Reservation => ({
      ...h,
      customerId: 'c-001',
      status: 'confirmed',
      staff: '運営者',
      amount: 9900,
      paymentNote: '決済なし',
      listed: false,
      answers: {
        firstVisit: '2回目以降です',
        name: '山田さくら',
        email: 'sakura.yamada@example.com',
        parking: '利用しない',
        note: '',
        agreement,
      },
    }),
  ),
]

export const formatTableDate = (date: string) => {
  const d = splitDate(date)
  return `${d.year}/${d.month}/${d.day}(${weekdayOf(date)})`
}

export const formatDetailDate = (date: string) => {
  const d = splitDate(date)
  return `${d.year}.${d.month}.${d.day} (${weekdayOf(date)})`
}

/** 「この受付枠の予約履歴」に表示する操作ログ（架空） */
export interface ReservationLog {
  id: string
  reservationId: string
  at: string
  actor: string
  action: string
}

const reservationLogs: ReservationLog[] = [
  { id: 'l-1', reservationId: 'r-001', at: '2026-10-26T17:16:00+09:00', actor: '友だち', action: '予約完了' },
  { id: 'l-2', reservationId: 'r-001', at: '2026-10-26T17:17:00+09:00', actor: '友だち', action: '予約キャンセル' },
  { id: 'l-3', reservationId: 'r-002', at: '2026-10-25T09:28:00+09:00', actor: '友だち', action: '予約完了' },
  { id: 'l-4', reservationId: 'r-003', at: '2026-10-26T12:05:00+09:00', actor: '友だち', action: '予約完了' },
]

/** 新しい順 */
export const logsFor = (reservationId: string) =>
  reservationLogs
    .filter((l) => l.reservationId === reservationId)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))

/** 一覧の「操作が行われた日時」：その予約への最後の操作（予約完了・キャンセルなど）の日時。ログがなければ null */
export const lastOperationAt = (reservationId: string): string | null => logsFor(reservationId)[0]?.at ?? null

/** 同じ顧客（顧客ID）の予約を新しい順に最大10件 */
export const recentReservationsOf = (customerId: string) =>
  reservations
    .filter((r) => r.customerId === customerId)
    .sort((a, b) => (a.date + a.startTime < b.date + b.startTime ? 1 : -1))
    .slice(0, 10)
