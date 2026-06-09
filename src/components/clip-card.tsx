'use client'

import { useEffect, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { supabase } from '@/lib/supabase'
import { getSignedUrl } from '@/lib/storage'
import { useStore } from '@/lib/store'
import { copyImageToClipboard } from '@/lib/clipboard-image'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Icons } from '@/components/icons'
import { ClipCardProps } from '@/types'
import { formatDistanceToNow } from 'date-fns'

const BUCKET = 'clips-files'

export function ClipCard({ clip, onDelete, onSave, onToggleCollapse }: ClipCardProps) {
  const [isExpanded, setIsExpanded] = useState(!clip.collapsed)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState(false)
  const { toast } = useToast()

  // Resolve the active theme so code highlighting matches light or dark mode.
  const theme = useStore((s) => s.theme)
  const [isDark, setIsDark] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(theme === 'system' ? mq.matches : theme === 'dark')
    if (theme === 'system') {
      const handler = () => setIsDark(mq.matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  const isFile = clip.type === 'image' || clip.type === 'pdf'

  // Fetch a short-lived signed URL for image/pdf previews.
  useEffect(() => {
    let active = true
    if (isFile && clip.file_path) {
      setPreviewError(false)
      getSignedUrl(clip.file_path).then((url) => {
        if (!active) return
        if (url) setPreviewUrl(url)
        else setPreviewError(true)
      })
    }
    return () => {
      active = false
    }
  }, [isFile, clip.file_path])

  const handleCopy = async () => {
    try {
      if (clip.type === 'text' || clip.type === 'code') {
        await navigator.clipboard.writeText(clip.content || '')
        toast({ title: 'Copied!', description: 'Content copied to clipboard.' })
      } else if (clip.type === 'image' && previewUrl) {
        const ok = await copyImageToClipboard(previewUrl)
        if (ok) {
          toast({ title: 'Image copied', description: 'The image is on your clipboard.' })
        } else {
          await navigator.clipboard.writeText(previewUrl)
          toast({
            title: 'Link copied',
            description: 'Image copy is not supported here, so a link was copied instead.',
          })
        }
      } else if (previewUrl) {
        await navigator.clipboard.writeText(previewUrl)
        toast({ title: 'Link copied', description: 'A temporary file link was copied to your clipboard.' })
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to copy to clipboard.', variant: 'destructive' })
    }
  }

  const handleDownload = async () => {
    if (!clip.file_path) return
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(clip.file_path, 60, { download: clip.file_name || true })

    if (error || !data) {
      toast({ title: 'Download failed', description: error?.message ?? 'File not found.', variant: 'destructive' })
      return
    }

    const a = document.createElement('a')
    a.href = data.signedUrl
    a.download = clip.file_name || ''
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const handleToggleCollapse = () => {
    setIsExpanded(!isExpanded)
    onToggleCollapse(clip.id)
  }

  const getTypeIcon = () => {
    switch (clip.type) {
      case 'text':
        return <Icons.text className="h-4 w-4" />
      case 'code':
        return <Icons.code className="h-4 w-4" />
      case 'image':
        return <Icons.image className="h-4 w-4" />
      case 'pdf':
        return <Icons.file className="h-4 w-4" />
      default:
        return null
    }
  }

  const getTypeLabel = () => {
    switch (clip.type) {
      case 'text':
        return 'Text'
      case 'code':
        return 'Code'
      case 'image':
        return 'Image'
      case 'pdf':
        return 'PDF'
      default:
        return ''
    }
  }

  const formatContent = (content: string) => {
    if (!content) return ''
    if (content.length > 200) {
      return isExpanded ? content : content.substring(0, 200) + '...'
    }
    return content
  }

  const renderFileHeader = () => (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{clip.file_name}</span>
      <Button variant="outline" size="sm" onClick={handleDownload}>
        <Icons.download className="mr-2 h-4 w-4" />
        Download
      </Button>
    </div>
  )

  const renderContent = () => {
    switch (clip.type) {
      case 'text':
        return (
          <div className="space-y-2">
            <p className="text-sm whitespace-pre-wrap">{formatContent(clip.content || '')}</p>
            {clip.content && clip.content.length > 200 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleCollapse}
                className="text-xs text-muted-foreground"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </Button>
            )}
          </div>
        )

      case 'code':
        return (
          <div className="space-y-2">
            {clip.language && (
              <Badge variant="secondary" className="text-xs">
                {clip.language}
              </Badge>
            )}
            <SyntaxHighlighter
              language={clip.language || 'text'}
              style={isDark ? oneDark : oneLight}
              customStyle={{
                margin: 0,
                borderRadius: '0.5rem',
                maxHeight: '15rem',
                fontSize: '0.8125rem',
              }}
            >
              {formatContent(clip.content || '')}
            </SyntaxHighlighter>
            {clip.content && clip.content.length > 200 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleCollapse}
                className="text-xs text-muted-foreground"
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </Button>
            )}
          </div>
        )

      case 'image':
        return (
          <div className="space-y-2">
            {renderFileHeader()}
            {previewError ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-sm text-muted-foreground">
                Preview unavailable.
              </div>
            ) : previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={clip.file_name || 'image'}
                loading="lazy"
                className="max-h-80 w-auto rounded-md border object-contain"
              />
            ) : (
              <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                Loading preview…
              </div>
            )}
          </div>
        )

      case 'pdf':
        return (
          <div className="space-y-2">
            {renderFileHeader()}
            {previewError ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-sm text-muted-foreground">
                Preview unavailable.
              </div>
            ) : previewUrl ? (
              <iframe
                src={previewUrl}
                title={clip.file_name || 'pdf'}
                className="h-96 w-full rounded-md border"
              />
            ) : (
              <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
                Loading preview…
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center space-x-1">
              {getTypeIcon()}
              <span>{getTypeLabel()}</span>
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(clip.created_at), { addSuffix: true })}
            </span>
          </div>
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs">
              <Icons.copy className="mr-1 h-3 w-3" />
              Copy
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onSave(clip)} className="text-xs">
              <Icons.save className="mr-1 h-3 w-3" />
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(clip.id)}
              className="text-xs text-destructive hover:text-destructive/90"
            >
              <Icons.trash className="mr-1 h-3 w-3" />
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  )
}
