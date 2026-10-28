/**
 * 背景の操作・フォーカスを止める（inert）。
 * パネルの上にさらにモーダルを重ねても、片方を閉じただけで解除されないよう、要素ごとに参照数で管理する。
 */
const counts = new Map<Element, number>()

export function acquireInert(elements: Element[]): () => void {
  for (const el of elements) {
    counts.set(el, (counts.get(el) ?? 0) + 1)
    ;(el as HTMLElement).inert = true
  }
  let released = false
  return () => {
    if (released) return
    released = true
    for (const el of elements) {
      const n = (counts.get(el) ?? 1) - 1
      if (n <= 0) {
        counts.delete(el)
        ;(el as HTMLElement).inert = false
      } else {
        counts.set(el, n)
      }
    }
  }
}
