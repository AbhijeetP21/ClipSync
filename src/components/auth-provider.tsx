'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useStore } from '@/lib/store'

interface AuthProviderProps {
  children: React.ReactNode
}

// Routes that should render without an authenticated session.
const PUBLIC_ROUTES = ['/login', '/auth/callback']

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoading, isAuthenticated } = useAuth()
  const { theme } = useStore()

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname?.startsWith(route))

  useEffect(() => {
    // Keep the document theme class in sync with the store.
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', systemTheme === 'dark')
    } else {
      document.documentElement.classList.toggle('dark', theme === 'dark')
    }

    // Redirect unauthenticated users away from protected routes.
    if (!isPublicRoute && !isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, isPublicRoute, router, theme])

  // Public routes (login, OAuth callback) always render their own content.
  if (isPublicRoute) {
    return <>{children}</>
  }

  // Show loading spinner while checking auth
  if (isLoading) {
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
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
