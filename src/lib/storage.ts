import { supabase } from './supabase'

export const CLIPS_BUCKET = 'clips-files'

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']

export function fileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || IMAGE_EXTENSIONS.includes(fileExtension(file.name))
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || fileExtension(file.name) === 'pdf'
}

// Upload a single file to the private bucket under a per-user path. Returns the
// storage path and original file name, or null on failure.
export async function uploadClipFile(
  file: File
): Promise<{ file_path: string; file_name: string } | null> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) return null

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const filePath = `${userId}/${unique}-${safeName}`

  const { error } = await supabase.storage
    .from(CLIPS_BUCKET)
    .upload(filePath, file, { contentType: file.type, upsert: false })

  if (error) {
    console.error('Error uploading file:', error)
    return null
  }

  return { file_path: filePath, file_name: file.name }
}

// In-memory cache of signed URLs so many cards/re-renders reuse one request per
// file instead of each fetching its own.
const signedUrlCache = new Map<string, { url: string; expires: number }>()

// Create (or reuse) a short-lived signed URL for previewing a stored file.
export async function getSignedUrl(filePath: string, expiresIn = 3600): Promise<string | null> {
  const now = Date.now()
  const cached = signedUrlCache.get(filePath)
  // Reuse while at least a minute of validity remains.
  if (cached && cached.expires > now + 60_000) return cached.url

  const { data, error } = await supabase.storage
    .from(CLIPS_BUCKET)
    .createSignedUrl(filePath, expiresIn)
  if (error || !data) return null

  signedUrlCache.set(filePath, { url: data.signedUrl, expires: now + expiresIn * 1000 })
  return data.signedUrl
}
