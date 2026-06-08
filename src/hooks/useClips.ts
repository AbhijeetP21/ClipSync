import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { subscribeToClips } from '@/lib/realtime'
import { Clip, ClipType } from '@/types'

export const useClips = () => {
  const { clips, setClips, addClip, removeClip, updateClip } = useStore()
  const { auth } = useStore()

  useEffect(() => {
    if (!auth.user) return

    const fetchClips = async () => {
      setClips({ isLoading: true })
      const { data, error } = await supabase
        .from('clips')
        .select('*')
        .eq('user_id', auth.user!.id)
        .order('created_at', { ascending: false })

      if (error) {
        setClips({ isLoading: false, error: error.message })
        return
      }

      setClips({ 
        clips: data as Clip[], 
        isLoading: false, 
        error: null 
      })
    }

    fetchClips()

    // Subscribe to realtime changes
    const channel = subscribeToClips(auth.user.id)

    return () => {
      channel.unsubscribe()
    }
  }, [auth.user, setClips])

  const createClip = async (clipData: Omit<Clip, 'id' | 'user_id' | 'created_at' | 'date_bucket'>) => {
    if (!auth.user) return null

    const { data, error } = await supabase
      .from('clips')
      .insert({
        ...clipData,
        user_id: auth.user.id,
        created_at: new Date().toISOString(),
        date_bucket: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating clip:', error)
      return null
    }

    addClip(data as Clip)
    return data
  }

  const deleteClip = async (id: string) => {
    const clip = clips.clips.find(c => c.id === id)
    if (!clip) return

    // Delete file from storage if it exists
    if (clip.file_path) {
      await supabase.storage
        .from('clips-files')
        .remove([clip.file_path])
    }

    const { error } = await supabase
      .from('clips')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting clip:', error)
      return false
    }

    removeClip(id)
    return true
  }

  const toggleClipCollapse = async (id: string) => {
    const clip = clips.clips.find(c => c.id === id)
    if (!clip) return

    const { error } = await supabase
      .from('clips')
      .update({ collapsed: !clip.collapsed })
      .eq('id', id)

    if (error) {
      console.error('Error updating clip:', error)
      return false
    }

    updateClip(id, { collapsed: !clip.collapsed })
    return true
  }

  const saveClipToPage = async (clipId: string, pageId: string) => {
    const clip = clips.clips.find(c => c.id === clipId)
    if (!clip) return null

    // The clip and the saved note must NOT share the same storage object, or
    // deleting the clip (which removes its file) would break the saved note.
    // Give the note an independent copy of the file.
    let notePath = clip.file_path
    if (clip.file_path && (clip.type === 'image' || clip.type === 'pdf')) {
      const safeName = (clip.file_name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
      const dest = `${clip.user_id}/notes/${Date.now()}-${safeName}`
      const { error: copyError } = await supabase.storage
        .from('clips-files')
        .copy(clip.file_path, dest)
      if (copyError) {
        console.error('Error copying file for saved note:', copyError)
      } else {
        notePath = dest
      }
    }

    const { data, error } = await supabase
      .from('saved_notes')
      .insert({
        user_id: clip.user_id,
        page_id: pageId,
        type: clip.type,
        content: clip.content,
        file_path: notePath,
        file_name: clip.file_name,
        language: clip.language,
        collapsed: clip.collapsed,
        position: 0, // Will be updated by reorder logic
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving clip to page:', error)
      return null
    }

    return data
  }

  const getClipsByDate = () => {
    const grouped = clips.clips.reduce((acc, clip) => {
      const date = clip.date_bucket
      if (!acc[date]) acc[date] = []
      acc[date].push(clip)
      return acc
    }, {} as Record<string, Clip[]>)

    return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a))
  }

  return {
    ...clips,
    createClip,
    deleteClip,
    toggleClipCollapse,
    saveClipToPage,
    getClipsByDate,
  }
}