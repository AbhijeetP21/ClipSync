'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CLIPS_BUCKET, getSignedUrl } from '@/lib/storage'
import { copyImageToClipboard } from '@/lib/clipboard-image'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Icons } from '@/components/icons'
import { Clip, SavedNote } from '@/types'

type BatchItem = Clip | SavedNote

interface ClipBatchCardProps {
  items: BatchItem[]
  onDelete: (ids: string[]) => void
  // Provided in the clipboard view (save to a page); omitted for saved notes.
  onSave?: (items: BatchItem[]) => void
}

export function ClipBatchCard({ items, onDelete, onSave }: ClipBatchCardProps) {
  const type = items[0]?.type ?? 'image'
  const isImage = type === 'image'

  const [urls, setUrls] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState<{ url: string; name: string; type: string } | null>(null)
  const { toast } = useToast()

  // Fetch signed URLs for every item in the batch.
  useEffect(() => {
    let active = true
    Promise.all(
      items.map(async (item) => {
        if (!item.file_path) return [item.id, ''] as const
        const url = await getSignedUrl(item.file_path)
        return [item.id, url ?? ''] as const
      })
    ).then((pairs) => {
      if (active) setUrls(Object.fromEntries(pairs))
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.id).join(',')])

  const allSelected = selected.size === items.length && items.length > 0
  const targets = useMemo(
    () => (selected.size > 0 ? items.filter((i) => selected.has(i.id)) : items),
    [items, selected]
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((i) => i.id))))
  }

  const downloadOne = async (item: BatchItem) => {
    if (!item.file_path) return
    const { data } = await supabase.storage
      .from(CLIPS_BUCKET)
      .createSignedUrl(item.file_path, 60, { download: item.file_name || true })
    if (!data) return
    const a = document.createElement('a')
    a.href = data.signedUrl
    a.download = item.file_name || ''
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const handleDownload = async () => {
    for (const item of targets) {
      // Small gap so the browser does not drop rapid sequential downloads.
      await downloadOne(item)
      await new Promise((r) => setTimeout(r, 250))
    }
  }

  const handleDelete = () => {
    onDelete(targets.map((i) => i.id))
    setSelected(new Set())
  }

  const handleSave = () => {
    onSave?.(targets)
    setSelected(new Set())
  }

  const copyImageById = async (id: string) => {
    const url = urls[id]
    if (!url) return
    const ok = await copyImageToClipboard(url)
    toast(
      ok
        ? { title: 'Image copied', description: 'The image is on your clipboard.' }
        : { title: 'Copy failed', description: 'Could not copy the image.', variant: 'destructive' }
    )
  }

  const handleCopySelected = () => {
    if (selected.size === 1) copyImageById(Array.from(selected)[0])
  }

  // Ctrl/Cmd+C copies the image currently open in the preview.
  useEffect(() => {
    if (!preview || preview.type !== 'image') return
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        copyImageToClipboard(preview.url).then((ok) =>
          toast(
            ok
              ? { title: 'Image copied', description: 'The image is on your clipboard.' }
              : { title: 'Copy failed', description: 'Could not copy the image.', variant: 'destructive' }
          )
        )
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [preview, toast])

  const label = `${items.length} ${isImage ? 'image' : 'PDF'}${items.length === 1 ? '' : 's'}`
  const actingLabel = selected.size > 0 ? `${selected.size} selected` : 'all'

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                {isImage ? <Icons.image className="h-4 w-4" /> : <Icons.file className="h-4 w-4" />}
                <span>{label}</span>
              </Badge>
              <Button variant="ghost" size="sm" className="text-xs" onClick={toggleAll}>
                {allSelected ? 'Clear selection' : 'Select all'}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {isImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  disabled={selected.size !== 1}
                  title="Select one image to copy"
                  onClick={handleCopySelected}
                >
                  <Icons.copy className="mr-1 h-3 w-3" />
                  Copy
                </Button>
              )}
              {onSave && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={handleSave}>
                  <Icons.save className="mr-1 h-3 w-3" />
                  Add to note
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-xs" onClick={handleDownload}>
                <Icons.download className="mr-1 h-3 w-3" />
                Download {actingLabel}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:text-destructive/90"
                onClick={handleDelete}
              >
                <Icons.trash className="mr-1 h-3 w-3" />
                Delete {actingLabel}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isImage ? (
            <div className="flex flex-wrap gap-2">
              {items.map((item) => {
                const url = urls[item.id]
                const isSel = selected.has(item.id)
                return (
                  <div
                    key={item.id}
                    className={`group relative h-20 w-20 shrink-0 overflow-hidden rounded-md border transition-shadow hover:shadow-md ${
                      isSel ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggle(item.id)}
                      aria-label={`Select ${item.file_name || 'image'}`}
                      className="absolute left-1 top-1 z-10 h-4 w-4 cursor-pointer accent-primary opacity-80"
                    />
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={item.file_name || 'image'}
                        title={item.file_name || ''}
                        loading="lazy"
                        onClick={() => setPreview({ url, name: item.file_name || 'image', type })}
                        className="h-full w-full cursor-pointer object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Icons.image className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="divide-y rounded-md border">
              {items.map((item, idx) => {
                const url = urls[item.id]
                const isSel = selected.has(item.id)
                return (
                  <div key={item.id} className="flex items-center gap-3 p-2">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggle(item.id)}
                      aria-label={`Select ${item.file_name || 'PDF'}`}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
                    <span className="w-5 shrink-0 text-center text-xs text-muted-foreground">
                      {idx + 1}
                    </span>
                    <Icons.file className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm" title={item.file_name || ''}>
                      {item.file_name || 'Untitled.pdf'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      disabled={!url}
                      onClick={() => url && setPreview({ url, name: item.file_name || 'PDF', type })}
                    >
                      <Icons.expand className="mr-1 h-3 w-3" />
                      Preview
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview lightbox */}
      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview && preview.type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.url}
              alt={preview.name}
              className="max-h-[70vh] w-full rounded-md object-contain"
            />
          ) : preview ? (
            <iframe src={preview.url} title={preview.name} className="h-[70vh] w-full rounded-md" />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
