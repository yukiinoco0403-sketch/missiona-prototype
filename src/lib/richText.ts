/**
 * トップ画面の「テキスト」（リッチテキスト）の整形。
 * 編集欄で作られた HTML から、許可したタグ・属性・色だけを残した HTML を作る。
 * 保存データ（localStorage）を読み戻すときにも通すので、外部の文字列がそのまま描画されることはない。
 */

const ALIGNS = new Set(['left', 'center', 'right', 'justify'])
const COLOR = /^(#[0-9a-f]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/i

/** 見出しは、デザイン要件の「見出し（16px/500）」で表示する */
const RENAME: Record<string, string> = { b: 'strong', i: 'em', strike: 's', del: 's', div: 'p', h1: 'h3', h2: 'h3', h4: 'h3', h5: 'h3', h6: 'h3' }
const KEEP = new Set(['p', 'h3', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'span'])
const DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'link', 'meta', 'head', 'title'])

function readStyle(el: Element) {
  const out: { color?: string; textAlign?: string; bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean } = {}
  const st = (el as HTMLElement).style
  if (st) {
    if (st.color && COLOR.test(st.color)) out.color = st.color
    if (st.textAlign && ALIGNS.has(st.textAlign)) out.textAlign = st.textAlign
    const w = st.fontWeight
    if (w === 'bold' || w === 'bolder' || Number(w) >= 600) out.bold = true
    if (st.fontStyle === 'italic') out.italic = true
    if (st.textDecorationLine.includes('underline') || st.textDecoration.includes('underline')) out.underline = true
    if (st.textDecorationLine.includes('line-through') || st.textDecoration.includes('line-through')) out.strike = true
  }
  return out
}

function clean(node: Node, doc: Document): Node[] {
  if (node.nodeType === Node.TEXT_NODE) return [doc.createTextNode(node.textContent ?? '')]
  if (node.nodeType !== Node.ELEMENT_NODE) return []
  const el = node as Element
  const raw = el.tagName.toLowerCase()
  if (DROP.has(raw)) return []

  const children = Array.from(el.childNodes).flatMap((c) => clean(c, doc))
  const tag = RENAME[raw] ?? raw
  const style = readStyle(el)
  const color = raw === 'font' ? (el.getAttribute('color') ?? undefined) : style.color

  // 許可していないタグは、中身だけを残す。font は色の指定だけを span に引き継ぐ
  const wrap = (inner: Node[], name: string, css?: string) => {
    const e = doc.createElement(name)
    if (css) e.setAttribute('style', css)
    inner.forEach((c) => e.appendChild(c))
    return [e]
  }
  let out = children
  if (raw === 'font' || raw === 'span') {
    if (color && COLOR.test(color)) out = wrap(out, 'span', `color: ${color}`)
    if (style.bold) out = wrap(out, 'strong')
    if (style.italic) out = wrap(out, 'em')
    if (style.underline) out = wrap(out, 'u')
    if (style.strike) out = wrap(out, 's')
    return out
  }
  if (!KEEP.has(tag)) return out
  if (tag === 'br') return [doc.createElement('br')]
  const css = (tag === 'p' || tag === 'h3' || tag === 'li') && style.textAlign ? `text-align: ${style.textAlign}` : undefined
  return wrap(out, tag, css)
}

export function sanitizeHtml(html: string): string {
  const src = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const doc = document.implementation.createHTMLDocument('')
  const box = doc.createElement('div')
  Array.from(src.body.childNodes)
    .flatMap((n) => clean(n, doc))
    .forEach((n) => box.appendChild(n))
  return box.innerHTML
}

/** 文字が1つも無い（空の段落だけ）かどうか */
export function isRichTextEmpty(html: string): boolean {
  const box = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html').body
  return (box.textContent ?? '').trim() === ''
}
