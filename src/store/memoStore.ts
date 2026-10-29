/**
 * お客様メモの共通ストア。
 * 予約管理（詳細パネル）と1:1チャットは、必ずこの同じデータ・同じ状態を参照する。
 * 保存先の localStorage はプロトタイプの動作確認用であり、本番の保存方式の提案ではない。
 */
import { useMemo, useSyncExternalStore } from 'react'

export interface CustomerMemo {
  id: string
  customerId: string
  title: string
  body: string
  /** ISO 8601（日本時間 +09:00 で登録） */
  createdAt: string
  updatedAt: string
  /** ピン留めした日時。未設定・null はピン留めなし（ピン留めは内容の編集ではないため updatedAt は動かさない） */
  pinnedAt?: string | null
  /** 並べ替えで決めた順番（小さいほど上。同じ年の中で使う）。未設定は並べ替え前＝新しいものを上に。更新日時は動かさない */
  order?: number | null
}

/** 1人のお客様につきピン留めできる件数（プロトタイプの仕様） */
export const PIN_LIMIT = 3

const STORAGE_KEY = 'mishona.customerMemos.v1'

const longAllergy = `【体質・アレルギーに関する確認事項】
・パッチテストは2026年5月に実施し、問題なし。
・以前、ヘアカラー剤で頭皮に赤みが出たことがあるため、毎回、施術前に頭皮の状態を確認する。
・シャンプーの泡立ちが少ないと頭皮がつっぱるとのこと。洗浄力の弱いものを使う。

【施術中の注意】
・うつ伏せの姿勢が長く続くと首が疲れるため、30分ごとに声をかける。
・耳の後ろをマッサージすると、くすぐったいとのこと。力加減を弱めにする。
・アロマはラベンダー系が好み。ミント系は刺激が強く感じるため避ける。

【会話のメモ】
お子さまの受験が終わるまでは、あまり予定が入れられないとのこと。落ち着いたら、月に1回のペースで通いたいと話されていた。次回は、季節の変わり目で頭皮が乾燥しやすい時期なので、保湿ケア（スカルプ用オイル）を提案する。`

const longGuide = `ご案内したこと（2025年7月）

1. 家庭でのヘアケアについて
夜は、しっかり乾かしてから寝ること。濡れたままだと、頭皮がかゆくなりやすい。ドライヤーは頭皮から20cm離して、温風と冷風を交互に当てる。

2. おすすめしたアイテム
洗い流さないトリートメント（ミルクタイプ）。使用量は、ロングヘアで1プッシュ半を目安にお伝えした。購入は次回来店時に検討するとのこと。

3. 通い方のご相談
今は2か月に1回の来店。髪が伸びるスピードが早いため、できれば6週間ごとに通いたいが、仕事の都合で難しいと話されていた。平日の夕方18時以降の枠を優先して案内する。

4. その他
夏は汗でうねりやすいため、湿気の多い日は、まとめ髪にしやすいスタイルを希望。前髪は、目にかからない長さを維持したい。`

const now = (iso: string) => iso

const seedMemos: CustomerMemo[] = [
  // --- c-001 山田さくら：2026 / 2025 / 2024 の3年分（長文・複数行を含む） ---
  {
    id: 'm-001',
    customerId: 'c-001',
    title: 'ヘッドスパ',
    body: '力加減は強めがお好み。\n頭頂部のコリが強いため、重点的にほぐす。',
    createdAt: now('2026-10-26T23:50:00+09:00'),
    updatedAt: now('2026-10-26T23:50:00+09:00'),
  },
  {
    id: 'm-002',
    customerId: 'c-001',
    title: 'カラー',
    body: '根元が染まりにくいため、塗布量と放置時間を確認する。',
    createdAt: now('2026-10-26T23:49:00+09:00'),
    updatedAt: now('2026-10-26T23:49:00+09:00'),
  },
  {
    id: 'm-003',
    customerId: 'c-001',
    title: 'ご希望',
    body: '静かに過ごしたいとのご希望あり。',
    createdAt: now('2026-10-26T23:48:00+09:00'),
    updatedAt: now('2026-10-26T23:48:00+09:00'),
  },
  {
    id: 'm-004',
    customerId: 'c-001',
    title: '体質・アレルギー・施術中の注意（長文）',
    body: longAllergy,
    createdAt: now('2026-06-14T16:20:00+09:00'),
    updatedAt: now('2026-07-02T10:15:00+09:00'),
  },
  {
    id: 'm-005',
    customerId: 'c-001',
    title: 'パーマ',
    body: 'トップがかかりにくい。\n次回は弱めの薬剤を2回に分けて塗布する。',
    createdAt: now('2026-03-02T11:05:00+09:00'),
    updatedAt: now('2026-03-02T11:05:00+09:00'),
  },
  {
    id: 'm-006',
    customerId: 'c-001',
    title: 'カット',
    body: '襟足が伸びていたので短く切った。\n次回は前髪を2cm残す。',
    createdAt: now('2025-11-20T17:30:00+09:00'),
    updatedAt: now('2025-11-20T17:30:00+09:00'),
  },
  {
    id: 'm-007',
    customerId: 'c-001',
    title: 'ご案内メモ（長文）',
    body: longGuide,
    createdAt: now('2025-07-08T14:10:00+09:00'),
    updatedAt: now('2025-07-08T14:10:00+09:00'),
  },
  {
    id: 'm-008',
    customerId: 'c-001',
    title: '会話のきっかけ',
    body: '趣味は登山。\n週末は近郊の低山に出かけることが多い。次回は、最近行った山の話を聞く。',
    createdAt: now('2025-02-10T10:40:00+09:00'),
    updatedAt: now('2025-02-10T10:40:00+09:00'),
  },
  {
    id: 'm-009',
    customerId: 'c-001',
    title: '初回カウンセリング',
    body: '友人の紹介で来店。\n髪のうねりと、頭皮のかゆみが気になるとのこと。\nまずはヘッドスパから試したいと希望。',
    createdAt: now('2024-09-15T15:00:00+09:00'),
    updatedAt: now('2024-09-15T15:00:00+09:00'),
  },
  // --- c-002 佐藤れん：0件（空状態の確認用） ---
  // --- c-003 高橋ゆうた：別顧客のメモが混ざらないことの確認用 ---
  {
    id: 'm-101',
    customerId: 'c-003',
    title: 'ご希望',
    body: '短めのスタイルを維持したい。\n耳まわりはすっきりと整える。',
    createdAt: now('2026-08-03T13:20:00+09:00'),
    updatedAt: now('2026-08-03T13:20:00+09:00'),
  },
  {
    id: 'm-102',
    customerId: 'c-003',
    title: 'カラー',
    body: '明るめの茶色が好み。色落ちが早いので、次回は補色を提案する。',
    createdAt: now('2025-12-01T12:00:00+09:00'),
    updatedAt: now('2025-12-01T12:00:00+09:00'),
  },
]

