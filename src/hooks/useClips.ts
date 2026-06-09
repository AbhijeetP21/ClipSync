import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { subscribeToClips } from '@/lib/realtime'
import { uploadClipFile } from '@/lib/storage'
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

  // Upload one or more files and create a clip per file. Files uploaded together
  // (more than one) share a group_id so the UI can render them as a batch.
  const createFileClips = async (files: File[], type: ClipType): Promise<Clip[]> => {
    if (!auth.user || files.length === 0) return []
    const groupId = files.length > 1 ? crypto.randomUUID() : null

    const rows: Array<Record<string, unknown>> = []
    for (const file of files) {
      const uploaded = await uploadClipFile(file)
      if (!uploaded) continue
      rows.push({
        user_id: auth.user.id,
        type,
        file_path: uploaded.file_path,
        file_name: uploaded.file_name,
        collapsed: false,
        group_id: groupId,
        created_at: new Date().toISOString(),
        date_bucket: new Date().toISOString().split('T')[0],
      })
    }

    if (rows.length === 0) return []

    const { data, error } = await supabase.from('clips').insert(rows).select()
    if (error) {
      console.error('Error creating file clips:', error)
      return []
    }

    ;(data as Clip[]).forEach((c) => addClip(c))
    return data as Clip[]
  }

  const deleteClips = async (ids: string[]) => {
    const targets = clips.clips.filter((c) => ids.includes(c.id))
    const paths = targets.map((c) => c.file_path).filter((p): p is string => !!p)
    if (paths.length > 0) {
      await supabase.storage.from('clips-files').remove(paths)
    }

    const { error } = await supabase.from('clips').delete().in('id', ids)
    if (error) {
      console.error('Error deleting clips:', error)
      return false
    }

    ids.forEach((id) => removeClip(id))
    return true
  }

  // Save one or more clips into a page. Each note gets an independent copy of its
  // file so deleting the original clip can't break it. Multiple notes saved
  // together share a group_id, keeping them batched on the page too.
  const saveClipsToPage = async (clipIds: string[], pageId: string) => {
    const targets = clips.clips.filter((c) => clipIds.includes(c.id))
    if (targets.length === 0) return null
    const groupId = targets.length > 1 ? crypto.randomUUID() : null

    // Append the saved notes at the end of the page.
    const { data: last } = await supabase
      .from('saved_notes')
      .select('position')
      .eq('page_id', pageId)
      .is('deleted_at', null)
      .order('position', { ascending: false })
      .limit(1)
    const basePosition = last && last.length > 0 ? (last[0].position ?? 0) + 1 : 0

    const rows: Array<Record<string, unknown>> = []
    let index = 0
    for (const clip of targets) {
      let notePath = clip.file_path
      if (clip.file_path && (clip.type === 'image' || clip.type === 'pdf')) {
        const safeName = (clip.file_name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_')
        const dest = `${clip.user_id}/notes/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}-${safeName}`
        const { error: copyError } = await supabase.storage
          .from('clips-files')
          .copy(clip.file_path, dest)
        if (!copyError) notePath = dest
      }
      rows.push({
        user_id: clip.user_id,
        page_id: pageId,
        type: clip.type,
        content: clip.content,
        file_path: notePath,
        file_name: clip.file_name,
        language: clip.language,
        collapsed: clip.collapsed,
        group_id: groupId,
        position: basePosition + index++,
        created_at: new Date().toISOString(),
      })
    }

    const { data, error } = await supabase.from('saved_notes').insert(rows).select()
    if (error) {
      console.error('Error saving clips to page:', error)
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
    createFileClips,
    deleteClip,
    deleteClips,
    toggleClipCollapse,
    saveClipsToPage,
    getClipsByDate,
  }
}