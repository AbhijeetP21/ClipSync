import { supabase } from './supabase'
import { useStore } from './store'
import { Clip, SavedNote } from '@/types'

// Subscribe to clips changes for the current user
export const subscribeToClips = (userId: string) => {
  const channel = supabase
    .channel(`clips:user_id=eq.${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'clips',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const clip = payload.new as Clip
        
        switch (payload.eventType) {
          case 'INSERT':
            useStore.getState().addClip(clip)
            break
          case 'UPDATE':
            useStore.getState().updateClip(clip.id, clip)
            break
          case 'DELETE':
            useStore.getState().removeClip(payload.old.id)
            break
        }
      }
    )
    .subscribe()

  return channel
}

// Subscribe to saved notes changes for the current user
export const subscribeToSavedNotes = (userId: string) => {
  const channel = supabase
    .channel(`saved_notes:user_id=eq.${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'saved_notes',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const note = payload.new as SavedNote
        
        switch (payload.eventType) {
          case 'INSERT':
            useStore.getState().addSavedNote(note)
            break
          case 'UPDATE':
            useStore.getState().updateSavedNote(note.id, note)
            break
          case 'DELETE':
            useStore.getState().removeSavedNote(payload.old.id)
            break
        }
      }
    )
    .subscribe()

  return channel
}

// Unsubscribe from all channels
export const unsubscribeFromAll = () => {
  supabase.removeAllChannels()
}