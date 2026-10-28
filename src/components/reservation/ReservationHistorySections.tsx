import { RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { formatDateTimeWithWeekday } from '../../lib/datetime'
import {
  formatDetailDate,
  logsFor,
  recentReservationsOf,
  type Reservation,
} from '../../data/reservations'

/** 「予約履歴」表示時の本文：この受付枠の操作ログ＋同じ顧客の過去の予約一覧 */
export function ReservationHistorySections({ reservation: r }: { reservation: Reservation }) {
  const logs = logsFor(r.id)
  const recent = recentReservationsOf(r.customerId)

  return (
    <div id="detail-history">
      <div className="hist__head">
        <h3 className="t-body-strong">この受付枠の予約履歴</h3>
        {/* 同期履歴の挙動は未確認のため、ボタンの配置のみ */}
        <Button size="sm" className="hist__sync" icon={<RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />}>
          同期履歴
        </Button>
      </div>

      <div className="mini-scroll" tabIndex={0} role="region" aria-label="この受付枠の予約履歴（横にスクロールできます）">
        <table className="mini-table" style={{ width: 520 }}>
          <colgroup>
            <col style={{ width: 190 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 90 }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">日時</th>
              <th scope="col">操作した人</th>
              <th scope="col">内容</th>
              <th scope="col">
                <span className="sr-only">操作</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="t-caption">
                  履歴はありません
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{formatDateTimeWithWeekday(l.at)}</td>
                <td>{l.actor}</td>
                <td>{l.action}</td>
                <td className="mini-table__action">
                  <Button size="sm" aria-label={`${formatDateTimeWithWeekday(l.at)}の${l.action}の詳細`}>
                    詳細
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="t-body-strong hist__title-2">過去（直近10件）の予約一覧</h3>
      <div className="mini-scroll" tabIndex={0} role="region" aria-label="過去の予約一覧（横にスクロールできます）">
        <table className="mini-table" style={{ width: 460 }}>
          <colgroup>
            <col style={{ width: 210 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 120 }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">日時</th>
              <th scope="col">ステータス</th>
              <th scope="col">コース</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((x) => (
              <tr key={x.id}>
                <td>
                  {formatDetailDate(x.date)} {x.startTime}~{x.endTime}
                </td>
                <td>
                  <StatusBadge status={x.status} />
                </td>
                <td>{x.course}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
