import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { subscribeToSavedNotes } from '@/lib/realtime'
import { uploadClipFile } from '@/lib/storage'
import { SavedPage, SavedNote, ClipType } from '@/types'

export const useSavedPages = () => {
  const { savedPages, setSavedPages, addSavedPage, removeSavedPage, updateSavedPage, addSavedNote, removeSavedNote, updateSavedNote } = useStore()
  const { auth } = useStore()

  useEffect(() => {
    if (!auth.user) return

    const fetchSavedPages = async () => {
      setSavedPages({ isLoading: true })
      
      // Fetch pages
      const { data: pages, error: pagesError } = await supabase
        .from('saved_pages')
        .select('*')
        .eq('user_id', auth.user!.id)
        .order('position', { ascending: true })

      if (pagesError) {
        setSavedPages({ isLoading: false, error: pagesError.message })
        return
      }

      // Fetch notes
      const { data: notes, error: notesError } = await supabase
        .from('saved_notes')
        .select('*')
        .eq('user_id', auth.user!.id)
        .is('deleted_at', null)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true })

      if (notesError) {
        setSavedPages({ isLoading: false, error: notesError.message })
        return
      }

      setSavedPages({ 
        pages: pages as SavedPage[], 
        notes: notes as SavedNote[],
        isLoading: false, 
        error: null 
      })
    }

    fetchSavedPages()

    // Subscribe to realtime changes
    const channel = subscribeToSavedNotes(auth.user.id)

    return () => {
      channel.unsubscribe()
    }
  }, [auth.user, setSavedPages])

  const createPage = async (name: string, emoji: string = '📄') => {
    if (!auth.user) return null

    const { data, error } = await supabase
      .from('saved_pages')
      .insert({
        user_id: auth.user.id,
        name,
        emoji,
        position: savedPages.pages.length,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating page:', error)
      return null
    }

    addSavedPage(data as SavedPage)
    return data
  }

  const deletePage = async (id: string) => {
    const { error } = await supabase
      .from('saved_pages')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting page:', error)
      return false
    }

    removeSavedPage(id)
    return true
  }

  const updatePage = async (id: string, updates: Partial<SavedPage>) => {
    const { error } = await supabase
      .from('saved_pages')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Error updating page:', error)
      return false
    }

    updateSavedPage(id, updates)
    return true
  }

  const createNote = async (pageId: string, noteData: Omit<SavedNote, 'id' | 'user_id' | 'page_id' | 'position' | 'created_at'>) => {
    if (!auth.user) return null

    const { data, error } = await supabase
      .from('saved_notes')
      .insert({
        ...noteData,
        user_id: auth.user.id,
        page_id: pageId,
        position: savedPages.notes.filter(n => n.page_id === pageId).length,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating note:', error)
      return null
    }

    addSavedNote(data as SavedNote)
    return data
  }

  // Upload one or more files directly into a page as notes. Multiple files
  // uploaded together share a group_id so they render as a batch.
  const createFileNotes = async (
    pageId: string,
    files: File[],
    type: ClipType
  ): Promise<SavedNote[]> => {
    if (!auth.user || files.length === 0) return []
    const groupId = files.length > 1 ? crypto.randomUUID() : null
    const basePosition = savedPages.notes.filter((n) => n.page_id === pageId).length

    const rows: Array<Record<string, unknown>> = []
    let i = 0
    for (const file of files) {
      const uploaded = await uploadClipFile(file)
      if (!uploaded) continue
      rows.push({
        user_id: auth.user.id,
        page_id: pageId,
        type,
        file_path: uploaded.file_path,
        file_name: uploaded.file_name,
        collapsed: false,
        group_id: groupId,
        position: basePosition + i,
        created_at: new Date().toISOString(),
      })
      i++
    }

    if (rows.length === 0) return []

    const { data, error } = await supabase.from('saved_notes').insert(rows).select()
    if (error) {
      console.error('Error creating file notes:', error)
      return []
    }

    ;(data as SavedNote[]).forEach((n) => addSavedNote(n))
    return data as SavedNote[]
  }

  // Batch soft-delete: move several notes to the trash at once.
  const deleteNotes = async (ids: string[]) => {
    const { error } = await supabase
      .from('saved_notes')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', ids)
    if (error) {
      console.error('Error trashing notes:', error)
      return false
    }
    ids.forEach((id) => removeSavedNote(id))
    return true
  }

  // Soft-delete: move the note to the trash (kept for 7 days). The storage file
  // is intentionally preserved so the note can be restored intact.
  const deleteNote = async (id: string) => {
    const { error } = await supabase
      .from('saved_notes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error trashing note:', error)
      return false
    }

    removeSavedNote(id)
    return true
  }

  const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

  // Restore a trashed note back into its page.
  const restoreNote = async (id: string) => {
    const { data, error } = await supabase
      .from('saved_notes')
      .update({ deleted_at: null })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error restoring note:', error)
      return false
    }

    addSavedNote(data as SavedNote)
    return true
  }

  // Permanently remove a trashed note and its file.
  const permanentlyDeleteNote = async (id: string, filePath?: string | null) => {
    if (filePath) {
      await supabase.storage.from('clips-files').remove([filePath])
    }
    const { error } = await supabase.from('saved_notes').delete().eq('id', id)
    if (error) {
      console.error('Error deleting note permanently:', error)
      return false
    }
    return true
  }

  // Delete any trashed notes (and their files) older than the retention window.
  const purgeExpiredTrash = async (pageId: string) => {
    const cutoff = new Date(Date.now() - TRASH_RETENTION_MS).toISOString()
    const { data: expired } = await supabase
      .from('saved_notes')
      .select('id, file_path')
      .eq('page_id', pageId)
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoff)

    if (expired && expired.length > 0) {
      const paths = expired
        .map((e) => e.file_path)
        .filter((p): p is string => !!p)
      if (paths.length > 0) {
        await supabase.storage.from('clips-files').remove(paths)
      }
      await supabase.from('saved_notes').delete().in(
        'id',
        expired.map((e) => e.id)
      )
    }
  }

  // Fetch the (non-expired) trashed notes for a page.
  const getTrashedNotes = async (pageId: string): Promise<SavedNote[]> => {
    const cutoff = new Date(Date.now() - TRASH_RETENTION_MS).toISOString()
    const { data, error } = await supabase
      .from('saved_notes')
      .select('*')
      .eq('page_id', pageId)
      .not('deleted_at', 'is', null)
      .gte('deleted_at', cutoff)
      .order('deleted_at', { ascending: false })

    if (error) {
      console.error('Error loading trash:', error)
      return []
    }
    return (data ?? []) as SavedNote[]
  }

  const updateNote = async (id: string, updates: Partial<SavedNote>) => {
    const { error } = await supabase
      .from('saved_notes')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Error updating note:', error)
      return false
    }

    updateSavedNote(id, updates)
    return true
  }

  const reorderNotes = async (pageId: string, noteId: string, newPosition: number) => {
    // Sort to match the order shown in the UI (getNotesByPage sorts by position).
    const notes = savedPages.notes
      .filter(n => n.page_id === pageId)
      .sort((a, b) => a.position - b.position)
    const noteIndex = notes.findIndex(n => n.id === noteId)
    
    if (noteIndex === -1) return false

    const updatedNotes = [...notes]
    const [movedNote] = updatedNotes.splice(noteIndex, 1)
    updatedNotes.splice(newPosition, 0, movedNote)

    // Update positions in the database. Use individual UPDATEs (not upsert):
    // upsert would attempt an INSERT of rows missing NOT-NULL columns
    // (user_id, type) before resolving the conflict, which fails.
    const updates = updatedNotes.map((note, index) => ({
      id: note.id,
      position: index,
    }))

    const results = await Promise.all(
      updates.map((u) =>
        supabase.from('saved_notes').update({ position: u.position }).eq('id', u.id)
      )
    )

    const failed = results.find((r) => r.error)
    if (failed?.error) {
      console.error('Error reordering notes:', failed.error)
      return false
    }

    // Update local state
    updates.forEach((u) => updateSavedNote(u.id, { position: u.position }))

    return true
  }

  // Persist an absolute new ordering of notes (used by drag-and-drop reorder of
  // both single notes and whole batches).
  const setNotePositions = async (orderedIds: string[]) => {
    const results = await Promise.all(
      orderedIds.map((id, index) =>
        supabase.from('saved_notes').update({ position: index }).eq('id', id)
      )
    )
    const failed = results.find((r) => r.error)
    if (failed?.error) {
      console.error('Error reordering notes:', failed.error)
      return false
    }
    orderedIds.forEach((id, index) => updateSavedNote(id, { position: index }))
    return true
  }

  const getNotesByPage = (pageId: string) => {
    // Sort by position, then created_at as a stable tiebreaker, so the in-memory
    // order always matches the order returned by the database fetch (prevents
    // items jumping around after a delete until the page is refreshed).
    return savedPages.notes
      .filter(note => note.page_id === pageId)
      .sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
  }

  const getPagesWithCounts = () => {
    return savedPages.pages.map(page => ({
      ...page,
      notes_count: savedPages.notes.filter(note => note.page_id === page.id).length,
    }))
  }

  return {
    ...savedPages,
    pages: getPagesWithCounts(),
    createPage,
    deletePage,
    updatePage,
    createNote,
    createFileNotes,
    deleteNote,
    deleteNotes,
    restoreNote,
    permanentlyDeleteNote,
    purgeExpiredTrash,
    getTrashedNotes,
    updateNote,
    reorderNotes,
    setNotePositions,
    getNotesByPage,
  }
}