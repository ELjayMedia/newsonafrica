"use client"

import Link from "next/link"
import type { LinkProps } from "next/link"
import type { ReactNode } from "react"

interface InteractiveLinkProps extends LinkProps {
  className?: string
  onClick?: () => void
  children: ReactNode
}

export function InteractiveLink({ href, className, onClick, children, ...props }: InteractiveLinkProps) {
  return (
    <Link href={href} className={className} onClick={onClick} {...props}>
      {children}
    </Link>
  )
}
