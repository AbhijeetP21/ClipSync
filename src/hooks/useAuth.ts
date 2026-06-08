import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'

export const useAuth = () => {
  const { auth, setAuth } = useStore()

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        setAuth({ isLoading: false, error: error.message })
        return
      }

      if (session) {
        const user: User = {
          id: session.user.id,
          email: session.user.email!,
          created_at: session.user.created_at,
        }
        setAuth({ 
          user, 
          isAuthenticated: true, 
          isLoading: false 
        })
      } else {
        setAuth({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        })
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const user: User = {
            id: session.user.id,
            email: session.user.email!,
            created_at: session.user.created_at,
          }
          setAuth({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          })
        } else {
          setAuth({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false 
          })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [setAuth])

  const signInWithMagicLink = async (email: string) => {
    setAuth({ isLoading: true })
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    
    if (error) {
      setAuth({ isLoading: false, error: error.message })
      return false
    }
    
    setAuth({ isLoading: false })
    return true
  }

  const signInWithGoogle = async () => {
    setAuth({ isLoading: true })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    
    if (error) {
      setAuth({ isLoading: false, error: error.message })
      return false
    }
    
    setAuth({ isLoading: false })
    return true
  }

  const signOut = async () => {
    setAuth({ isLoading: true })
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      setAuth({ isLoading: false, error: error.message })
      return false
    }
    
    setAuth({ 
      user: null, 
      isAuthenticated: false, 
      isLoading: false 
    })
    return true
  }

  const checkSingleUserLock = async (): Promise<boolean> => {
    const { data, error } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'allowed_email')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking single user lock:', error)
      return false
    }

    if (data) {
      const { data: currentUser } = await supabase.auth.getUser()
      if (currentUser.user?.email !== data.value) {
        return false
      }
    }

    return true
  }

  const getCurrentUser = async () => {
    const { data } = await supabase.auth.getUser()
    return { data: data.user }
  }

  const setSingleUserLock = async (email: string): Promise<boolean> => {
    const { error } = await supabase
      .from('config')
      .insert({ key: 'allowed_email', value: email })

    if (error) {
      console.error('Error setting single user lock:', error)
      return false
    }

    return true
  }

  return {
    ...auth,
    signInWithMagicLink,
    signInWithGoogle,
    signOut,
    checkSingleUserLock,
    setSingleUserLock,
    getCurrentUser,
  }
}