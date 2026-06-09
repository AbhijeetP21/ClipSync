// Copy an image (referenced by a URL) to the OS clipboard.
//
// Browsers (Chromium especially) only reliably accept image/png in a
// ClipboardItem, so non-PNG images are converted via canvas first. The blob is
// produced inside a Promise passed to ClipboardItem so the async work stays tied
// to the originating user gesture (required by the Clipboard API).
//
// Returns true on success; callers should fall back (e.g. copy a link) on false.
export async function copyImageToClipboard(url: string): Promise<boolean> {
  try {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
      return false
    }

    const pngBlob: Promise<Blob> = (async () => {
      const res = await fetch(url)
      const blob = await res.blob()
      return blob.type === 'image/png' ? blob : await blobToPng(blob)
    })()

    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
    return true
  } catch (err) {
    console.error('Failed to copy image to clipboard:', err)
    return false
  }
}

async function blobToPng(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2D canvas context')
  ctx.drawImage(bitmap, 0, 0)
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  )
}
