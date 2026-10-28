/** 実写真は使わず、イニシャルの円形プレースホルダーで代替 */
export function Avatar({
  initial,
  tone = 'blue',
  size = 24,
}: {
  initial: string
  tone?: 'blue' | 'yellow' | 'green' | 'dark'
  size?: number
}) {
  return (
    <span
      className={`avatar avatar--${tone}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}
