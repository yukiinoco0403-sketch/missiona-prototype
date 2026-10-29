import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { GUIDE_STEPS, guideCount, type GuideStepId } from '../../data/guide'
import { useGuide } from './GuideProvider'

const WIDTH = 360
const MIN_WIDTH = 260
const GAP = 16
const MARGIN = 8

interface Place {
  left: number
  top: number
  width: number
  side: 'right' | 'left' | 'below'
  tail: number
}

/**
 * 操作ガイド：指のアイコンを使わず、吹き出しだけを常時表示する（入力モーダルの横）。
 * - 対象（anchor）の右隣に出し、入らなければ左隣、それも無理なら下に出す。クリックは受けない
 * - モーダルの中（背面を止める範囲）に置くので、読み上げからも外れない
 * - 表示するかどうか（開いているか）は呼び出し側で決める。いま案内中のステップでなければ何も出さない
 */
export function GuideBubble({ step, anchor }: { step: GuideStepId; anchor: RefObject<HTMLElement | null> }) {
  const { current } = useGuide()
  const active = current === step
  const s = GUIDE_STEPS[step]
  const count = guideCount(step)
  const ref = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<Place | null>(null)

  useLayoutEffect(() => {
    if (!active) return
    const measure = () => {
      const a = anchor.current?.getBoundingClientRect()
      const h = ref.current?.offsetHeight
      if (!a || !h) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      const room = (side: 'right' | 'left') => (side === 'right' ? vw - a.right : a.left) - GAP - MARGIN
      const side = room('right') >= MIN_WIDTH ? 'right' : room('left') >= MIN_WIDTH ? 'left' : 'below'
      const width = side === 'below' ? Math.min(WIDTH, vw - 2 * MARGIN) : Math.min(WIDTH, room(side))
      const left = side === 'right' ? a.right + GAP : side === 'left' ? a.left - GAP - width : Math.min(Math.max(a.left, MARGIN), vw - width - MARGIN)
      const top = side === 'below' ? Math.min(a.bottom + GAP, vh - h - MARGIN) : Math.min(Math.max(a.top, MARGIN), vh - h - MARGIN)
      const tail = side === 'below' ? 0 : Math.min(Math.max(a.top + 28 - top, 14), h - 14)
      setPlace({ left, top, width, side, tail })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [active, anchor])

  if (!active) return null
  return (
    <div
      ref={ref}
      role="note"
      className={`guide-bubble guide-bubble--${place?.side ?? 'right'}`}
      style={{ left: place?.left ?? 0, top: place?.top ?? 0, width: place?.width ?? WIDTH, visibility: place ? 'visible' : 'hidden', ['--guide-tail' as string]: `${place?.tail ?? 28}px` }}
    >
      {s.items.map((it, n) => (
        <p key={n} className="t-body">
          <span className="t-body-strong">{it.label}：</span>
          {it.text}
        </p>
      ))}
      <p className="guide-count t-caption">
        {count.n}/{count.total}
      </p>
    </div>
  )
}
