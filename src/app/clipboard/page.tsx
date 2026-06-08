'use client'

import { useState } from 'react'
import { useClips } from '@/hooks/useClips'
import { useSavedPages } from '@/hooks/useSavedPages'
import { ClipInput } from '@/components/clip-input'
import { ClipCard } from '@/components/clip-card'
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

export default function ClipboardPage() {
  const { getClipsByDate, createClip, deleteClip, toggleClipCollapse, saveClipToPage } = useClips()
  const { pages } = useSavedPages()
  const { toast } = useToast()
  const [isInputExpanded, setIsInputExpanded] = useState(false)
  const [saveClipId, setSaveClipId] = useState<string | null>(null)

  const handleAddClip = async (clipData: any) => {
    const result = await createClip(clipData)
    if (result) {
      toast({
        title: 'Clip Added',
        description: 'Your clip has been added to the clipboard.',
      })
      setIsInputExpanded(false)
    } else {
      toast({
        title: 'Error',
        description: 'Failed to add clip. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteClip = async (id: string) => {
    const success = await deleteClip(id)
    if (success) {
      toast({
        title: 'Clip Deleted',
        description: 'Your clip has been deleted.',
      })
    } else {
      toast({
        title: 'Error',
        description: 'Failed to delete clip. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleToggleCollapse = async (id: string) => {
    await toggleClipCollapse(id)
  }

  const handleSaveClip = (clipId: string) => {
    setSaveClipId(clipId)
  }

  const handleConfirmSave = async (pageId: string) => {
    if (!saveClipId) return
    const result = await saveClipToPage(saveClipId, pageId)
    if (result) {
      toast({
        title: 'Saved',
        description: 'Clip saved to your page.',
      })
    } else {
      toast({
        title: 'Error',
        description: 'Failed to save clip. Please try again.',
        variant: 'destructive',
      })
    }
    setSaveClipId(null)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }
  }

  const groupedClips = getClipsByDate()

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
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
            <ClipInput onAddClip={handleAddClip} />
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
                <h2 className="text-lg font-semibold text-muted-foreground">
                  {formatDate(date)}
                </h2>
                <div className="grid gap-4">
                  {dateClips.map((clip) => (
                    <ClipCard
                      key={clip.id}
                      clip={clip}
                      onDelete={() => handleDeleteClip(clip.id)}
                      onSave={() => handleSaveClip(clip.id)}
                      onToggleCollapse={() => handleToggleCollapse(clip.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Save-to-page picker */}
      <Dialog open={saveClipId !== null} onOpenChange={(open) => !open && setSaveClipId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save to page</DialogTitle>
            <DialogDescription>Choose a saved page for this clip.</DialogDescription>
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
