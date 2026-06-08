'use client'

import { useEffect } from 'react'
import { initializeTheme } from '@/lib/store'

interface ThemeProviderProps {
  children: React.ReactNode
  // Accepts (and ignores) next-themes-style props passed from the layout.
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Theme is managed by the Zustand store; restore the saved preference on mount.
  useEffect(() => {
    initializeTheme()
  }, [])

  return <>{children}</>
}
