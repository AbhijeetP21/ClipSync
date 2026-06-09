'use client'

import { useState, useEffect } from 'react'
import { useClips } from '@/hooks/useClips'
import { useSavedPages } from '@/hooks/useSavedPages'
import { ClipInput } from '@/components/clip-input'
import { ClipCard } from '@/components/clip-card'
import { ClipBatchCard } from '@/components/clip-batch-card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Icons } from '@/components/icons'
import { groupItems } from '@/lib/group-clips'
import { Clip, ClipType, SavedNote } from '@/types'

export default function ClipboardPage() {
  const {
    getClipsByDate,
    createClip,
    createFileClips,
    deleteClip,
    deleteClips,
    toggleClipCollapse,
    saveClipsToPage,
  } = useClips()
  const { pages } = useSavedPages()
  const { toast } = useToast()
  const [isInputExpanded, setIsInputExpanded] = useState(false)
  const [saveClipIds, setSaveClipIds] = useState<string[] | null>(null)

  const handleAddClip = async (clipData: any) => {
    const result = await createClip(clipData)
    if (result) {
      toast({ title: 'Clip Added', description: 'Your clip has been added to the clipboard.' })
      setIsInputExpanded(false)
    } else {
      toast({
        title: 'Error',
        description: 'Failed to add clip. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleAddFiles = async (files: File[], type: ClipType) => {
    const created = await createFileClips(files, type)
    if (created.length > 0) {
      toast({
        title: created.length > 1 ? `Added ${created.length} files` : 'File added',
        description: `Your ${type}${created.length > 1 ? 's' : ''} ${
          created.length > 1 ? 'have' : 'has'
        } been added.`,
      })
      setIsInputExpanded(false)
    } else {
      toast({ title: 'Upload failed', description: 'Please try again.', variant: 'destructive' })
    }
  }

  const handleDeleteClip = async (id: string) => {
    const success = await deleteClip(id)
    if (success) {
      toast({ title: 'Clip Deleted', description: 'Your clip has been deleted.' })
    } else {
      toast({ title: 'Error', description: 'Failed to delete clip.', variant: 'destructive' })
    }
  }

  const handleDeleteMany = async (ids: string[]) => {
    const success = await deleteClips(ids)
    if (success) {
      toast({ title: 'Deleted', description: `Removed ${ids.length} item${ids.length > 1 ? 's' : ''}.` })
    } else {
      toast({ title: 'Error', description: 'Failed to delete.', variant: 'destructive' })
    }
  }

  const handleToggleCollapse = async (id: string) => {
    await toggleClipCollapse(id)
  }

  const handleSaveClip = (clip: Clip | SavedNote) => setSaveClipIds([clip.id])
  const handleSaveMany = (items: (Clip | SavedNote)[]) => setSaveClipIds(items.map((i) => i.id))

  const handleConfirmSave = async (pageId: string) => {
    if (!saveClipIds) return
    const result = await saveClipsToPage(saveClipIds, pageId)
    if (result) {
      toast({
        title: 'Saved',
        description: `Saved ${saveClipIds.length} item${saveClipIds.length > 1 ? 's' : ''} to your page.`,
      })
    } else {
      toast({ title: 'Error', description: 'Failed to save.', variant: 'destructive' })
    }
    setSaveClipIds(null)
  }

  // Paste-to-add: paste image(s) from your device clipboard to create image
  // clips; paste text to create a text clip (unless you are typing in a field).
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const images: File[] = []
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            const named =
              file.name && file.name !== 'image.png'
                ? file
                : new File([file], `pasted-${Date.now()}-${images.length}.png`, {
                    type: file.type || 'image/png',
                  })
            images.push(named)
          }
        }
      }

      if (images.length > 0) {
        e.preventDefault()
        const created = await createFileClips(images.slice(0, 10), 'image')
        if (created.length > 0) {
          toast({
            title: created.length > 1 ? `Pasted ${created.length} images` : 'Image pasted',
            description: 'Added to your clipboard.',
          })
        }
        return
      }

      // Text paste only when not typing in an editable element.
      const target = e.target as HTMLElement | null
      const editing =
        !!target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (editing) return

      const text = e.clipboardData?.getData('text/plain')?.trim()
      if (text) {
        e.preventDefault()
        const created = await createClip({ type: 'text', content: text, collapsed: false })
        if (created) {
          toast({ title: 'Text pasted', description: 'Added as a clip.' })
        }
      }
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [createFileClips, createClip, toast])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const groupedClips = getClipsByDate()

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-4 pl-16 border-b md:pl-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">Clipboard</h1>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>Live sync enabled</span>
          </div>
        </div>
        <Button variant="ghost" onClick={() => setIsInputExpanded(!isInputExpanded)}>
          <Icons.plus className="mr-2 h-4 w-4" />
          Add Clip
        </Button>
      </div>

      {/* Clip Input */}
      {isInputExpanded && (
        <>
          <Separator />
          <div className="p-4">
            <ClipInput onAddClip={handleAddClip} onAddFiles={handleAddFiles} />
          </div>
          <Separator />
        </>
      )}

      {/* Clips List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {groupedClips.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icons.clipboard className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg">Nothing copied yet today 📋</p>
              <p className="text-sm">Start adding clips to see them appear here.</p>
            </div>
          ) : (
            groupedClips.map(([date, dateClips]) => (
              <div key={date} className="space-y-4">
                <h2 className="text-lg font-semibold text-muted-foreground">{formatDate(date)}</h2>
                <div className="grid gap-4">
                  {groupItems(dateClips as Clip[]).map((group) =>
                    group.kind === 'batch' ? (
                      <ClipBatchCard
                        key={group.key}
                        items={group.items}
                        onDelete={handleDeleteMany}
                        onSave={handleSaveMany}
                      />
                    ) : (
                      <ClipCard
                        key={group.key}
                        clip={group.item}
                        onDelete={() => handleDeleteClip(group.item.id)}
                        onSave={() => handleSaveClip(group.item)}
                        onToggleCollapse={() => handleToggleCollapse(group.item.id)}
                      />
                    )
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Save-to-page picker */}
      <Dialog open={saveClipIds !== null} onOpenChange={(open) => !open && setSaveClipIds(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save to page</DialogTitle>
            <DialogDescription>
              Choose a saved page for{' '}
              {saveClipIds && saveClipIds.length > 1 ? `these ${saveClipIds.length} items` : 'this clip'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {pages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You have no saved pages yet. Create one on the Saved tab first.
              </p>
            ) : (
              pages.map((page) => (
                <Button
                  key={page.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleConfirmSave(page.id)}
                >
                  <span className="mr-2 text-lg">{page.emoji}</span>
                  {page.name}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
