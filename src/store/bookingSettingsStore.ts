/**
 * 予約設定の保存（変更のたびに自動で保存する。既存の質問項目画面にも保存ボタンはない）。②のお客様メモ（mishona.customerMemos.v1）とは別のキーに保存し、互いのデータに触れない。
 * localStorage はプロトタイプの動作確認用であり、本番の保存方式の提案ではない。
 */
import { defaultSettings, type BookingSettings, type Question } from '../data/booking'

export const SETTINGS_STORAGE_KEY = 'mishona.bookingSettings.v1'

function looksValid(s: unknown): s is BookingSettings {
  const x = s as BookingSettings
  return Boolean(
    x &&
      x.top && typeof x.top.shopName === 'string' &&
      Array.isArray(x.courses) &&
      x.staff && Array.isArray(x.staff.members) &&
      Array.isArray(x.questions) &&
      x.terms && typeof x.terms.body === 'string',
  )
}

/** 以前の保存形式（top.intro が改行つきの文字列）から、いまの形式へ */
function migrate(s: BookingSettings): BookingSettings {
  const d = defaultSettings().top
  const old = s.top as Partial<BookingSettings['top']> & { intro?: string }
  const introHtml =
    typeof old.introHtml === 'string'
      ? old.introHtml
      : typeof old.intro === 'string'
        ? old.intro.split('\n').map((l) => `<p>${l.replace(/&/g, '&amp;').replace(/</g, '&lt;') || '<br>'}</p>`).join('')
        : d.introHtml
  // 友だち情報の記録設定がない古い保存データ：お名前はシステム表示名を反映する設定に、ほかは「利用しない」に
  const questions = s.questions.map((q) => {
    const x = q as Question & { friend?: Question['friend'] }
    if (x.friend !== undefined) return q
    return { ...q, friend: q.id === 'q-name' ? { field: 'name' as const, prefill: true } : null }
  })
  return {
    ...s,
    questions,
    top: {
      show: typeof old.show === 'boolean' ? old.show : d.show,
      image: old.image === null || typeof old.image === 'string' ? old.image : d.image,
      shopName: old.shopName ?? d.shopName,
      introHtml,
      startLabel: old.startLabel ?? d.startLabel,
    },
  }
}

export function loadSettings(): BookingSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { settings?: unknown }
      if (looksValid(parsed.settings)) return migrate(parsed.settings)
    }
  } catch {
    // 破損データは初期値で置き換える
  }
  return defaultSettings()
}

export function persistSettings(settings: BookingSettings): boolean {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), settings }))
    return true
  } catch {
    return false
  }
}
