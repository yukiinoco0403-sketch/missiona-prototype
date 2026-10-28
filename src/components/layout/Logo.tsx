/** 独自に描いた簡易ロゴ（実ロゴ画像は使用しない） */
export function Logo() {
  return (
    <div className="logo" aria-label="L Message">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <path
          d="M15 3C8.4 3 3 7.7 3 13.6c0 3.3 1.7 6.3 4.3 8.2-.2 1.5-.9 3-1.9 4.2 2.4-.1 4.3-1 5.7-2.1 1.2.3 2.5.5 3.9.5 6.6 0 12-4.7 12-10.6S21.600 3 15 3z"
          fill="var(--color-main)"
        />
        <path d="M10.500 9.500v8h7" fill="none" stroke="#fff" strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="logo__text">L Message</span>
    </div>
  )
}
