import type { ReservationStatus } from '../../data/reservations'

/** 色だけに頼らず、アイコン形状（× / ○）と文言を併用する */
export function StatusBadge({ status }: { status: ReservationStatus }) {
  if (status === 'cancelled') {
    return (
      <span className="status status--cancelled">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <circle cx="7" cy="7" r="7" fill="var(--color-error)" />
          <path d="M4.5 4.5l5 5M9.5 4.5l-5 5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        キャンセル
      </span>
    )
  }
  return (
    <span className="status status--confirmed">
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <circle cx="7" cy="7" r="5.6" fill="none" stroke="var(--color-main)" strokeWidth="2" />
      </svg>
      予約確定
    </span>
  )
}
