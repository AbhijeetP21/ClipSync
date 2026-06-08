'use client'

import { Toaster as SonnerToaster } from 'sonner'

import { useStore } from '@/lib/store'

export function Toaster() {
  const theme = useStore((state) => state.theme)

  return (
    <SonnerToaster
      theme={theme}
      position="bottom-right"
      richColors
      closeButton
    />
  )
}
