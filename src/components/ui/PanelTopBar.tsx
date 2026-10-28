import { ChevronLeft } from 'lucide-react'
import { CloseIcon } from './CloseIcon'

/** パネル最上部の「戻る」と「閉じる」 */
export function PanelTopBar({
  backLabel,
  onBack,
  onClose,
}: {
  backLabel?: string
  onBack?: () => void
  onClose?: () => void
}) {
  return (
    <div className="panel-bar">
      {backLabel && onBack ? (
        <button type="button" className="panel-bar__back" onClick={onBack}>
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          {backLabel}
        </button>
      ) : (
        <span />
      )}
      {onClose && (
        <button type="button" className="panel-bar__close" aria-label="閉じる" onClick={onClose}>
          <CloseIcon />
        </button>
      )}
    </div>
  )
}
