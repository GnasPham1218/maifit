// Shrinks a photo before upload: longest side <= maxSide, re-encoded as JPEG.
// - Smaller upload: a 4 MB phone photo becomes ~200 KB (faster, fewer AI tokens)
// - Re-encoding through a canvas drops EXIF metadata, including the GPS position of the photo
export async function resizeForUpload(file: File, maxSide = 1024, quality = 0.8): Promise<Blob> {
  // createImageBitmap applies the EXIF orientation, so portrait photos are not rotated
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not supported');
    ctx.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))), 'image/jpeg', quality);
    });
  } finally {
    bitmap.close();
  }
}


// Cuts the square (sx, sy, side) out of an already loaded <img> and encodes it as JPEG, longest side <= maxSide.
// Drawing the <img> element itself keeps the crop identical to what the user saw (EXIF rotation included),
// and re-encoding through a canvas drops EXIF/GPS just like resizeForUpload.
export async function cropToSquare(
  img: HTMLImageElement, sx: number, sy: number, side: number, maxSide = 1024, quality = 0.8,
): Promise<Blob> {
  const out = Math.round(Math.min(side, maxSide));
  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not supported');
  ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode image'))), 'image/jpeg', quality);
  });
}
