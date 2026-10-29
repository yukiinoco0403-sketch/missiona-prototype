import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Pointer } from 'lucide-react'
import { GUIDE_STEPS, guideCount, type GuideStepId } from '../../data/guide'
import { useGuide } from './GuideProvider'

const TIP_WIDTH = 320
const GAP = 8
const MARGIN = 8
/** 指先（アイコン内の座標）。指先が対象の下端に触れるように置く */
const TIP_X = 36
const TIP_Y = 28
const HAND_WIDTH = 84
/** lucide の Pointer の外形を、1つの閉じた形にしたもの（塗り用） */
const HAND_SILHOUETTE =
  'M6 4a2 2 0 0 1 4 0v5a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v1a2 2 0 0 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L6 14z'

interface Box {
  hand: { left: number; top: number } | null
  tip: { left: number; top: number } | null
}

/**
 * 操作ガイド：大きな赤い指差しアイコン（トントンと動く）で、次に触る場所を示す。
 * - 対象（target）にホバー／フォーカスすると、課題と改善の吹き出しが出る
 * - 画面には固定配置で出す（表の横スクロール枠に切り取られない）。クリックは受けない
 * - 対象の操作（complete）をすると消える。いま案内中のステップでなければ何も出さない
 * - 予約詳細パネル（z-index 20）の上にも出せる
 */
export function GuideHint({
  step,
  target,
  tipSide = 'auto',
}: {
  step: GuideStepId
  target: RefObject<HTMLElement | null> | (() => HTMLElement | null)
  /** 吹き出しを出す側。auto＝対象の上（入らなければ下）／left＝対象の左隣（対象の下に説明したい中身があるとき） */
  tipSide?: 'auto' | 'left'
}) {
  const { current } = useGuide()
  const active = current === step
  const s = GUIDE_STEPS[step]
  const count = guideCount(step)
  const uid = useId()
  const tipRef = useRef<HTMLDivElement>(null)
  const [el, setEl] = useState<HTMLElement | null>(null)
  const [hover, setHover] = useState(false)
  const [dismissed, setDismissed] = useState(false) // Esc で吹き出しだけ閉じる（ホバーし直すまで）
  const [box, setBox] = useState<Box>({ hand: null, tip: null })

  // 対象の要素（行の描画し直しで入れ替わっても追従する）
  useLayoutEffect(() => {
    const now = typeof target === 'function' ? target() : target.current // 関数のときは、描画のたびに探し直す（行の入れ替えに追従）
    if (now !== el) setEl(now)
  })

  const showTip = active && hover && !dismissed && s.items.length > 0 // 文面がないステップは、指のアイコンだけ

  const reposition = useCallback(() => {
    if (!el) return
    const r = el.getBoundingClientRect()
    const scroller = el.closest<HTMLElement>('.table-scroll, .detail__scroll, .memo__scroll')?.getBoundingClientRect()
    // 対象がスクロールで枠の外へ出たら、指は出さない
    const visible = !scroller || (r.right > scroller.left + 24 && r.left < scroller.right - 24 && r.bottom > scroller.top && r.top < scroller.bottom)
    // 画面の右端で切れないように収める
    const hand = visible ? { left: Math.min(r.right - TIP_X - 8, window.innerWidth - HAND_WIDTH - 4), top: r.bottom + 6 - TIP_Y } : null
    let tip: Box['tip'] = null
    const h = tipRef.current?.offsetHeight
    if (h) {
      if (tipSide === 'left') {
        tip = { left: Math.max(MARGIN, r.left - GAP - TIP_WIDTH), top: Math.min(Math.max(r.top, MARGIN), window.innerHeight - h - MARGIN) }
      } else {
        const left = Math.min(Math.max(r.left, MARGIN), window.innerWidth - TIP_WIDTH - MARGIN)
        const above = r.top - GAP - h >= MARGIN
        tip = { left, top: above ? r.top - GAP - h : r.bottom + GAP }
      }
    }
    setBox({ hand, tip })
  }, [el, tipSide])

  useLayoutEffect(() => {
    if (active) reposition()
  }, [active, showTip, reposition])

  // 表示直後は、周りのレイアウトが動く（サイドバーが畳まれるなど）ので、少しの間だけ位置を測り直す
  useEffect(() => {
    if (!active) return
    let raf = 0
    const until = performance.now() + 800
    const tick = () => {
      reposition()
      if (performance.now() < until) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, reposition])

  useEffect(() => {
    if (!active) return
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [active, reposition])

  // 対象へのホバー／フォーカスで吹き出しを出す。読み上げにも伝える（aria-describedby）
  useEffect(() => {
    if (!active || !el) return
    const on = () => {
      setHover(true)
      setDismissed(false)
    }
    const off = () => setHover(false)
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDismissed(true)
    }
    el.addEventListener('mouseenter', on)
    el.addEventListener('mouseleave', off)
    el.addEventListener('focus', on)
    el.addEventListener('blur', off)
    el.addEventListener('keydown', key)
    return () => {
      el.removeEventListener('mouseenter', on)
      el.removeEventListener('mouseleave', off)
      el.removeEventListener('focus', on)
      el.removeEventListener('blur', off)
      el.removeEventListener('keydown', key)
      setHover(false)
    }
  }, [active, el])
  useEffect(() => {
    if (!el || !showTip) return
    el.setAttribute('aria-describedby', `${uid}-tip`)
    return () => el.removeAttribute('aria-describedby')
  }, [el, showTip, uid])

  if (!active) return null

  return createPortal(
    <>
      {box.hand && (
        <span className="guide-hand" aria-hidden="true" style={{ left: box.hand.left, top: box.hand.top }}>
          <svg className="guide-hand__rays" width="84" height="34" viewBox="0 0 84 34">
            <path d="M36 4v12M21 10l7 9M51 10l-7 9" />
          </svg>
          <span className="guide-hand__icon">
            {/* 白い塗りは、指の輪郭を1つにつなげた形で下に敷く（輪郭線だけだと、指の間が透けて後ろの文字やスクロールバーが見える） */}
            <svg className="guide-hand__fill" width="72" height="72" viewBox="0 0 24 24">
              <path d={HAND_SILHOUETTE} />
            </svg>
            <Pointer className="guide-hand__line" size={72} strokeWidth={1.6} />
          </span>
        </span>
      )}
      {showTip && (
        <div
          ref={tipRef}
          id={`${uid}-tip`}
          role="tooltip"
          className="guide-tip"
          style={{ left: box.tip?.left ?? 0, top: box.tip?.top ?? 0, width: TIP_WIDTH, visibility: box.tip ? 'visible' : 'hidden' }}
        >
          {s.title && <p className="t-body-strong">{s.title}</p>}
          {s.items.map((it, n) => (
            <p key={n} className="t-body">
              <span className="t-body-strong">{it.label}：</span>
              {it.text}
            </p>
          ))}
          {s.note && <p className="guide-tip__note t-body">{s.note}</p>}
          <p className="guide-count t-caption">
            {count.n}/{count.total}
          </p>
        </div>
      )}
    </>,
    document.body,
  )
}
