"use client"
import type React from "react"

interface ClientWrapperProps {
  children: React.ReactNode
}

export const ClientWrapper: React.FC<ClientWrapperProps> = ({ children }) => {
  return <>{children}</>
}
