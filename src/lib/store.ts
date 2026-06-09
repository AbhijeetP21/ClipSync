import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { Clip, SavedPage, SavedNote, ClipType, AuthState, ClipsState, SavedPagesState } from '@/types'

interface AppState {
  // Authentication state
  auth: AuthState
  setAuth: (auth: Partial<AuthState>) => void
  
  // Clips state
  clips: ClipsState
  setClips: (clips: Partial<ClipsState>) => void
  addClip: (clip: Clip) => void
  removeClip: (id: string) => void
  updateClip: (id: string, updates: Partial<Clip>) => void
  
  // Saved pages state
  savedPages: SavedPagesState
  setSavedPages: (pages: Partial<SavedPagesState>) => void
  addSavedPage: (page: SavedPage) => void
  removeSavedPage: (id: string) => void
  updateSavedPage: (id: string, updates: Partial<SavedPage>) => void
  
  // Saved notes state
  addSavedNote: (note: SavedNote) => void
  removeSavedNote: (id: string) => void
  updateSavedNote: (id: string, updates: Partial<SavedNote>) => void
  
  // Theme state
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

export const useStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Authentication state
    auth: {
      user: null,
      isAuthenticated: false,
      isLoading: true,
    },
    setAuth: (auth) => set((state) => ({
      auth: { ...state.auth, ...auth }
    })),
    
    // Clips state
    clips: {
      clips: [],
      isLoading: false,
      error: null,
    },
    setClips: (clips) => set((state) => ({
      clips: { ...state.clips, ...clips }
    })),
    addClip: (clip) => set((state) =>
      state.clips.clips.some((c) => c.id === clip.id)
        ? state
        : {
            clips: {
              ...state.clips,
              clips: [clip, ...state.clips.clips]
            }
          }
    ),
    removeClip: (id) => set((state) => ({
      clips: {
        ...state.clips,
        clips: state.clips.clips.filter(clip => clip.id !== id)
      }
    })),
    updateClip: (id, updates) => set((state) => ({
      clips: {
        ...state.clips,
        clips: state.clips.clips.map(clip => 
          clip.id === id ? { ...clip, ...updates } : clip
        )
      }
    })),
    
    // Saved pages state
    savedPages: {
      pages: [],
      notes: [],
      isLoading: false,
      error: null,
    },
    setSavedPages: (pages) => set((state) => ({
      savedPages: { ...state.savedPages, ...pages }
    })),
    addSavedPage: (page) => set((state) => ({
      savedPages: {
        ...state.savedPages,
        pages: [...state.savedPages.pages, page]
      }
    })),
    removeSavedPage: (id) => set((state) => ({
      savedPages: {
        ...state.savedPages,
        pages: state.savedPages.pages.filter(page => page.id !== id),
        notes: state.savedPages.notes.filter(note => note.page_id !== id)
      }
    })),
    updateSavedPage: (id, updates) => set((state) => ({
      savedPages: {
        ...state.savedPages,
        pages: state.savedPages.pages.map(page => 
          page.id === id ? { ...page, ...updates } : page
        )
      }
    })),
    
    // Saved notes state
    addSavedNote: (note) => set((state) =>
      state.savedPages.notes.some((n) => n.id === note.id)
        ? state
        : {
            savedPages: {
              ...state.savedPages,
              notes: [...state.savedPages.notes, note]
            }
          }
    ),
    removeSavedNote: (id) => set((state) => ({
      savedPages: {
        ...state.savedPages,
        notes: state.savedPages.notes.filter(note => note.id !== id)
      }
    })),
    updateSavedNote: (id, updates) => set((state) => ({
      savedPages: {
        ...state.savedPages,
        notes: state.savedPages.notes.map(note => 
          note.id === id ? { ...note, ...updates } : note
        )
      }
    })),
    
    // Theme state
    theme: 'system',
    setTheme: (theme) => {
      set({ theme })
      // Apply theme to document
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        document.documentElement.classList.toggle('dark', systemTheme === 'dark')
      } else {
        document.documentElement.classList.toggle('dark', theme === 'dark')
      }
      localStorage.setItem('theme', theme)
    },
  }))
)

// Initialize theme on mount
export const initializeTheme = () => {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system'
  useStore.getState().setTheme(savedTheme)
}