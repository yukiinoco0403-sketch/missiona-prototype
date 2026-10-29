/**
 * タイポグラフィ点検：全画面の文字が、デザイン要件の7スタイルに収まっているかを実描画で確認する。
 *
 *   npm run dev          （別ターミナルで起動しておく）
 *   npm run audit:type   （CHROME_PATH 未指定時は macOS の Google Chrome を使用）
 *
 * 許可するスタイル（サイズ / ウェイト / 行高）
 *   タイトル 24/500 ・ 画面名 20/500 ・ 見出し 16/500/24 ・ 本文 14/400/22
 *   本文の強調 14/600/22 ・ 補足 14/400/22（#888888） ・ 小さな補足 12/400/16
 */
import puppeteer from 'puppeteer-core'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:5173/'
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const ALLOWED = [
  { name: 'タイトル', size: 24, weight: 500 },
  { name: '画面名', size: 20, weight: 500 },
  { name: '見出し・ヘッダー', size: 16, weight: 500, lh: 24 },
  { name: '本文', size: 14, weight: 400, lh: 22 },
  { name: '本文の強調', size: 14, weight: 600, lh: 22 },
  { name: '小さな補足', size: 12, weight: 400, lh: 16 },
]

/** ガイド外だが、理由を明記した上で許容している箇所 */
const EXCEPTIONS = [
  { selector: '.logo__text', reason: 'ロゴ（ブランド表記）' },
  { selector: '.page__shop', reason: '既存の予約管理画面のサロン名（24px/600/27px）に合わせる。依頼済み' },
  { selector: '.detail__name', reason: '現行モーダルの指定（18px/600）を再現。依頼済み' },
  { selector: '.detail__datetime', reason: '現行モーダルの指定（16px/600）を再現。依頼済み' },
]

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', defaultViewport: { width: 1280, height: 654 } })
const page = await browser.newPage()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const violations = new Map()

async function check(label) {
  const found = await page.evaluate((ALLOWED, EXCEPTIONS) => {
    const out = []
    const visible = (el) => {
      const r = el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && !el.closest('.sr-only')
    }
    document.querySelectorAll('body *').forEach((el) => {
      const tag = el.tagName
      if (tag === 'INPUT' && (el.type === 'radio' || el.type === 'checkbox')) return // 文字を持たない
      const isField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join('')
      if (!own && !isField) return
      if (!visible(el)) return
      const s = getComputedStyle(el)
      const size = parseFloat(s.fontSize), weight = Number(s.fontWeight), lh = parseFloat(s.lineHeight)
      // SELECT の行高はブラウザが常に normal にするため、サイズと太さだけを確認する
      const ok = ALLOWED.some((a) => a.size === size && a.weight === weight && (a.lh === undefined || a.lh === lh || tag === 'SELECT'))
      if (ok && size >= 12) return
      if (EXCEPTIONS.some((x) => el.matches(x.selector))) return
      const cls = (typeof el.className === 'string' ? el.className : '').split(' ')[0] || tag.toLowerCase()
      out.push(`${size}px/${weight}/${Number.isNaN(lh) ? s.lineHeight : lh + 'px'}  ${cls}「${(own || el.value || '').slice(0, 12)}」`)
    })
    return out
  }, ALLOWED, EXCEPTIONS)
  for (const f of found) violations.set(f, label)
}

await page.goto(BASE)
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.waitForSelector('.table')
await check('予約一覧')

await (await page.$$('tbody .link-button'))[0].click()
await page.waitForSelector('.detail')
await check('予約詳細（予約情報・キャンセル）')
await page.click('[data-chip=toggle]'); await sleep(80)
await check('予約詳細（予約履歴）')
await page.click('[data-chip=toggle]'); await sleep(50)
await page.click('#detail-tab-payment'); await sleep(50)
await check('予約詳細（決済情報タブ）')
await page.keyboard.press('Escape'); await sleep(80)
await (await page.$$('tbody .link-button'))[1].click(); await page.waitForSelector('.detail')
await check('予約詳細（予約確定）')
await page.keyboard.press('Escape'); await sleep(80)
await (await page.$$('tbody .link-button'))[0].click(); await page.waitForSelector('.detail')

await page.evaluate(() => document.querySelector('[data-chip=memo]').click()); await sleep(100)
await check('お客様メモ（一覧）')
await page.evaluate(() => document.querySelector('[data-memo-pin]').click()); await sleep(80)
await check('お客様メモ（ピン留め・通知）')
await page.click('.year-menu__button'); await sleep(50)
await check('お客様メモ（年メニュー）')
await page.keyboard.press('Escape')
await page.evaluate(() => [...document.querySelectorAll('.memo__actions .btn')].find((b) => b.textContent.includes('新規作成')).click()); await sleep(80)
await page.click('.memo-form .btn--primary'); await sleep(50)
await check('お客様メモ（入力・エラー）')
await page.type('.memo-form input', 'x'); await page.keyboard.press('Escape'); await sleep(80)
await check('お客様メモ（変更を破棄しますか？）')

