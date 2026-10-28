import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'outline-link' | 'danger'
  size?: 'md' | 'sm'
  icon?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

export function Button({
  variant = 'default',
  size = 'md',
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${className}`.trim()}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
