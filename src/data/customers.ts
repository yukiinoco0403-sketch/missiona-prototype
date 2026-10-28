/** 顧客データ（予約・メモとは別管理。紐づけは顧客IDで行う）。すべて架空。 */
export interface Customer {
  id: string
  displayName: string
  avatarInitial: string
  avatarTone: 'blue' | 'yellow' | 'green'
}

export const customers: Customer[] = [
  { id: 'c-001', displayName: 'sakura/山田さくら', avatarInitial: '山', avatarTone: 'blue' },
  { id: 'c-002', displayName: 'ren/佐藤れん', avatarInitial: '佐', avatarTone: 'yellow' },
  { id: 'c-003', displayName: 'yuta/高橋ゆうた', avatarInitial: '高', avatarTone: 'green' },
]

export function getCustomer(id: string): Customer {
  const c = customers.find((x) => x.id === id)
  if (!c) throw new Error(`Unknown customer: ${id}`)
  return c
}
