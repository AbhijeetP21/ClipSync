'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    // Handle OAuth / magic-link callback. Multi-user: each authenticated user
    // gets their own clipboard (isolated by Row Level Security on user_id).
    const params = new URLSearchParams(window.location.search)
    const error = params.get('error')
    const error_description = params.get('error_description')

    if (error) {
      toast({
        title: 'Authentication Error',
        description: error_description || 'Failed to authenticate',
        variant: 'destructive',
      })
      router.push('/login')
      return
    }

    // Wait until the session has resolved before deciding where to send the user.
    if (isLoading) return

    router.push(isAuthenticated ? '/clipboard' : '/login')
  }, [isAuthenticated, isLoading, router, toast])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Processing authentication...</p>
      </div>
    </div>
  )
}