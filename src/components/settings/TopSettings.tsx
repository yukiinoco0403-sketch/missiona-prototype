import { useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { RichTextEditor } from '../ui/RichTextEditor'
import type { TopSettings as Top } from '../../data/booking'

const NAME_MAX = 50

/** 選んだ画像は、推奨サイズ（横1,000px）以内に縮小して、このブラウザの中だけに保持する */
async function readImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('read'))
      i.src = url
    })
    const scale = Math.min(1, 1000 / img.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.width * scale))
    canvas.height = Math.max(1, Math.round(img.height * scale))
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

interface Props {
  top: Top
  onChange: (patch: Partial<Top>) => void
  /** 保存ボタン：変更は入力のたびに保存されているので、保存済みであることを知らせる */
  onSave: () => boolean
  previewShown: boolean
  onTogglePreview: () => void
}

/**
 * 既存の「トップ画面設定」画面。
 * トップ画面の表示／非表示 → イメージ → 店舗名 → テキスト → 保存・プレビュー。
 */
export function TopSettings({ top, onChange, onSave, previewShown, onTogglePreview }: Props) {
  const file = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [imageError, setImageError] = useState('')
  const timer = useRef<number | undefined>(undefined)

  const say = (text: string) => {
    setMessage(text)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMessage(''), 3000)
  }

  const pickImage = async (f: File | undefined) => {
    if (!f) return
    if (!f.type.startsWith('image/') || f.type === 'image/svg+xml') {
      setImageError('画像ファイル（JPEG・PNG など）を選択してください')
      return
    }
    try {
      onChange({ image: await readImage(f) })
      setImageError('')
    } catch {
      setImageError('画像を読み込めませんでした')
    }
  }

  return (
    <div className="ts">
      <h2 id="ts-title" className="ts__title t-heading" tabIndex={-1} data-page-heading>
        トップ画面設定
      </h2>
      <p className="ts__lead">予約画面トップに表示する内容を設定します。</p>

      <section className="ts__block" aria-labelledby="ts-show">
        <h3 id="ts-show" className="ts__label">
          トップ画面設定
        </h3>
        <p className="ts__desc">
          お客様の予約画面で、トップ画面を表示するかどうかを選択できます。
          通常、予約リンクをタップすると、トップ画面が表示され、その後コース選択画面に進みます。
          「トップ画面を表示しない」を選択すると、お客様にトップ画面は表示されません。
        </p>
        <div role="radiogroup" aria-labelledby="ts-show" className="ts__radios">
          <label className={`ts__radio${top.show ? ' is-on' : ''}`}>
            <input type="radio" name="top-show" checked={top.show} onChange={() => onChange({ show: true })} />
            トップ画面を表示する
          </label>
          <label className={`ts__radio${top.show ? '' : ' is-on'}`}>
            <input type="radio" name="top-show" checked={!top.show} onChange={() => onChange({ show: false })} />
            トップ画面を表示しない
          </label>
        </div>
      </section>

      <section className="ts__block" aria-labelledby="ts-image">
        <p className="ts__label">
          <span id="ts-image">イメージ</span>
          <span className="ts__hint">推奨 1,000 × 500（px）</span>
        </p>
        <div className="ts__imgrow">
          {top.image ? <img className="ts__img" src={top.image} alt="現在のイメージ" /> : <div className="ts__img ts__img--none">画像なし</div>}
          <span className="ts__imglinks">
            <button type="button" className="ts__link ts__link--blue" onClick={() => file.current?.click()}>
              変更
            </button>
            {top.image && (
              <button type="button" className="ts__link ts__link--red" onClick={() => onChange({ image: null })}>
                削除
              </button>
            )}
          </span>
          <input
            ref={file}
            type="file"
            className="sr-only"
            accept="image/png,image/jpeg,image/gif,image/webp"
            tabIndex={-1}
            aria-label="イメージのファイル"
            onChange={(e) => {
              void pickImage(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
        {imageError && (
          <p className="ts__error t-small" role="alert">
            {imageError}
          </p>
        )}
      </section>

      <section className="ts__block">
        <label htmlFor="f-top-name" className="ts__label">
          店舗名
        </label>
        <input
          id="f-top-name"
          className="input ts__name"
          type="text"
          value={top.shopName}
          maxLength={NAME_MAX}
          autoComplete="off"
          onChange={(e) => onChange({ shopName: e.target.value })}
        />
      </section>

      <section className="ts__block">
        <p id="ts-text" className="ts__label">
          テキスト
        </p>
        <RichTextEditor id="f-top-text" label="テキスト" initialHtml={top.introHtml} onChange={(introHtml) => onChange({ introHtml })} />
      </section>

      <div className="ts__actions">
        <button
          type="button"
          className="ts__btn ts__btn--save"
          onClick={() => say(onSave() ? '保存しました' : '保存できませんでした（ブラウザの保存領域がいっぱいです）')}
        >
          保存
        </button>
        {/* 保存から64px離す（質問項目ページの「この項目を削除」との間隔と同じ） */}
        <button type="button" className="qpill ts__preview" aria-pressed={previewShown} aria-controls="booking-preview" onClick={onTogglePreview}>
          {previewShown ? <Eye size={16} strokeWidth={1.75} aria-hidden="true" /> : <EyeOff size={16} strokeWidth={1.75} aria-hidden="true" />}
          プレビュー
        </button>
        <span className="ts__saved t-small" role="status">
          {message}
        </span>
      </div>
    </div>
  )
}
