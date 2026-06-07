'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useStore } from '@/lib/store'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const { auth } = useAuth()
  const { theme } = useStore()

  useEffect(() => {
    // Initialize theme
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', systemTheme === 'dark')
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }

    // Check authentication on mount
    const checkAuth = async () => {
      if (!auth.isLoading && !auth.isAuthenticated) {
        router.push('/login')
      }
    }

    checkAuth()
  }, [auth.isLoading, auth.isAuthenticated, router, theme])

  // Show loading spinner while checking auth
  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Only render children if authenticated
  if (!auth.isAuthenticated) {
    return null
  }

  return <>{children}</>
}