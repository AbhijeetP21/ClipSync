'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Icons } from '@/components/icons'
import { ClipFormData, ClipType } from '@/types'

const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'bash', label: 'Bash/Shell' },
  { value: 'json', label: 'JSON' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'rust', label: 'Rust' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'xml', label: 'XML' },
]

interface ClipInputProps {
  onAddClip: (clip: ClipFormData) => void
  isLoading?: boolean
}

export function ClipInput({ onAddClip, isLoading = false }: ClipInputProps) {
  const [type, setType] = useState<ClipType>('text')
  const [content, setContent] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const isImageFile = (content: string) => {
    // Simple check for image URLs or base64
    return content.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) || content.startsWith('data:image/')
  }

  const isPdfFile = (content: string) => {
    return content.match(/\.pdf$/i) || content.startsWith('data:application/pdf')
  }

  useEffect(() => {
    // Auto-detect code type based on content
    if (content.trim()) {
      if (content.includes('```') || content.includes('{') || content.includes('function') || content.includes('import')) {
        setType('code')
      } else if (isImageFile(content)) {
        setType('image')
      } else if (isPdfFile(content)) {
        setType('pdf')
      }
    }
  }, [content])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: 'File too large',
          description: 'File size must be less than 10MB.',
          variant: 'destructive',
        })
        return
      }

      setFile(selectedFile)
      
      // Auto-detect type based on file extension
      const ext = selectedFile.name.split('.').pop()?.toLowerCase()
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
        setType('image')
      } else if (ext === 'pdf') {
        setType('pdf')
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('border-primary', 'bg-accent')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('border-primary', 'bg-accent')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('border-primary', 'bg-accent')
    
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      if (droppedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: 'File too large',
          description: 'File size must be less than 10MB.',
          variant: 'destructive',
        })
        return
      }

      setFile(droppedFile)
      
      // Auto-detect type based on file extension
      const ext = droppedFile.name.split('.').pop()?.toLowerCase()
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
        setType('image')
      } else if (ext === 'pdf') {
        setType('pdf')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (type === 'text' || type === 'code') {
      if (!content.trim()) {
        toast({
          title: 'Empty content',
          description: 'Please enter some content.',
          variant: 'destructive',
        })
        return
      }

      onAddClip({
        type,
        content: content.trim(),
        language: type === 'code' ? language : undefined,
      })
      setContent('')
      setLanguage('javascript')
    } else if (type === 'image' || type === 'pdf') {
      if (!file) {
        toast({
          title: 'No file selected',
          description: 'Please select or drag and drop a file.',
          variant: 'destructive',
        })
        return
      }

      setIsUploading(true)

      // Upload the file to the private "clips-files" bucket, namespaced by user id.
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) {
        toast({
          title: 'Not signed in',
          description: 'Your session expired. Please sign in again.',
          variant: 'destructive',
        })
        setIsUploading(false)
        return
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${userId}/${Date.now()}-${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('clips-files')
        .upload(filePath, file, { contentType: file.type, upsert: false })

      if (uploadError) {
        toast({
          title: 'Upload failed',
          description: uploadError.message,
          variant: 'destructive',
        })
        setIsUploading(false)
        return
      }

      onAddClip({
        type,
        file_path: filePath,
        file_name: file.name,
      })
      setFile(null)
      setType('text')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setIsUploading(false)
    }
  }

  const clearInput = () => {
    setContent('')
    setFile(null)
    setType('text')
    setLanguage('javascript')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Clip</CardTitle>
        <CardDescription>Enter text, code, or upload an image/PDF</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selection */}
          <div className="grid grid-cols-4 gap-2">
            {(['text', 'code', 'image', 'pdf'] as ClipType[]).map((clipType) => (
              <Button
                key={clipType}
                type="button"
                variant={type === clipType ? 'default' : 'outline'}
                onClick={() => setType(clipType)}
                className="justify-start"
              >
                <Icons.text className="mr-2 h-4 w-4" />
                {clipType.charAt(0).toUpperCase() + clipType.slice(1)}
              </Button>
            ))}
          </div>

          {/* Content Input */}
          {type === 'text' || type === 'code' ? (
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                placeholder={`Enter your ${type} content...`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
              />
              {type === 'code' && (
                <div className="flex space-x-2">
                  <Label htmlFor="language" className="text-sm text-muted-foreground">
                    Language:
                  </Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={type === 'image' ? 'image/*' : type === 'pdf' ? '.pdf' : ''}
                onChange={handleFileSelect}
                className="hidden"
                id="file-input"
              />
              <Label htmlFor="file-input" className="cursor-pointer">
                <div className="space-y-2">
                  <Icons.image className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="text-sm font-medium">
                    {file ? file.name : `Drag and drop or click to select ${type}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Maximum file size: 10MB
                  </div>
                </div>
              </Label>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <div className="flex space-x-2">
              <Button type="submit" disabled={isLoading || isUploading}>
                {isLoading || isUploading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Icons.plus className="mr-2 h-4 w-4" />
                    Add Clip
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={clearInput}>
                Clear
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Tip: Press Ctrl+Enter to submit
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}