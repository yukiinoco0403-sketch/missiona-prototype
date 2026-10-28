import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Clock, Link as LinkIcon, List } from 'lucide-react'
import { ReservationsHeader } from '../components/reservation/ReservationsHeader'
import { BookingPreview } from '../components/settings/BookingPreview'
import { QuestionSettings } from '../components/settings/QuestionSettings'
import { TopSettings } from '../components/settings/TopSettings'
import { usePreviewSession } from '../components/settings/usePreviewSession'
import { useQuestionEditor } from '../components/settings/useQuestionEditor'
import { type BookingSettings, type Question, type TopSettings as Top } from '../data/booking'
import { loadSettings, persistSettings } from '../store/bookingSettingsStore'
import { getSidebarCollapsed, setSidebarCollapsed } from '../store/sidebarStore'

interface NavGroup {
  title: string
  icon: typeof Clock
  items: { label: string; section?: Section }[]
}

type Section = 'questions' | 'top'
const SECTION_HASH: Record<Section, string> = { questions: '#/settings', top: '#/settings/top' }
const readSection = (): Section => (location.hash.startsWith('#/settings/top') ? 'top' : 'questions')

/** 既存の予約設定ナビ。この試作で開けるのは「お客様への質問項目」と「トップ画面設定」だけ（他は表示のみ）。 */
const NAV: NavGroup[] = [
  {
    title: 'メッセージ・予約の各種設定',
    icon: Clock,
    items: [
      { label: '予約・キャンセルの\nメッセージ・リクエストと締切' },
      { label: '予約前後に送る\nリマインドメッセージ' },
      { label: '前後の空き時間' },
      { label: '期間限定の営業' },
      { label: '店舗とスタッフの受付上限' },
    ],
  },
  {
    title: '予約画面',
    icon: List,
    items: [{ label: 'お客様への質問項目', section: 'questions' }, { label: 'トップ画面設定', section: 'top' }, { label: '店舗・ビジネス情報' }, { label: '利用規約' }, { label: 'システムワード変更 / 表示設定' }],
  },
  { title: '連携設定', icon: LinkIcon, items: [{ label: 'Googleカレンダー連携' }, { label: 'Googleスプレッドシート連携' }] },
  { title: 'その他', icon: List, items: [{ label: '予約システムの削除' }] },
]

export function ReservationSettings() {
  const [settings, setSettings] = useState<BookingSettings>(loadSettings)
  const [section, setSection] = useState<Section>(readSection)
  const [showPreview, setShowPreview] = useState(true)

  // どの設定も、変更のたびにブラウザへ保存する（既存の質問項目画面と同じ）。最初の描画では保存しない
  const savedRef = useRef(settings)
  useEffect(() => {
    if (savedRef.current === settings) return
    savedRef.current = settings
    persistSettings(settings)
  }, [settings])

  const setQuestions = useCallback(
    (u: Question[] | ((q: Question[]) => Question[])) =>
      setSettings((s) => ({ ...s, questions: typeof u === 'function' ? u(s.questions) : u })),
    [],
  )
  const patchTop = useCallback((p: Partial<Top>) => setSettings((s) => ({ ...s, top: { ...s.top, ...p } })), [])
  const ed = useQuestionEditor(settings.questions, setQuestions)

  // 設定ナビのリンク（ハッシュ）で、表示する設定を切り替える。②・①のページとは別ルート扱いにしない
  useEffect(() => {
    const onHash = () => setSection(readSection())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // 編集していない画面（コース・日時など）は固定のサンプル。編集中の設定はそのままプレビューへ渡す
  const previewSettings = useMemo<BookingSettings>(
    () => ({ ...settings, staff: { ...settings.staff, enabled: false }, terms: { ...settings.terms, showConsent: false } }),
    [settings],
  )
  const session = usePreviewSession(previewSettings, section === 'top' ? 'top' : 'questions')

  // 編集する設定が変わったら、プレビューもその設定を確認できる画面へ移す（トップ画面の表示／非表示の切り替えも含む）
  const { enter } = session
  const shown = settings.top.show
  const enteredKey = useRef(`${section}/${shown}`)
  useEffect(() => {
    const key = `${section}/${shown}`
    if (enteredKey.current === key) return
    enteredKey.current = key
    enter(section === 'top' ? 'top' : 'questions')
  }, [section, shown, enter])

  // 設定を切り替えたら、画面の先頭へ戻し、見出しへフォーカスを移す
  const shownSection = useRef(section)
  useEffect(() => {
    if (shownSection.current === section) return
    shownSection.current = section
    document.querySelector('.app__main')?.scrollTo({ top: 0 })
    document.querySelector<HTMLElement>('.smain [data-page-heading]')?.focus({ preventScroll: true })
  }, [section])

  // プレビューを表示している間だけ、既存のサイドバーを閉じて横幅を確保する（閉じる前の状態に戻る）
  useEffect(() => {
    if (!showPreview) return
    const before = getSidebarCollapsed()
    setSidebarCollapsed(true)
    return () => setSidebarCollapsed(before)
  }, [showPreview])

  // 追加・選択肢追加の直後は、入力欄へフォーカスを移す（入力中のライブ更新ではフォーカスを動かさない）
  const { focusField } = ed
  useEffect(() => {
    if (!focusField) return
    const el = document.getElementById(focusField.id)
    el?.focus()
    el?.scrollIntoView({ block: 'nearest' })
  }, [focusField])

  return (
    <div className={`page page--settings${showPreview ? ' has-preview' : ''}`}>
      <ReservationsHeader active="settings" />

      <div className="swork">
        <nav className="snav" aria-label="予約設定の項目">
          {NAV.map((g) => (
            <div key={g.title} className="snav__group">
              <p className="snav__title">
                <g.icon size={16} strokeWidth={1.75} aria-hidden="true" />
                {g.title}
              </p>
              <ul>
                {g.items.map((it) => (
                  <li key={it.label}>
                    <a
                      href={it.section ? SECTION_HASH[it.section] : '#'}
                      className={`snav__item${it.section === section ? ' is-current' : ''}`}
                      aria-current={it.section === section ? 'page' : undefined}
                      onClick={it.section ? undefined : (e) => e.preventDefault()}
                    >
                      {it.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="smain">
          {section === 'top' ? (
            <TopSettings
              top={settings.top}
              onChange={patchTop}
              onSave={() => persistSettings(settings)}
              previewShown={showPreview}
              onTogglePreview={() => setShowPreview((v) => !v)}
            />
          ) : (
            <QuestionSettings ed={ed} previewShown={showPreview} onTogglePreview={() => setShowPreview((v) => !v)} />
          )}
        </div>

        {showPreview && (
          <div id="booking-preview" className="spreview">
            <BookingPreview settings={previewSettings} session={session} />
            <p className="spreview__note t-small">確認用：予約は登録されません</p>
          </div>
        )}
      </div>
    </div>
  )
}
