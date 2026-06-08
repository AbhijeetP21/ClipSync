// User types
export interface User {
  id: string
  email: string
  created_at: string
}

// Clip types
export type ClipType = 'text' | 'code' | 'image' | 'pdf'

export interface Clip {
  id: string
  user_id: string
  type: ClipType
  content?: string
  file_path?: string
  file_name?: string
  language?: string
  collapsed: boolean
  created_at: string
  date_bucket: string
}

// Saved page types
export interface SavedPage {
  id: string
  user_id: string
  name: string
  emoji: string
  position: number
  created_at: string
}

// Saved note types
export interface SavedNote {
  id: string
  user_id: string
  page_id: string
  type: ClipType
  content?: string
  file_path?: string
  file_name?: string
  language?: string
  collapsed: boolean
  position: number
  created_at: string
}

// Config types
export interface Config {
  key: string
  value: string
}

// File upload types
export interface FileUpload {
  file: File
  type: ClipType
  language?: string
}

// Form data types
export interface ClipFormData {
  type: ClipType
  content?: string
  language?: string
  file_path?: string
  file_name?: string
}

// Authentication types
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error?: string | null
}

// State management types
export interface ClipsState {
  clips: Clip[]
  isLoading: boolean
  error: string | null
}

export interface SavedPagesState {
  pages: SavedPage[]
  notes: SavedNote[]
  isLoading: boolean
  error: string | null
}

// UI component types
export interface ClipCardProps {
  clip: Clip
  onDelete: (id: string) => void
  onSave: (clip: Clip) => void
  onToggleCollapse: (id: string) => void
}

export interface ClipInputProps {
  onAddClip: (clip: Omit<Clip, 'id' | 'user_id' | 'created_at' | 'date_bucket'>) => void
  isLoading?: boolean
}

export interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

// Theme types
export type Theme = 'light' | 'dark' | 'system'

export interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
}