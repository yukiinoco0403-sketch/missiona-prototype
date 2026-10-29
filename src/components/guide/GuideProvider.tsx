import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { GUIDE_ORDER, type GuideStepId } from '../../data/guide'

/**
 * 操作ガイドの進み具合。画面に出すアイコンは常に1つだけ（順番が来たステップだけ）。
 * 保存はしない：URLを開き直す（リロードする）たびに、最初から案内する。
 */
interface GuideContextValue {
  /** いま案内中のステップ（全部終わったら null） */
  current: GuideStepId | null
  /** そのステップの操作をしたとき：次のステップへ進む（飛ばした手前のステップも終わりにする） */
  complete: (step: GuideStepId) => void
  /** 指定したステップだけ未完了に戻して、その先頭からもう一度案内する（ほかの画面の進み具合は変えない） */
  restart: (steps: GuideStepId[]) => void
}

const GuideContext = createContext<GuideContextValue>({ current: null, complete: () => {}, restart: () => {} })

export const useGuide = () => useContext(GuideContext)

export function GuideProvider({ children }: { children: ReactNode }) {
  const [done, setDone] = useState<GuideStepId[]>([])
  const complete = useCallback(
    (step: GuideStepId) =>
      setDone((d) => {
        const upto = GUIDE_ORDER.slice(0, GUIDE_ORDER.indexOf(step) + 1) // 先のステップを操作したら、手前も済みにする
        return upto.every((s) => d.includes(s)) ? d : [...new Set([...d, ...upto])]
      }),
    [],
  )
  const restart = useCallback(
    (steps: GuideStepId[]) =>
      setDone((d) => {
        const first = Math.min(...steps.map((s) => GUIDE_ORDER.indexOf(s)))
        // その画面の分を未完了に戻し、手前のステップは済みにする（手前が残っていると、そちらが先に出てしまうため）
        return [...new Set([...d.filter((s) => !steps.includes(s)), ...GUIDE_ORDER.slice(0, first)])]
      }),
    [],
  )
  const value = useMemo<GuideContextValue>(
    () => ({ current: GUIDE_ORDER.find((s) => !done.includes(s)) ?? null, complete, restart }),
    [done, complete, restart],
  )
  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>
}
