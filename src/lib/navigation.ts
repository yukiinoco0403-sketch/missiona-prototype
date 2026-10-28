/**
 * 画面遷移（ハッシュルーティング）と、未保存の変更がある画面からの離脱ガード。
 * ガードは「いま表示中の画面」が1つだけ登録する（予約設定）。
 * サイドバーのリンク・タブ・ブラウザの戻る／進むのどれで離れようとしても、確認を挟む。
 */
type Guard = (proceed: () => void) => void

let guard: Guard | null = null
let committed = typeof location === 'undefined' ? '' : location.hash
let bypass = false

export function setNavigationGuard(g: Guard | null) {
  guard = g
}

/** 例：navigate('#/reservations')。ガードがあれば確認を挟んでから移動する */
export function navigate(hash: string) {
  if (location.hash === hash) return
  const go = () => {
    bypass = true
    location.hash = hash
  }
  if (guard) guard(go)
  else go()
}

/** hashchange を監視し、確定した移動だけ onChange へ伝える。ガード中は元の位置へ戻して確認する */
export function watchNavigation(onChange: () => void): () => void {
  committed = location.hash
  const handler = () => {
    const target = location.hash
    if (target === committed) return
    if (bypass || !guard) {
      bypass = false
      committed = target
      onChange()
      return
    }
    history.replaceState(null, '', committed || '#')
    guard(() => {
      bypass = false
      committed = target
      history.replaceState(null, '', target)
      onChange()
    })
  }
  window.addEventListener('hashchange', handler)
  return () => window.removeEventListener('hashchange', handler)
}
