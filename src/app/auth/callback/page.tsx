'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export default function AuthCallbackPage() {
  const router = useRouter()
  const auth = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    // Handle OAuth callback
    const handleAuthCallback = async () => {
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

      // Check if user is authenticated
      if (auth.isAuthenticated) {
        // Check single user lock
        const isAllowed = await auth.checkSingleUserLock()
        if (!isAllowed) {
          toast({
            title: 'Access Denied',
            description: 'This instance is private.',
            variant: 'destructive',
          })
          router.push('/login')
          return
        }

        // Set single user lock if this is the first user
        const { data: currentUser } = await auth.getCurrentUser()
        if (currentUser) {
          await auth.setSingleUserLock(currentUser.email!)
        }

        router.push('/clipboard')
      } else {
        router.push('/login')
      }
    }

    handleAuthCallback()
  }, [auth, router, toast])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Processing authentication...</p>
      </div>
    </div>
  )
}