function persist(memos: CustomerMemo[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, memos }))
  } catch {
    // 保存できない環境ではメモリ上のみで動作する
  }
}

function load(): CustomerMemo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { memos?: CustomerMemo[] }
      if (Array.isArray(parsed.memos)) return parsed.memos
    }
  } catch {
    // 破損データは初期データで置き換える
  }
  // 初回のみ初期データを登録（以降は編集内容を上書きしない）
  persist(seedMemos)
  return seedMemos
}

let state: CustomerMemo[] = load()
const listeners = new Set<() => void>()

function commit(next: CustomerMemo[]) {
  state = next
  persist(next)
  listeners.forEach((l) => l())
}

// 別タブでの変更も反映
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      state = load()
      listeners.forEach((l) => l())
    }
  })
}

let seq = 0
const newId = () => `m-${Date.now().toString(36)}-${(seq++).toString(36)}`

export const memoStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: () => state,

  create(customerId: string, input: { title: string; body: string }): CustomerMemo {
    const at = new Date().toISOString()
    const memo: CustomerMemo = { id: newId(), customerId, ...input, createdAt: at, updatedAt: at }
    commit([...state, memo])
    return memo
  },

  /** 同じメモを更新する（複製しない）。作成日時は変えない。 */
  update(id: string, input: { title: string; body: string }) {
    commit(
      state.map((m) =>
        m.id === id ? { ...m, ...input, updatedAt: new Date().toISOString() } : m,
      ),
    )
  },

  /** ピン留めの付け外し。上限(PIN_LIMIT)を超える場合は何もせず false を返す。 */
  setPinned(id: string, pinned: boolean): boolean {
    const target = state.find((m) => m.id === id)
    if (!target) return false
    if (pinned && !target.pinnedAt) {
      const count = state.filter((m) => m.customerId === target.customerId && m.pinnedAt).length
      if (count >= PIN_LIMIT) return false
    }
    commit(state.map((m) => (m.id === id ? { ...m, pinnedAt: pinned ? new Date().toISOString() : null } : m)))
    return true
  },

  /** 並べ替えの保存。渡した順に 0,1,2… を振る（内容は変えないので更新日時は動かさない） */
  reorder(orderedIds: string[]) {
    const rank = new Map(orderedIds.map((id, i) => [id, i]))
    commit(state.map((m) => (rank.has(m.id) ? { ...m, order: rank.get(m.id)! } : m)))
  },

  /** メモを削除する（編集画面の「このメモを削除する」から。確認後に実行） */
  remove(id: string) {
    commit(state.filter((m) => m.id !== id))
  },
}

/** 顧客IDで絞り込み、作成日時の新しい順に並べたメモ */
export function useCustomerMemos(customerId: string): CustomerMemo[] {
  const all = useSyncExternalStore(memoStore.subscribe, memoStore.getSnapshot)
  return useMemo(
    () =>
      all
        .filter((m) => m.customerId === customerId)
        // 表記（+09:00 / Z）が混在しても正しく並ぶよう、文字列ではなく時刻で比較する
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id)),
    [all, customerId],
  )
}
