import { useState } from 'react'
import { BookUser, Database, FilePen, FileText, Tag } from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
import { MemoView } from '../components/memo/MemoView'
import { useMemoWorkspace } from '../components/memo/useMemoWorkspace'
import { conversations } from '../data/chats'
import { customers, getCustomer } from '../data/customers'
import { formatDateTime } from '../lib/datetime'

/** 現行画面の右側アイコンタブ。このプロトタイプで操作できるのは「メモ」のみ */
const infoTabs = [
  { id: 'data', label: 'データ', icon: Database },
  { id: 'profile', label: '友だち情報', icon: BookUser },
  { id: 'tag', label: 'タグ', icon: Tag },
  { id: 'doc', label: 'ドキュメント', icon: FileText },
  { id: 'memo', label: 'お客様メモ', icon: FilePen },
] as const

const lastOf = (id: string) => {
  const list = conversations[id] ?? []
  return list[list.length - 1]
}

/** 1:1チャット（固定の架空会話）。メモ領域は予約詳細と同じ共通部品・同じデータを使う。 */
export function ChatPage() {
  const [customerId, setCustomerId] = useState(customers[0].id)
  const customer = getCustomer(customerId)
  const ws = useMemoWorkspace(customerId)
  const messages = conversations[customerId] ?? []

  const selectCustomer = (id: string) => {
    if (id === customerId) return
    // 未保存の入力がある場合は、破棄の確認を挟む
    ws.requestLeave(() => {
      ws.reset()
      setCustomerId(id)
    })
  }

  return (
    <div className="chat">
      <section className="chat__customers" aria-label="顧客一覧">
        <h1 className="chat__list-title t-heading">全ての友だち</h1>
        <ul>
          {customers.map((c) => {
            const last = lastOf(c.id)
            const selected = c.id === customerId
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={`chat__customer${selected ? ' is-selected' : ''}`}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => selectCustomer(c.id)}
                >
                  <Avatar initial={c.avatarInitial} tone={c.avatarTone} size={40} />
                  <span className="chat__customer-text">
                    <span className="chat__customer-name t-body-strong">{c.displayName}</span>
                    <span className="chat__customer-preview t-small">{last?.text.split('\n')[0]}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="chat__conversation" aria-label={`${customer.displayName}との会話`}>
        <header className="chat__conv-head">
          <Avatar initial={customer.avatarInitial} tone={customer.avatarTone} size={32} />
          <h2 className="t-screen">{customer.displayName}</h2>
        </header>
        <div className="chat__messages" tabIndex={0} role="log" aria-label="会話">
          {messages.map((m) => (
            <div key={m.id} className={`chat__msg chat__msg--${m.from}`}>
              <span className="chat__msg-meta t-small">
                {m.from === 'shop' ? '店舗' : 'お客様'}・{formatDateTime(m.at)}
              </span>
              <p className="chat__bubble">{m.text}</p>
            </div>
          ))}
        </div>
        <p className="chat__note t-small">会話は固定の架空データです。このプロトタイプでは送信できません。</p>
      </section>

      <aside className="chat__memo" aria-label="お客様情報・メモ">
        <div className="chat-tabs" role="tablist" aria-label="お客様情報の種類">
          {infoTabs.map(({ id, label, icon: Icon }) => {
            const selected = id === 'memo'
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`chat-tab-${id}`}
                className={`chat-tabs__tab${selected ? ' is-selected' : ''}`}
                aria-selected={selected}
                aria-controls={selected ? 'chat-tabpanel-memo' : undefined}
                aria-disabled={selected ? undefined : true}
                tabIndex={selected ? 0 : -1}
                title={label}
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                <span className="sr-only">{label}</span>
              </button>
            )
          })}
        </div>
        <div className="chat__memo-card" role="tabpanel" id="chat-tabpanel-memo" aria-labelledby="chat-tab-memo">
          <MemoView ws={ws} customer={customer} />
        </div>
      </aside>
    </div>
  )
}
