'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'

// Routes that render without the app chrome (no sidebar): the public marketing
// landing page, the sign-in page, and the auth callback.
const CHROMELESS_ROUTES = ['/', '/login', '/auth/callback']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isChromeless = CHROMELESS_ROUTES.includes(pathname ?? '')

  if (isChromeless) {
    return <div className="min-h-screen">{children}</div>
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
