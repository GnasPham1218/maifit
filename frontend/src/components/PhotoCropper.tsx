import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { cropToSquare } from '../utils/image';
import { Button } from './Button';

interface Props {
  src: string; // object URL of the chosen photo (owned and revoked by the parent)
  onConfirm: (square: Blob) => void;
  onUseOriginal: () => void;
  onCancel: () => void;
  onLoadError: () => void;
}

const MAX_ZOOM = 3;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// A square viewport over the photo: drag to move, slider to zoom. Only the part inside the square
// is sent to the AI, so pans, scales and other things around the plate cannot be mistaken for food.
// Hand-made with a canvas: no extra library, nothing to keep up to date.
export function PhotoCropper({ src, onConfirm, onUseOriginal, onCancel, onLoadError }: Props) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  // Centre of the square as a fraction of the photo (0..1), so it survives any screen size
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 });
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  // Square side in source pixels: the shorter side of the photo at zoom 1, smaller when zoomed in
  const side = natural ? Math.min(natural.w, natural.h) / zoom : 0;
  // Keep the square inside the photo
  const cx = natural ? clamp(center.x, side / 2 / natural.w, 1 - side / 2 / natural.w) : 0.5;
  const cy = natural ? clamp(center.y, side / 2 / natural.h, 1 - side / 2 / natural.h) : 0.5;
  const sx = natural ? cx * natural.w - side / 2 : 0;
  const sy = natural ? cy * natural.h - side / 2 : 0;

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    drag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current || !natural || !viewportRef.current) return;
    // screen px -> source px: the viewport shows `side` source pixels across its width
    const pxToSource = side / viewportRef.current.clientWidth;
    const dx = (e.clientX - drag.current.x) * pxToSource;
    const dy = (e.clientY - drag.current.y) * pxToSource;
    drag.current = { x: e.clientX, y: e.clientY };
    // dragging the photo right means the square moves left over it
    setCenter({ x: cx - dx / natural.w, y: cy - dy / natural.h });
  }

  async function confirm() {
    if (!imgRef.current || !natural) return;
    setBusy(true);
    try {
      onConfirm(await cropToSquare(imgRef.current, sx, sy, side));
    } catch {
      onLoadError();
    }
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-ink-soft">
        Kéo ảnh để đưa đĩa ăn vào khung vuông, kéo thanh bên dưới để phóng to. Chỉ phần trong khung được gửi đi.
      </p>

      <div
        ref={viewportRef}
        className="relative mx-auto aspect-square w-full max-w-md cursor-grab touch-none select-none overflow-hidden rounded-2xl bg-black active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        <img
          ref={imgRef}
          src={src}
          alt="Ảnh đang cắt"
          draggable={false}
          onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          onError={onLoadError}
          // The viewport shows `side` source pixels, so the photo is (width / side) viewports wide
          style={natural ? {
            position: 'absolute',
            maxWidth: 'none',
            width: `${(natural.w / side) * 100}%`,
            left: `${(-sx / side) * 100}%`,
            top: `${(-sy / side) * 100}%`,
          } : { visibility: 'hidden' }}
        />
      </div>

      <label className="mx-auto flex w-full max-w-md items-center gap-3 text-sm text-ink-soft">
        Phóng to
        <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void confirm()} disabled={!natural || busy}>Nhận diện</Button>
        <Button variant="secondary" onClick={onUseOriginal} disabled={busy}>Dùng ảnh gốc</Button>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>Chọn ảnh khác</Button>
      </div>
    </div>
  );
}
