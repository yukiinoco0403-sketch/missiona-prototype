import type { SelectHTMLAttributes } from 'react'

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`select ${className}`.trim()}>
      <select className="select__control" {...rest}>
        {children}
      </select>
      <svg className="select__caret" width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
        <path d="M0 0h10L5 6z" fill="currentColor" />
      </svg>
    </span>
  )
}
