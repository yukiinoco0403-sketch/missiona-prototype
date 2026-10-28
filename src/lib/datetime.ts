/** 日時はすべて日本時間（Asia/Tokyo）で扱う */
const TZ = 'Asia/Tokyo'

const dtf = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function parts(iso: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const p of dtf.formatToParts(new Date(iso))) out[p.type] = p.value
  return out
}

/** 2026.10.26 23:50 */
export function formatDateTime(iso: string): string {
  const p = parts(iso)
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`
}

/** 作成日時（日本時間）の年 */
export function yearOf(iso: string): number {
  return Number(parts(iso).year)
}

const weekdayFmt = new Intl.DateTimeFormat('ja-JP', { timeZone: TZ, weekday: 'short' })

/** 'YYYY-MM-DD' → 曜日（例：木） */
export function weekdayOf(date: string): string {
  return weekdayFmt.format(new Date(`${date}T12:00:00+09:00`))
}

export function splitDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return { year, month, day }
}

const wdFmt = new Intl.DateTimeFormat('ja-JP', { timeZone: TZ, weekday: 'short' })

/** 2026.10.26 (月) 17:17 */
export function formatDateTimeWithWeekday(iso: string): string {
  const p = parts(iso)
  return `${p.year}.${p.month}.${p.day} (${wdFmt.format(new Date(iso))}) ${p.hour}:${p.minute}`
}
