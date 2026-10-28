import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Ellipsis,
  Italic,
  List,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react'
import { sanitizeHtml } from '../../lib/richText'

const COLORS = [
  { name: '標準（黒）', value: '#222222' },
  { name: '赤', value: '#f44336' },
  { name: '緑', value: '#08bf5a' },
  { name: '青', value: '#5799db' },
  { name: 'グレー', value: '#888888' },
]

interface Props {
  id: string
  /** 編集欄の読み上げ名（外の見出しと同じ文言） */
  label: string
  /** 最初に表示する内容。以降は編集欄が持つ（入力のたびに外から書き戻さない＝カーソルが飛ばない） */
  initialHtml: string
  onChange: (html: string) => void
}

type Panel = 'color' | 'more' | null

/**
 * トップ画面の「テキスト」編集欄（既存画面のリッチテキストエディタに合わせたツールバー）。
 * 元に戻す／やり直す・段落／見出し・文字色・太字・斜体・左／中央／右／両端揃え・「…」（下線・取り消し線・箇条書き）。
 * ブラウザの標準の編集機能（contentEditable）で動かし、変更のたびに整形した HTML を onChange へ渡す。
 */
export function RichTextEditor({ id, label, initialHtml, onChange }: Props) {
  const area = useRef<HTMLDivElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const saved = useRef<Range | null>(null)
  const initial = useRef(sanitizeHtml(initialHtml))
  const [panel, setPanel] = useState<Panel>(null)
  const [color, setColor] = useState(COLORS[0].value)
  const [fmt, setFmt] = useState({ bold: false, italic: false, left: false, center: false, right: false, full: false, block: 'p' })

  const readFormat = useCallback(() => {
    try {
      const block = document.queryCommandValue('formatBlock').toLowerCase()
      setFmt({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        left: document.queryCommandState('justifyLeft'),
        center: document.queryCommandState('justifyCenter'),
        right: document.queryCommandState('justifyRight'),
        full: document.queryCommandState('justifyFull'),
        block: block === 'h3' ? 'h3' : 'p',
      })
    } catch {
      // 書式の状態が取れないブラウザでは、ボタンの押下表示だけ更新しない
    }
  }, [])

  // カーソル・選択範囲を覚えておく（ツールバーを押してフォーカスが移っても、同じ範囲に書式を適用するため）
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0 && area.current?.contains(sel.anchorNode)) {
        saved.current = sel.getRangeAt(0).cloneRange()
        readFormat()
      }
    }
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [readFormat])

  // 開いているメニューは、外側を押す・Escape で閉じる
  useEffect(() => {
    if (!panel) return
    const down = (e: PointerEvent) => {
      if (!root.current?.querySelector('.rte__panelwrap[data-open="true"]')?.contains(e.target as Node)) setPanel(null)
    }
    document.addEventListener('pointerdown', down)
    return () => document.removeEventListener('pointerdown', down)
  }, [panel])

  const emit = () => {
    if (area.current) onChange(sanitizeHtml(area.current.innerHTML))
  }

  const run = (cmd: string, value?: string) => {
    const el = area.current
    if (!el) return
    el.focus()
    const sel = window.getSelection()
    if (saved.current && sel) {
      sel.removeAllRanges()
      sel.addRange(saved.current)
    }
    document.execCommand('styleWithCSS', false, 'false')
    document.execCommand(cmd, false, value)
    emit()
    readFormat()
  }

  const keepSelection = (e: { preventDefault: () => void }) => e.preventDefault() // ボタンを押しても編集欄のフォーカスを外さない

  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault()
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'))
  }

  const onPanelKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && panel) {
      e.stopPropagation()
      setPanel(null)
      area.current?.focus()
    }
  }

  const tool = (name: string, icon: ReactNode, onClick: () => void, pressed?: boolean) => (
    <button type="button" className="rte__btn" aria-label={name} title={name} aria-pressed={pressed} onMouseDown={keepSelection} onClick={onClick}>
      {icon}
    </button>
  )
  const ic = (C: typeof Bold) => <C size={16} strokeWidth={1.75} aria-hidden="true" />

  return (
    <div className="rte" ref={root} onKeyDown={onPanelKey}>
      <div className="rte__bar" role="toolbar" aria-label="テキストの書式">
        <span className="rte__group">
          {tool('元に戻す', ic(Undo2), () => run('undo'))}
          {tool('やり直す', ic(Redo2), () => run('redo'))}
        </span>
        <select
          className="rte__select"
          aria-label="段落の種類"
          value={fmt.block}
          onChange={(e) => run('formatBlock', e.target.value)}
        >
          <option value="p">段落</option>
          <option value="h3">見出し</option>
        </select>
        <span className="rte__panelwrap" data-open={panel === 'color'}>
          <button
            type="button"
            className="rte__btn rte__btn--color"
            aria-label="文字色"
            title="文字色"
            aria-haspopup="true"
            aria-expanded={panel === 'color'}
            onMouseDown={keepSelection}
            onClick={() => setPanel(panel === 'color' ? null : 'color')}
          >
            <span className="rte__A" style={{ '--rte-color': color } as React.CSSProperties} aria-hidden="true">
              A
            </span>
            <ChevronDown size={12} strokeWidth={1.75} aria-hidden="true" />
          </button>
          {panel === 'color' && (
            <ul className="rte__panel" role="menu" aria-label="文字色">
              {COLORS.map((c) => (
                <li key={c.value} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="rte__item"
                    onMouseDown={keepSelection}
                    onClick={() => {
                      setColor(c.value)
                      run('foreColor', c.value)
                      setPanel(null)
                    }}
                  >
                    <span className="rte__swatch" style={{ background: c.value }} aria-hidden="true" />
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </span>
        <span className="rte__group">
          {tool('太字', ic(Bold), () => run('bold'), fmt.bold)}
          {tool('斜体', ic(Italic), () => run('italic'), fmt.italic)}
        </span>
        <span className="rte__group">
          {tool('左揃え', ic(AlignLeft), () => run('justifyLeft'), fmt.left)}
          {tool('中央揃え', ic(AlignCenter), () => run('justifyCenter'), fmt.center)}
          {tool('右揃え', ic(AlignRight), () => run('justifyRight'), fmt.right)}
          {tool('両端揃え', ic(AlignJustify), () => run('justifyFull'), fmt.full)}
        </span>
        <span className="rte__panelwrap" data-open={panel === 'more'}>
          <button
            type="button"
            className="rte__btn"
            aria-label="その他の書式"
            title="その他の書式"
            aria-haspopup="true"
            aria-expanded={panel === 'more'}
            onMouseDown={keepSelection}
            onClick={() => setPanel(panel === 'more' ? null : 'more')}
          >
            {ic(Ellipsis)}
          </button>
          {panel === 'more' && (
            <ul className="rte__panel" role="menu" aria-label="その他の書式">
              {[
                { name: '下線', icon: Underline, cmd: 'underline' },
                { name: '取り消し線', icon: Strikethrough, cmd: 'strikeThrough' },
                { name: '箇条書き', icon: List, cmd: 'insertUnorderedList' },
              ].map((m) => (
                <li key={m.cmd} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="rte__item"
                    onMouseDown={keepSelection}
                    onClick={() => {
                      run(m.cmd)
                      setPanel(null)
                    }}
                  >
                    {ic(m.icon)}
                    {m.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </span>
      </div>

      <div
        ref={area}
        id={id}
        className="rte__area rt"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        spellCheck={false}
        onInput={emit}
        onPaste={onPaste}
        onFocus={() => document.execCommand('defaultParagraphSeparator', false, 'p')}
        dangerouslySetInnerHTML={{ __html: initial.current }}
      />
      <div className="rte__status t-small" aria-hidden="true">
        {fmt.block}
      </div>
    </div>
  )
}
