import { useCallback, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Calendar, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Avatar } from '../components/ui/Avatar'
import { Pagination } from '../components/ui/Pagination'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { Select } from '../components/ui/Select'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ReservationsHeader } from '../components/reservation/ReservationsHeader'
import { ReservationDetailPanel } from '../components/reservation/ReservationDetailPanel'
import { getCustomer } from '../data/customers'
import { formatTableDate, lastOperationAt, reservations, todayLabel } from '../data/reservations'
import { formatDateTimeWithWeekday } from '../lib/datetime'

const yen = (n: number) => `¥ ${n.toLocaleString('ja-JP')}`

export function TodayReservations() {
  const [mode, setMode] = useState('new')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  const openDetail = useCallback((id: string, trigger: HTMLElement) => {
    triggerRef.current = trigger
    setSelectedId(id)
  }, [])

  const closeDetail = useCallback(() => {
    // パネルが背景の inert を解除してから、開いた要素へフォーカスを戻す
    flushSync(() => setSelectedId(null))
    triggerRef.current?.focus({ preventScroll: true })
  }, [])

  const rows = reservations.filter((r) => r.listed)
  const selected = rows.find((r) => r.id === selectedId)

  const count = rows.length

  return (
    <div className="page">
      <ReservationsHeader active="today" />

      <div className="toolbar">
        <div className="toolbar__left">
          <h2 className="t-body-strong">
            {todayLabel.year}年{todayLabel.month}月{todayLabel.day}日({todayLabel.weekday})
          </h2>
          <SegmentedControl
            ariaLabel="表示切り替え"
            activeId={mode}
            onSelect={setMode}
            items={[
              { id: 'new', label: '新着の予約', icon: <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" /> },
              { id: 'today', label: '本日の予約', icon: <Calendar size={14} strokeWidth={1.75} aria-hidden="true" /> },
            ]}
          />
        </div>
        <div className="toolbar__right">
          <label className="toolbar__perpage">
            <span className="t-body">表示件数：</span>
            <Select defaultValue="50">
              <option value="50">50件</option>
            </Select>
          </label>
          <span className="t-body">1 - {count} / {count}行</span>
          <span className="toolbar__arrows" aria-hidden="true">‹ ›</span>
        </div>
      </div>

      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label="予約一覧（横にスクロールできます）"
      >
        <table className="table">
          <colgroup>
            <col style={{ width: 208 }} />
            <col style={{ width: 266 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 132 }} />
            <col style={{ width: 210 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 98 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 154 }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">操作が行われた日時</th>
              <th scope="col">予約日</th>
              <th scope="col" className="is-time">時間</th>
              <th scope="col">ステータス</th>
              <th scope="col">お名前</th>
              <th scope="col">コース</th>
              <th scope="col">スタッフ</th>
              <th scope="col" className="is-amount">決済金額</th>
              <th scope="col"><span className="sr-only">決済状況</span></th>
              <th scope="col"><span className="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const customer = getCustomer(r.customerId)
              const operatedAt = lastOperationAt(r.id)
              return (
              <tr key={r.id}>
                <td>{operatedAt ? formatDateTimeWithWeekday(operatedAt) : '—'}</td>
                <td>{formatTableDate(r.date)}</td>
                <td className="is-time">{r.startTime}~{r.endTime}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>
                  <span className="table__name">
                    <Avatar initial={customer.avatarInitial} tone={customer.avatarTone} size={24} />
                    <button
                      type="button"
                      className="link-button"
                      aria-haspopup="dialog"
                      onClick={(e) => openDetail(r.id, e.currentTarget)}
                    >
                      {customer.displayName}
                    </button>
                  </span>
                </td>
                <td>{r.course}</td>
                <td>{r.staff}</td>
                <td className="is-amount">{yen(r.amount)}</td>
                <td className="t-caption is-note">{r.paymentNote}</td>
                <td className="is-action">
                  <Button
                    size="sm"
                    aria-label={`${customer.displayName}の予約詳細`}
                    aria-haspopup="dialog"
                    onClick={(e) => openDetail(r.id, e.currentTarget)}
                  >
                    詳細
                  </Button>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="page__pagination">
        <Pagination page={page} pageCount={1} onChange={setPage} />
      </div>

      {selected && <ReservationDetailPanel key={selected.id} reservation={selected} onClose={closeDetail} />}
    </div>
  )
}
