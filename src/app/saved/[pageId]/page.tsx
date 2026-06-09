'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSavedPages } from '@/hooks/useSavedPages'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ClipInput } from '@/components/clip-input'
import { ClipCard } from '@/components/clip-card'
import { ClipBatchCard } from '@/components/clip-batch-card'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icons } from '@/components/icons'
import { groupItems } from '@/lib/group-clips'
import { SavedNote, ClipType } from '@/types'

// Sortable wrapper with a dedicated drag handle. Wraps a single note card or a
// whole batch card so either can be reordered as one unit, while keeping the
// card's own buttons clickable.
function SortableShell({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2">
      <button
        type="button"
        className="mt-4 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <Icons.grip className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

function daysLeft(deletedAt?: string | null) {
  if (!deletedAt) return 0
  const expiry = new Date(deletedAt).getTime() + TRASH_RETENTION_MS
  return Math.max(0, Math.ceil((expiry - Date.now()) / (24 * 60 * 60 * 1000)))
}

export default function SavedPage() {
  const params = useParams()
  const router = useRouter()
  const pageId = params.pageId as string
  const {
    pages,
    notes,
    createNote,
    createFileNotes,
    deleteNote,
    deleteNotes,
    restoreNote,
    permanentlyDeleteNote,
    purgeExpiredTrash,
    getTrashedNotes,
    updateNote,
    updatePage,
    setNotePositions,
    getNotesByPage,
  } = useSavedPages()
  const { toast } = useToast()
  const [isInputExpanded, setIsInputExpanded] = useState(false)
  const [isTrashOpen, setIsTrashOpen] = useState(false)
  const [trashedNotes, setTrashedNotes] = useState<SavedNote[]>([])
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  // Require an 8px drag before activating, so plain clicks reach the buttons.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const currentPage = pages.find((p) => p.id === pageId)
  const pageNotes = getNotesByPage(pageId)
  const noteGroups = groupItems(pageNotes)
  const sortableUnitIds = noteGroups.map((g) => g.key)

  const loadTrash = useCallback(async () => {
    await purgeExpiredTrash(pageId)
    setTrashedNotes(await getTrashedNotes(pageId))
  }, [pageId, purgeExpiredTrash, getTrashedNotes])

  // Purge expired trash whenever the page opens.
  useEffect(() => {
    purgeExpiredTrash(pageId)
  }, [pageId, purgeExpiredTrash])

  const handleAddNote = async (noteData: any) => {
    const result = await createNote(pageId, noteData)
    if (result) {
      toast({ title: 'Note Added', description: 'Your note has been added to this page.' })
      setIsInputExpanded(false)
    } else {
      toast({
        title: 'Error',
        description: 'Failed to add note. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleAddNoteFiles = async (files: File[], type: ClipType) => {
    const created = await createFileNotes(pageId, files, type)
    if (created.length > 0) {
      toast({
        title: created.length > 1 ? `Added ${created.length} files` : 'File added',
        description: 'Added to this page.',
      })
      setIsInputExpanded(false)
    } else {
      toast({ title: 'Upload failed', description: 'Please try again.', variant: 'destructive' })
    }
  }

  const handleDeleteMany = async (ids: string[]) => {
    const success = await deleteNotes(ids)
    if (success) {
      toast({
        title: 'Moved to Trash',
        description: `${ids.length} note${ids.length > 1 ? 's' : ''} moved to trash.`,
      })
    } else {
      toast({ title: 'Error', description: 'Failed to delete.', variant: 'destructive' })
    }
  }

  const handleDeleteNote = async (id: string) => {
    const success = await deleteNote(id)
    if (success) {
      toast({ title: 'Moved to Trash', description: 'The note will be kept for 7 days.' })
    } else {
      toast({
        title: 'Error',
        description: 'Failed to delete note. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleToggleCollapse = async (id: string) => {
    const note = notes.find((n) => n.id === id)
    if (note) {
      await updateNote(id, { collapsed: !note.collapsed })
    }
  }

  const handleRestore = async (id: string) => {
    const success = await restoreNote(id)
    if (success) {
      setTrashedNotes((prev) => prev.filter((n) => n.id !== id))
      toast({ title: 'Restored', description: 'The note is back in your page.' })
    } else {
      toast({ title: 'Error', description: 'Failed to restore note.', variant: 'destructive' })
    }
  }

  const handleDeleteForever = async (note: SavedNote) => {
    const confirmed = confirm('Permanently delete this note? This cannot be undone.')
    if (!confirmed) return
    const success = await permanentlyDeleteNote(note.id, note.file_path)
    if (success) {
      setTrashedNotes((prev) => prev.filter((n) => n.id !== note.id))
      toast({ title: 'Deleted', description: 'The note was permanently removed.' })
    } else {
      toast({ title: 'Error', description: 'Failed to delete note.', variant: 'destructive' })
    }
  }

  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = noteGroups.findIndex((g) => g.key === active.id)
    const newIndex = noteGroups.findIndex((g) => g.key === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    // Reorder whole units (a single note, or a batch as one block), then flatten
    // to an absolute list of note ids and persist their new positions.
    const reordered = arrayMove(noteGroups, oldIndex, newIndex)
    const orderedIds = reordered.flatMap((g) =>
      g.kind === 'batch' ? g.items.map((i) => i.id) : [g.item.id]
    )
    await setNotePositions(orderedIds)
  }

  const openTrash = async () => {
    setIsTrashOpen(true)
    await loadTrash()
  }

  const openRename = () => {
    setRenameValue(currentPage?.name ?? '')
    setIsRenameOpen(true)
  }

  const handleRename = async () => {
    const name = renameValue.trim()
    if (!name) {
      toast({ title: 'Error', description: 'Page name cannot be empty.', variant: 'destructive' })
      return
    }
    const success = await updatePage(pageId, { name })
    if (success) {
      toast({ title: 'Renamed', description: 'Your page has been renamed.' })
      setIsRenameOpen(false)
    } else {
      toast({ title: 'Error', description: 'Failed to rename. Please try again.', variant: 'destructive' })
    }
  }

  const trashLabel = (note: SavedNote) => {
    if (note.type === 'image' || note.type === 'pdf') return note.file_name || 'File'
    const text = (note.content || '').trim()
    return text.length > 60 ? text.slice(0, 60) + '…' : text || '(empty)'
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
      <div className="flex flex-col gap-3 p-4 pl-16 border-b sm:flex-row sm:items-center sm:justify-between md:pl-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">
            {currentPage.emoji} {currentPage.name}
          </h1>
          <span className="text-sm text-muted-foreground">{pageNotes.length} notes</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openRename}>
            <Icons.edit className="mr-2 h-4 w-4" />
            Rename
          </Button>
          <Button variant="outline" onClick={openTrash}>
            <Icons.trash className="mr-2 h-4 w-4" />
            Trash
          </Button>
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
            <ClipInput onAddClip={handleAddNote} onAddFiles={handleAddNoteFiles} />
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
                  Drag the handle to reorder notes
                </span>
              </div>
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext items={sortableUnitIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {noteGroups.map((group) => (
                      <SortableShell key={group.key} id={group.key}>
                        {group.kind === 'batch' ? (
                          <ClipBatchCard items={group.items} onDelete={handleDeleteMany} />
                        ) : (
                          <ClipCard
                            clip={group.item}
                            onDelete={() => handleDeleteNote(group.item.id)}
                            onSave={() => {}}
                            onToggleCollapse={() => handleToggleCollapse(group.item.id)}
                          />
                        )}
                      </SortableShell>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Rename dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename page</DialogTitle>
            <DialogDescription>Give this page a new name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="rename">Page name</Label>
            <Input
              id="rename"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleRename()
                }
              }}
              placeholder="Enter page name..."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button onClick={handleRename}>
              <Icons.save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trash dialog */}
      <Dialog open={isTrashOpen} onOpenChange={setIsTrashOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trash</DialogTitle>
            <DialogDescription>
              Deleted notes are kept for 7 days, then removed automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-auto py-2">
            {trashedNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Trash is empty.</p>
            ) : (
              trashedNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center justify-between gap-2 rounded-md border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{trashLabel(note)}</p>
                    <p className="text-xs text-muted-foreground">
                      {note.type} · deletes in {daysLeft(note.deleted_at)} day
                      {daysLeft(note.deleted_at) === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleRestore(note.id)}>
                      <Icons.restore className="mr-1 h-4 w-4" />
                      Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive/90"
                      onClick={() => handleDeleteForever(note)}
                    >
                      <Icons.trash className="mr-1 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
