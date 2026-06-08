import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { subscribeToSavedNotes } from '@/lib/realtime'
import { SavedPage, SavedNote } from '@/types'

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
        .order('position', { ascending: true })

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

  const deleteNote = async (id: string) => {
    const note = savedPages.notes.find(n => n.id === id)
    if (!note) return false

    // Delete file from storage if it exists
    if (note.file_path) {
      await supabase.storage
        .from('clips-files')
        .remove([note.file_path])
    }

    const { error } = await supabase
      .from('saved_notes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting note:', error)
      return false
    }

    removeSavedNote(id)
    return true
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
    const notes = savedPages.notes.filter(n => n.page_id === pageId)
    const noteIndex = notes.findIndex(n => n.id === noteId)
    
    if (noteIndex === -1) return false

    const updatedNotes = [...notes]
    const [movedNote] = updatedNotes.splice(noteIndex, 1)
    updatedNotes.splice(newPosition, 0, movedNote)

    // Update positions in database
    const updates = updatedNotes.map((note, index) => ({
      id: note.id,
      position: index,
    }))

    const { error } = await supabase
      .from('saved_notes')
      .upsert(updates, { onConflict: 'id' })

    if (error) {
      console.error('Error reordering notes:', error)
      return false
    }

    // Update local state
    updatedNotes.forEach((note, index) => {
      updateSavedNote(note.id, { position: index })
    })

    return true
  }

  const getNotesByPage = (pageId: string) => {
    return savedPages.notes
      .filter(note => note.page_id === pageId)
      .sort((a, b) => a.position - b.position)
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
    deleteNote,
    updateNote,
    reorderNotes,
    getNotesByPage,
  }
}