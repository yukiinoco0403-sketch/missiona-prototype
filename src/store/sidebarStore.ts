import { useSyncExternalStore } from 'react'

/**
 * サイドバーの開閉状態（既存の「<」ボタンの機能）。
 * 予約設定でプレビューを表示している間だけ、横幅を確保するために畳む。
 */
let collapsed = false
const listeners = new Set<() => void>()

export const getSidebarCollapsed = () => collapsed

export function setSidebarCollapsed(next: boolean) {
  if (next === collapsed) return
  collapsed = next
  listeners.forEach((l) => l())
}

export function useSidebarCollapsed() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => collapsed,
  )
}
