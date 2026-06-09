'use client'

import { useState, useRef, useEffect } from 'react'
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
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'xml', label: 'XML' },
]

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
const MAX_FILES: Record<string, number> = { image: 10, pdf: 5 }
const MAX_SIZE = 10 * 1024 * 1024

interface ClipInputProps {
  onAddClip: (clip: ClipFormData) => void
  onAddFiles?: (files: File[], type: ClipType) => void | Promise<void>
  isLoading?: boolean
}

export function ClipInput({ onAddClip, onAddFiles, isLoading = false }: ClipInputProps) {
  const [type, setType] = useState<ClipType>('text')
  const [content, setContent] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const isTextLike = type === 'text' || type === 'code'

  useEffect(() => {
    // Auto-detect code vs text based on content.
    if (content.trim()) {
      if (
        content.includes('```') ||
        content.includes('{') ||
        content.includes('function') ||
        content.includes('import')
      ) {
        setType((t) => (t === 'text' ? 'code' : t))
      }
    }
  }, [content])

  const acceptsFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    return type === 'image'
      ? file.type.startsWith('image/') || IMAGE_EXTS.includes(ext)
      : file.type === 'application/pdf' || ext === 'pdf'
  }

  // Validate and upload selected/dropped files immediately (no "Add Clip" step).
  const handleFilesChosen = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !onAddFiles) return
    const max = MAX_FILES[type] ?? 1

    let files = Array.from(fileList).filter(acceptsFile)
    const tooBig = files.filter((f) => f.size > MAX_SIZE)
    files = files.filter((f) => f.size <= MAX_SIZE)

    let capped = false
    if (files.length > max) {
      files = files.slice(0, max)
      capped = true
    }

    if (files.length === 0) {
      toast({
        title: 'No valid files',
        description: `Select ${type === 'image' ? 'images' : 'PDFs'} under 10MB.`,
        variant: 'destructive',
      })
      return
    }
    if (tooBig.length > 0) {
      toast({ title: 'Some files skipped', description: `${tooBig.length} file(s) over 10MB were skipped.` })
    }
    if (capped) {
      toast({ title: 'Limit reached', description: `Only the first ${max} were added.` })
    }

    setIsUploading(true)
    await onAddFiles(files, type)
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
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
    handleFilesChosen(e.dataTransfer.files)
  }

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!isTextLike) return
    if (!content.trim()) {
      toast({ title: 'Empty content', description: 'Please enter some content.', variant: 'destructive' })
      return
    }
    onAddClip({
      type,
      content: content.trim(),
      language: type === 'code' ? language : undefined,
    })
    setContent('')
    setLanguage('javascript')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const clearInput = () => {
    setContent('')
    setType('text')
    setLanguage('javascript')
  }

  const max = MAX_FILES[type] ?? 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Clip</CardTitle>
        <CardDescription>Enter text or code, or drop in images and PDFs</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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

          {isTextLike ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder={`Enter your ${type} content...`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
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

              {/* Actions (text/code only) */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex space-x-2">
                  <Button type="submit" disabled={isLoading}>
                    <Icons.plus className="mr-2 h-4 w-4" />
                    Add Clip
                  </Button>
                  <Button type="button" variant="outline" onClick={clearInput}>
                    Clear
                  </Button>
                </div>
                <div className="hidden text-sm text-muted-foreground sm:block">
                  Tip: Press Ctrl+Enter to submit
                </div>
              </div>
            </>
          ) : (
            // Image / PDF dropzone: files upload instantly on select or drop.
            <div
              className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-primary"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={type === 'image' ? 'image/*' : '.pdf'}
                onChange={(e) => handleFilesChosen(e.target.files)}
                className="hidden"
                id="file-input"
              />
              <Label htmlFor="file-input" className="cursor-pointer">
                <div className="space-y-2">
                  {isUploading ? (
                    <Icons.spinner className="mx-auto h-10 w-10 animate-spin text-primary" />
                  ) : type === 'image' ? (
                    <Icons.image className="mx-auto h-10 w-10 text-gray-400" />
                  ) : (
                    <Icons.file className="mx-auto h-10 w-10 text-gray-400" />
                  )}
                  <div className="text-sm font-medium">
                    {isUploading
                      ? 'Uploading...'
                      : `Drag and drop or click to select ${type === 'image' ? 'images' : 'PDFs'}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Up to {max} {type === 'image' ? 'images' : 'PDFs'} at once, 10MB each. They are added instantly.
                  </div>
                </div>
              </Label>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
