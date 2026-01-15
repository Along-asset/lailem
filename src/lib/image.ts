export async function fileToCompressedDataUrl(
  file: File,
  options: { maxSize: number; quality: number; maxBytes: number },
): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const ratio = Math.min(1, options.maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * ratio))
  const height = Math.max(1, Math.round(bitmap.height * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_failed')
  ctx.drawImage(bitmap, 0, 0, width, height)

  let quality = options.quality
  for (let i = 0; i < 6; i++) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    if (dataUrl.length <= options.maxBytes) return dataUrl
    quality = Math.max(0.4, quality - 0.1)
  }

  const finalUrl = canvas.toDataURL('image/jpeg', Math.max(0.4, quality))
  if (finalUrl.length > options.maxBytes) throw new Error('image_too_large')
  return finalUrl
}

