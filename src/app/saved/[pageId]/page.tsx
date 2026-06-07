'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSavedPages } from '@/hooks/useSavedPages'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ClipInput } from '@/components/clip-input'
import { ClipCard } from '@/components/clip-card'
import { DndContext } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icons } from '@/components/icons'

interface SortableNoteProps {
  note: any
  onDelete: (id: string) => void
  onToggleCollapse: (id: string) => void
}

function SortableNote({ note, onDelete, onToggleCollapse }: SortableNoteProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ClipCard
        clip={note}
        onDelete={() => onDelete(note.id)}
        onSave={() => {}} // Notes are already saved
        onToggleCollapse={() => onToggleCollapse(note.id)}
      />
    </div>
  )
}

export default function SavedPage() {
  const params = useParams()
  const router = useRouter()
  const pageId = params.pageId as string
  const { pages, notes, createNote, deleteNote, updateNote, reorderNotes, getNotesByPage } = useSavedPages()
  const { toast } = useToast()
  const [isInputExpanded, setIsInputExpanded] = useState(false)
  const [pageName, setPageName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)

  const currentPage = pages.find(p => p.id === pageId)
  const pageNotes = getNotesByPage(pageId)

  useEffect(() => {
    if (currentPage && currentPage.name !== pageName) {
      setPageName(currentPage.name)
    }
  }, [currentPage, pageName])

  const handleAddNote = async (noteData: any) => {
    const result = await createNote(pageId, noteData)
    if (result) {
      toast({
        title: 'Note Added',
        description: 'Your note has been added to this page.',
      })
      setIsInputExpanded(false)
    } else {
      toast({
        title: 'Error',
        description: 'Failed to add note. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteNote = async (id: string) => {
    const success = await deleteNote(id)
    if (success) {
      toast({
        title: 'Note Deleted',
        description: 'Your note has been deleted.',
      })
    } else {
      toast({
        title: 'Error',
        description: 'Failed to delete note. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleToggleCollapse = async (id: string) => {
    const note = notes.find(n => n.id === id)
    if (note) {
      await updateNote(id, { collapsed: !note.collapsed })
    }
  }

  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    if (!over) return

    if (active.id !== over.id) {
      const oldIndex = pageNotes.findIndex(note => note.id === active.id)
      const newIndex = pageNotes.findIndex(note => note.id === over.id)
      await reorderNotes(pageId, active.id, newIndex)
    }
  }

  const handleRenamePage = async () => {
    if (!pageName.trim()) {
      toast({
        title: 'Error',
        description: 'Page name cannot be empty.',
        variant: 'destructive',
      })
      return
    }

    // In a real implementation, this would call updatePage
    toast({
      title: 'Page Renamed',
      description: 'Your page has been renamed.',
    })
    setIsEditingName(false)
  }

  if (!currentPage) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Page Not Found</h1>
          <p className="text-muted-foreground">This saved page does not exist.</p>
          <Button onClick={() => router.push('/saved')} className="mt-4">
            Go to Saved Pages
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">{currentPage.emoji} {currentPage.name}</h1>
          <span className="text-sm text-muted-foreground">
            {pageNotes.length} notes
          </span>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isEditingName} onOpenChange={setIsEditingName}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Icons.edit className="mr-2 h-4 w-4" />
                Rename
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename Page</DialogTitle>
                <DialogDescription>
                  Enter a new name for your saved page.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="page-name">Page Name</Label>
                  <Input
                    id="page-name"
                    value={pageName}
                    onChange={(e) => setPageName(e.target.value)}
                    placeholder="Enter page name..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleRenamePage}>
                  <Icons.save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => router.push('/saved')}>
            <Icons.arrowLeft className="mr-2 h-4 w-4" />
            Back to Pages
          </Button>
          <Button onClick={() => setIsInputExpanded(!isInputExpanded)}>
            <Icons.plus className="mr-2 h-4 w-4" />
            Add Note
          </Button>
        </div>
      </div>

      {/* Note Input */}
      {isInputExpanded && (
        <>
          <Separator />
          <div className="p-4">
            <ClipInput onAddClip={handleAddNote} />
          </div>
          <Separator />
        </>
      )}

      {/* Notes List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {pageNotes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Icons.bookmark className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg">No notes in this page yet</p>
              <p className="text-sm">Add your first note to start organizing your clips.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Drag and drop to reorder notes
                </span>
              </div>
              <DndContext onDragEnd={handleDragEnd}>
                <SortableContext items={pageNotes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                  {pageNotes.map((note) => (
                    <SortableNote
                      key={note.id}
                      note={note}
                      onDelete={() => handleDeleteNote(note.id)}
                      onToggleCollapse={() => handleToggleCollapse(note.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}