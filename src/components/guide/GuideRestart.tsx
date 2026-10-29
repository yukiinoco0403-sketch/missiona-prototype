import { Pointer } from 'lucide-react'
import { GUIDE_PAGE_STEPS } from '../../data/guide'
import { Button } from '../ui/Button'
import type { Route } from '../layout/Sidebar'
import { useGuide } from './GuideProvider'

/**
 * 操作ガイドを読み返すためのボタン（見出し「SAMPLE Hair&Spa」の右の空きに固定して出す）。
 * いま開いている画面の分だけ、最初からもう一度1つずつ案内する（画面は移動しない）。案内のない画面（1:1チャット）には出さない。
 * 予約一覧・予約設定のどちらも同じ位置（入力欄や表に重ならない、タイトルと右上ボタンの間）。
 */
export function GuideRestart({ route }: { route: Route }) {
  const { restart } = useGuide()
  if (route === 'chat') return null
  return (
    <Button variant="outline-link" className="guide-restart" onClick={() => restart(GUIDE_PAGE_STEPS[route])}>
      もう一度操作ガイドを表示
      <Pointer size={20} strokeWidth={1.75} aria-hidden="true" />
    </Button>
  )
}
