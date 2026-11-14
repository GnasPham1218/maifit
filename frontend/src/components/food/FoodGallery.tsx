import { useState } from 'react';
import type { FoodImage } from '../../types/food';

interface FoodGalleryProps {
  images: FoodImage[]; // main photo first
  label: string; // e.g. "Ảnh gạo tẻ luộc"
  note?: string; // shown when these are another preparation's photos
}

// One large photo and small ones to switch. Every photo says who took it and under which license.
export function FoodGallery({ images, label, note }: FoodGalleryProps) {
  const [index, setIndex] = useState(0);
  const current = images[Math.min(index, images.length - 1)];
  if (!current) return null;

  return (
    <section aria-label={label} className="grid gap-2.5">
      <img src={`/${current.path}`} alt={current.alt} className="aspect-4/3 w-full rounded-card object-cover" />
      {images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, i) => (
            <button key={image.path} type="button" onClick={() => setIndex(i)} aria-pressed={image === current}
              aria-label={`Xem ảnh ${i + 1}: ${image.alt}`}
              className={`h-16 w-21 cursor-pointer overflow-hidden rounded-xl border-2 p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                image === current ? 'border-accent' : 'border-transparent'}`}>
              <img src={`/${image.path}`} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-muted">
        {note && <>{note} </>}
        Ảnh {images.indexOf(current) + 1}/{images.length}: {current.credit}, giấy phép {current.license}
        {current.sourceUrl && (
          <> (<a href={current.sourceUrl} target="_blank" rel="noopener noreferrer">nguồn ảnh<span className="sr-only">, mở tab mới</span></a>)</>
        )}
      </p>
    </section>
  );
}