await page.goto(BASE + '#/settings'); await page.waitForSelector('.swork'); await sleep(100)
await check('予約設定（質問項目・未選択）')
await page.click('.sortable__item:nth-child(2) .qitem'); await sleep(80)
await check('予約設定（単一選択の編集）')
await page.click('.qform__help-toggle'); await sleep(50)
await check('予約設定（補足入力）')
await page.click('.sortable__item:nth-child(4) .qitem'); await sleep(80)
await check('予約設定（長文の編集）')
await page.evaluate(() => [...document.querySelectorAll('.smain button')].find((b) => b.textContent.trim().startsWith('複数選択')).click()); await sleep(80)
await check('予約設定（複数選択の追加）')
const pv = async (text) => page.evaluate((t) => [...document.querySelectorAll('.pv-root button')].find((b) => b.textContent.trim().startsWith(t)).click(), text)
await check('プレビュー（質問入力）')
await pv('内容の最終確認にすすむ'); await sleep(60)
await check('プレビュー（内容確認・空のまま）')
await pv('戻る'); await sleep(60)
await pv('戻る'); await sleep(60)
await check('プレビュー（日時選択・月）')
await page.evaluate(() => [...document.querySelectorAll('.pv-cal__btn')].find((b) => b.getAttribute('aria-label') === '次の月').click()); await sleep(60)
await check('プレビュー（日時選択・翌月）')
await page.evaluate(() => document.querySelector('.pv-cal__bar .pv-cal__btn').click()); await sleep(60)
await page.evaluate(() => document.querySelector('.pv-month__day').click()); await sleep(60)
await check('プレビュー（日時選択・週）')
await pv('戻る'); await sleep(60)
await check('プレビュー（コース選択）')
await pv('戻る'); await sleep(60)
await check('プレビュー（トップ）')
await pv('予約を始める'); await sleep(60)
await page.evaluate(() => document.querySelectorAll('.pv-card .pv-btn')[0].click()); await sleep(60)
await page.click('.pv-month__day'); await sleep(60)
await page.click('.pv-slot'); await sleep(60)
for (const el of await page.$$('.pv-q')) {
  await el.evaluate((e) => {
    const set = (n, v) => { Object.getOwnPropertyDescriptor(n.constructor.prototype, 'value').set.call(n, v); n.dispatchEvent(new Event('input', { bubbles: true })) }
    const t = e.querySelector('textarea'), i = e.querySelector('input:not([type=radio]):not([type=checkbox])')
    if (t && !t.value) set(t, '回答'); else if (i && !i.value) set(i, '回答')
    const c = e.querySelector('input[type=radio],input[type=checkbox]')
    if (c && ![...e.querySelectorAll('input')].some((x) => x.checked)) c.click()
  })
}
await pv('内容の最終確認にすすむ'); await sleep(60)
await check('プレビュー（内容確認）')
await pv('予約を確定する'); await sleep(60)
await check('プレビュー（完了）')

// トップ画面設定
await page.goto(BASE + '#/settings/top'); await page.waitForSelector('.ts'); await sleep(100)
await check('トップ画面設定')
await page.click('#f-top-text'); await page.evaluate(() => document.execCommand('selectAll'))
await page.click('[aria-label="太字"]'); await page.select('.rte__select', 'h3'); await sleep(80)
await check('トップ画面設定（太字・見出し）')
await page.click('[aria-label="文字色"]'); await sleep(60)
await check('トップ画面設定（文字色メニュー）')
await page.keyboard.press('Escape')
await page.click('[aria-label="その他の書式"]'); await sleep(60)
await check('トップ画面設定（その他の書式メニュー）')
await page.keyboard.press('Escape')
await page.click('.ts__link--red'); await sleep(60)
await check('トップ画面設定（画像なし）')
await page.click('.ts__btn--save'); await sleep(60)
await check('トップ画面設定（保存しました）')
await check('プレビュー（トップ・画像なし／見出し）')

await page.evaluate(() => localStorage.removeItem('mishona.bookingSettings.v1'))
await page.reload(); await page.waitForSelector('.swork')
await page.goto(BASE + '#/chat'); await page.waitForSelector('.chat')
await check('1:1チャット')

console.log(violations.size === 0 ? 'OK: タイポグラフィはすべてガイド内です。' : `NG: ガイド外の文字スタイルが ${violations.size} 件あります。`)
for (const [v, where] of violations) console.log(`  [${where}] ${v}`)
await browser.close()
process.exit(violations.size === 0 ? 0 : 1)
