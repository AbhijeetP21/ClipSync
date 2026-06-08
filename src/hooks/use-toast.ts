'use client'

import { toast as sonnerToast } from 'sonner'

type ToastVariant = 'default' | 'destructive'

interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
}

// Thin adapter that preserves the shadcn `useToast()` API used across the app
// while delegating rendering to sonner.
export function useToast() {
  const toast = ({ title, description, variant = 'default' }: ToastOptions) => {
    const message = title ?? description ?? ''
    const opts = title ? { description } : undefined

    if (variant === 'destructive') {
      sonnerToast.error(message, opts)
    } else {
      sonnerToast(message, opts)
    }
  }

  return { toast }
}
