import { X } from 'lucide-react'

/**
 * モーダル・パネルの閉じる「✕」。既存の予約管理画面の閉じるボタンに合わせた大きさ・太さで、すべての閉じるボタンで共通にする。
 * （幅20px、線の太さ約2.5px）
 */
export function CloseIcon() {
  return <X size={20} strokeWidth={3} aria-hidden="true" />
}
