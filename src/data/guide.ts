/**
 * 採用審査員向けの操作ガイド。1つずつ順番に出す（いま出ているのは先頭の1つだけ）。
 * 文面はここだけで管理する。
 */
export type GuideStepId = 'name-link' | 'memo-chip' | 'history-menu' | 'create-button' | 'create-modal' | 'pin-button' | 'settings-tab' | 'live-preview'

export interface GuideStep {
  id: GuideStepId
  /** 吹き出しの中身。見出し（課題・改善・新たな仕様/機能の提案など）と本文の組。文末は「。」で終える。空なら、指のアイコンだけで吹き出しは出さない（移動先を示すだけのとき） */
  items: { label: string; text: string }[]
  /** 吹き出しの先頭に太字で出す見出し（機能名など） */
  title?: string
  /** 吹き出しの末尾に赤字で添える補足 */
  note?: string
}

/** 出す順番 */
export const GUIDE_ORDER: GuideStepId[] = ['name-link', 'memo-chip', 'history-menu', 'create-button', 'create-modal', 'pin-button', 'settings-tab', 'live-preview']

/**
 * 「もう一度操作ガイドを表示」でやり直すステップ（押した画面から先）。
 * 予約一覧から押したら、予約詳細・お客様メモ・予約設定タブを通って、予約設定のプレビューまで最初から案内する。
 * 予約設定から押したら、その画面の分（プレビュー）だけ。1:1チャットは案内なし
 */
export const GUIDE_PAGE_STEPS: Record<'reservations' | 'settings', GuideStepId[]> = {
  reservations: ['name-link', 'memo-chip', 'history-menu', 'create-button', 'create-modal', 'pin-button', 'settings-tab', 'live-preview'],
  settings: ['live-preview'],
}

export const GUIDE_STEPS: Record<GuideStepId, GuideStep> = {
  'name-link': {
    id: 'name-link',
    title: '予約詳細へのアクセス',
    items: [
      { label: '課題', text: '予約詳細を開くには、一覧を右にスクロールして詳細ボタンを探す必要がある。' },
      { label: '改善', text: 'お客様の名前をクリックするだけで、予約詳細を開けるようにした。' },
    ],
  },
  'memo-chip': {
    id: 'memo-chip',
    title: 'お客様メモへのアクセス',
    items: [
      { label: '課題', text: '予約詳細からお客様メモを確認できず、別画面への移動が必要になる。' },
      { label: '新たな仕様・機能の提案', text: '1:1チャット内のお客様メモを、予約詳細からも確認できるようにした。' },
    ],
  },
  'history-menu': {
    id: 'history-menu',
    items: [
      { label: '課題', text: '長期使用した際に、過去のメモを探すのが大変。' },
      { label: '新たな仕様・機能の提案', text: '年ごとに過去の履歴を探せるプルダウンを設置した。' },
    ],
  },
  'create-button': {
    id: 'create-button',
    title: '新規作成ボタン',
    items: [
      { label: '課題', text: '新規作成アイコンが他のアイコンと並んでおり、操作に慣れていないユーザーは見つけるまでに時間がかかる可能性がある。' },
      { label: '改善', text: '「＋ 新規作成」というテキスト付きボタンに変更し、アクセントカラーで視認性を高めた。' },
    ],
  },
  'create-modal': {
    id: 'create-modal',
    items: [
      { label: '課題①', text: 'タイトルと本文の両方を入力しないと保存できない。' },
      { label: '改善', text: 'どちらか一方の入力でも保存できるようにした。' },
      { label: '課題②', text: '保存せずに閉じると、編集内容が破棄される。' },
      { label: '改善', text: '閉じる際に確認ダイアログを表示し、保存か破棄を選べるようにした。' },
    ],
  },
  'pin-button': {
    id: 'pin-button',
    title: 'メモのピン留め',
    items: [
      { label: '課題', text: '並び替えだけでは、重要なメモを上部に固定できない。' },
      { label: '改善', text: 'ピン留め機能を追加し、重要なメモを上部に固定できるようにした。赤いピンで固定状態も識別できる。' },
    ],
  },
  // 画面の移動先（予約設定のタブ）を指すだけ。吹き出しなし
  'settings-tab': { id: 'settings-tab', items: [] },
  'live-preview': {
    id: 'live-preview',
    title: 'リアルタイムプレビュー',
    note: '※予約確定まで操作できます。',
    items: [
      { label: '課題', text: 'プレビューが画面ごとに独立しており、予約操作全体の流れを把握しにくい。' },
      { label: '新たな仕様・機能の提案', text: '画面右側にリアルタイムプレビューを設置し、お客様側の画面と操作の流れを確認しながら構築できるようにした。' },
    ],
  },
}

/** 吹き出しの右上に出す「何番目／全部で何個」。吹き出しのあるステップだけを数える（指のアイコンだけのステップは数えない） */
export function guideCount(step: GuideStepId): { n: number; total: number } {
  const bubbles = GUIDE_ORDER.filter((id) => GUIDE_STEPS[id].items.length > 0)
  return { n: bubbles.indexOf(step) + 1, total: bubbles.length }
}
