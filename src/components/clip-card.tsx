'use client'

import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Icons } from '@/components/icons'
import { ClipCardProps } from '@/types'
import { formatDistanceToNow } from 'date-fns'

export function ClipCard({ clip, onDelete, onSave, onToggleCollapse }: ClipCardProps) {
  const [isExpanded, setIsExpanded] = useState(!clip.collapsed)
  const { toast } = useToast()

  const handleCopy = async () => {
    try {
      if (clip.type === 'text' || clip.type === 'code') {
        await navigator.clipboard.writeText(clip.content || '')
        toast({
          title: 'Copied!',
          description: 'Content copied to clipboard.',
        })
      } else if (clip.type === 'image' || clip.type === 'pdf') {
        // For files, we would copy the URL or download the file
        toast({
          title: 'Copy Image',
          description: 'This would copy the image URL or download the file.',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard.',
        variant: 'destructive',
      })
    }
  }

  const handleDownload = () => {
    if (clip.type === 'image' || clip.type === 'pdf') {
      // In a real implementation, this would download the file from Supabase Storage
      toast({
        title: 'Download',
        description: 'This would download the file from storage.',
      })
    }
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
    
    // Limit text length for display
    if (content.length > 200) {
      return isExpanded ? content : content.substring(0, 200) + '...'
    }
    
    return content
  }

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
            <pre className="text-sm bg-muted p-3 rounded-md overflow-auto max-h-60">
              <code>{formatContent(clip.content || '')}</code>
            </pre>
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
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{clip.file_name}</span>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Icons.download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
            {/* In a real implementation, this would show a thumbnail of the image */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Icons.image className="mx-auto h-12 w-12 text-gray-400" />
              <p className="text-sm text-muted-foreground mt-2">
                Image preview would appear here
              </p>
            </div>
          </div>
        )
      
      case 'pdf':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{clip.file_name}</span>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Icons.download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Icons.file className="mx-auto h-12 w-12 text-gray-400" />
              <p className="text-sm text-muted-foreground mt-2">
                PDF preview would appear here
              </p>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-xs"
            >
              <Icons.copy className="mr-1 h-3 w-3" />
              Copy
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              className="text-xs"
            >
              <Icons.save className="mr-1 h-3 w-3" />
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-xs text-destructive hover:text-destructive/90"
            >
              <Icons.trash className="mr-1 h-3 w-3" />
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  )
}