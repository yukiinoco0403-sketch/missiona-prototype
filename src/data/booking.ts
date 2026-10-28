/** 予約設定（改善③）。すべて架空データ。保存先は②のお客様メモとは別。 */

export type QuestionType = 'short' | 'long' | 'single' | 'multi'

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  short: '短文回答',
  long: '長文回答',
  single: '単一選択',
  multi: '複数選択',
}
export const QUESTION_TYPES: QuestionType[] = ['short', 'long', 'single', 'multi']
export const isChoice = (t: QuestionType) => t === 'single' || t === 'multi'

/** 友だち情報（LINE友だちごとに持つ情報）。回答の記録先に選べる項目。すべて架空 */
export type FriendField = 'name' | 'email' | 'phone'
export const FRIEND_FIELDS: FriendField[] = ['name', 'email', 'phone']
export const FRIEND_FIELD_LABEL: Record<FriendField, string> = {
  name: 'システム表示名',
  email: 'メールアドレス',
  phone: '電話番号',
}
/** プレビューで「初めから入力された状態」を見せるための、架空の友だち（山田さくら）の情報 */
export const FRIEND_SAMPLE: Record<FriendField, string> = {
  name: '山田さくら',
  email: 'sakura@example.com',
  phone: '090-0000-0000',
}
/** 友だち情報に回答を記録できるのは、文字で答える質問だけ（複数選択は不可。単一選択はこの試作では未対応） */
export const canLinkFriend = (t: QuestionType) => t === 'short' || t === 'long'

export interface FriendLink {
  field: FriendField
  /** すでに友だち情報が登録されている場合、初めから入力された状態にする */
  prefill: boolean
}

export interface ChoiceOption {
  id: string
  label: string
}

/** 質問は配列の位置ではなく、変わらない id で管理する（並べ替えても仮回答が別の質問に移らない） */
export interface Question {
  id: string
  type: QuestionType
  label: string
  help: string
  required: boolean
  options: ChoiceOption[]
  /** 回答を記録する友だち情報。null は「利用しない」 */
  friend: FriendLink | null
}

export interface Course {
  id: string
  name: string
  description: string
  /** 入力途中の不正な値も保持するため文字列で持つ（保存時に検証） */
  minutes: string
  price: string
}

export interface StaffMember {
  id: string
  name: string
}

/** トップ画面設定。introHtml は許可したタグだけを残した（lib/richText.ts で整形した）HTML */
export interface TopSettings {
  show: boolean
  /** 画像（data URL）。null なら画像なし */
  image: string | null
  shopName: string
  introHtml: string
  startLabel: string
}

/** 架空の既定画像（外部の画像は使わない） */
export const DEFAULT_TOP_IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 500"><rect width="1000" height="500" fill="#5b534e"/><text x="500" y="278" text-anchor="middle" font-family="Georgia, serif" font-size="64" letter-spacing="14" fill="#ffffff">SAMPLE</text></svg>`,
)}`

export interface BookingSettings {
  top: TopSettings
  courses: Course[]
  staff: { enabled: boolean; members: StaffMember[] }
  questions: Question[]
  terms: { body: string; showConsent: boolean }
}

let seq = 0
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`

export function createQuestion(type: QuestionType): Question {
  return {
    id: newId('q'),
    type,
    label: '',
    help: '',
    required: true, // 既存の画面と同じく、追加直後は「必須」
    options: isChoice(type) ? [{ id: newId('o'), label: '' }] : [],
    friend: null,
  }
}

export const activeOptions = (q: Question) => q.options.filter((o) => o.label.trim() !== '')

export function defaultSettings(): BookingSettings {
  return {
    top: {
      show: true,
      image: DEFAULT_TOP_IMAGE,
      shopName: 'SAMPLE Hair&Spa',
      introHtml: '<p>ご来店ありがとうございます。</p><p>ご希望のコースと日時をお選びください。</p>',
      startLabel: '予約を始める',
    },
    courses: [
      { id: 'c-spa', name: 'ヘッドスパ', description: '頭皮の疲れをほぐす、リラックスコースです。', minutes: '60', price: '9900' },
      { id: 'c-cut', name: 'カット', description: 'ご希望のスタイルに合わせて整えます。', minutes: '60', price: '6600' },
      { id: 'c-color', name: 'カラー', description: '髪の状態を見ながら、色味をご提案します。', minutes: '90', price: '8800' },
    ],
    staff: {
      enabled: true,
      members: [
        { id: 's-1', name: '佐々木 恵' },
        { id: 's-2', name: '中村 光' },
        { id: 's-3', name: '小林 彩' },
      ],
    },
    questions: [
      // お名前は入力させず、友だち情報の「システム表示名」を反映する
      { id: 'q-name', type: 'short', label: 'お名前を入力してください', help: '', required: true, options: [], friend: { field: 'name', prefill: true } },
      {
        id: 'q-first',
        type: 'single',
        label: '当店のご利用は初めてですか？',
        help: '',
        required: true,
        options: [
          { id: 'o-first-1', label: '初めてです' },
          { id: 'o-first-2', label: '利用したことがあります' },
        ],
        friend: null,
      },
      {
        id: 'q-parking',
        type: 'single',
        label: '駐車場を利用しますか？',
        help: '事前予約制です。',
        required: false,
        options: [
          { id: 'o-park-1', label: '利用する' },
          { id: 'o-park-2', label: '利用しない' },
        ],
        friend: null,
      },
      { id: 'q-request', type: 'long', label: 'ご要望があればご記入ください', help: '', required: false, options: [], friend: null },
    ],
    terms: {
      body: '【ご予約について】\n・ご予約の変更・キャンセルは、前日の18時までにご連絡ください。\n・遅刻される場合は、事前にご連絡をお願いします。\n\n【個人情報の取り扱い】\n・ご入力いただいた情報は、ご予約の管理とご連絡のみに使用します。\n\n（この規約は架空のサンプルです）',
      showConsent: true,
    },
  }
}
