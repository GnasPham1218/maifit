import { ScanSearch, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, WheelEvent } from 'react';
import { cropToSquare } from '../utils/image';
import { Button } from './Button';

interface Props {
  src: string; // object URL of the chosen photo (owned and revoked by the parent)
  remaining: number | null; // photo scans left today, when known
  onConfirm: (square: Blob) => void;
  onUseOriginal: () => void;
  onCancel: () => void;
  onLoadError: () => void;
}

const MAX_ZOOM = 3;
const KEY_STEP = 0.05; // arrow keys move the photo by 5% of the square
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

// Full-screen dark stage: a fixed square frame in the middle, the photo moves under it.
// The photo outside the frame stays visible but dimmed, so the user sees what is left out.
// Only the part inside the frame is sent to the AI. Its own <dialog> on top of the photo dialog
// (the browser stacks both in the top layer), so the page and the other dialog need no change.
// Zoom: pinch on phones, wheel on desktop, + / - keys. Move: drag, or the arrow keys.
export function PhotoCropper({ src, remaining, onConfirm, onUseOriginal, onCancel, onLoadError }: Props) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  // Centre of the square as a fraction of the photo (0..1), so it survives any screen size
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 });
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // Square side in source pixels: the shorter side of the photo at zoom 1, smaller when zoomed in
  const side = natural ? Math.min(natural.w, natural.h) / zoom : 0;
  // Keep the square inside the photo
  const cx = natural ? clamp(center.x, side / 2 / natural.w, 1 - side / 2 / natural.w) : 0.5;
  const cy = natural ? clamp(center.y, side / 2 / natural.h, 1 - side / 2 / natural.h) : 0.5;
  const sx = natural ? cx * natural.w - side / 2 : 0;
  const sy = natural ? cy * natural.h - side / 2 : 0;

  // Move the square by a distance given in source pixels
  function moveBy(dx: number, dy: number) {
    if (!natural) return;
    setCenter({ x: cx + dx / natural.w, y: cy + dy / natural.h });
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: distance(a, b), zoom };
    }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const last = pointers.current.get(e.pointerId);
    if (!last || !natural || !frameRef.current) return;
    const now = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, now);

    if (pointers.current.size >= 2 && pinch.current) {
      // Two fingers: the zoom follows how far apart they are compared with the start of the pinch
      const [a, b] = [...pointers.current.values()];
      setZoom(clamp(pinch.current.zoom * (distance(a, b) / pinch.current.distance), 1, MAX_ZOOM));
      return;
    }
    // One finger: screen px -> source px (the frame shows `side` source pixels across its width).
    // Dragging the photo right means the square moves left over it.
    const pxToSource = side / frameRef.current.clientWidth;
    moveBy(-(now.x - last.x) * pxToSource, -(now.y - last.y) * pxToSource);
  }

  function onPointerEnd(e: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  function onWheel(e: WheelEvent<HTMLDivElement>) {
    setZoom((z) => clamp(z * Math.exp(-e.deltaY * 0.0015), 1, MAX_ZOOM));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = side * KEY_STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
    };
    if (moves[e.key]) {
      e.preventDefault();
      moveBy(...moves[e.key]);
    } else if (e.key === '+' || e.key === '=') {
      setZoom((z) => clamp(z + 0.1, 1, MAX_ZOOM));
    } else if (e.key === '-') {
      setZoom((z) => clamp(z - 0.1, 1, MAX_ZOOM));
    }
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
    <dialog ref={dialogRef} aria-labelledby="crop-title"
      // Esc: go back to choosing a photo instead of letting the browser close the dialog on its own
      onCancel={(e) => { e.preventDefault(); onCancel(); }}
      className="modal m-0 h-dvh max-h-none w-full max-w-none bg-[#0c0d10] p-0 text-white backdrop:bg-black/80
        md:m-auto md:h-[min(92dvh,52rem)] md:max-w-xl md:rounded-[28px]">
      <div className="flex h-full flex-col">
        <header className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3 p-4">
          <button type="button" onClick={onCancel} aria-label="Huỷ, chọn ảnh khác" disabled={busy}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/25 hover:bg-white/10
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <X aria-hidden="true" className="size-4" />
          </button>
          <h2 id="crop-title" className="text-center font-semibold">Cắt ảnh</h2>
        </header>

        {/* The stage clips the photo; container size units let the square fit both width and height */}
        <div tabIndex={0} role="application"
          aria-label="Khung cắt ảnh. Kéo hoặc dùng phím mũi tên để di chuyển ảnh, chụm hai ngón, cuộn chuột hoặc phím cộng trừ để phóng to."
          className="relative min-h-0 flex-1 cursor-grab touch-none overflow-hidden select-none [container-type:size] active:cursor-grabbing
            focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}
          onWheel={onWheel} onKeyDown={onKeyDown}>
          <div ref={frameRef}
            className="absolute top-1/2 left-1/2 aspect-square w-[min(100cqw-2rem,100cqh-2rem)] -translate-x-1/2 -translate-y-1/2">
            <img ref={imgRef} src={src} alt="Ảnh đang cắt" draggable={false}
              onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              onError={onLoadError}
              // Positioned in percent of the frame: the frame shows `side` source pixels, so the photo is
              // (width / side) frames wide. The parts beyond the frame show, and the stage clips them.
              style={natural ? {
                position: 'absolute',
                maxWidth: 'none',
                width: `${(natural.w / side) * 100}%`,
                left: `${(-sx / side) * 100}%`,
                top: `${(-sy / side) * 100}%`,
              } : { visibility: 'hidden' }} />
            {/* Dims everything outside the frame (a huge shadow around it), then thirds lines and corner marks */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 shadow-[0_0_0_100vmax_rgba(0,0,0,0.55)]" />
            <svg aria-hidden="true" viewBox="0 0 300 300" preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 size-full overflow-visible">
              <path d="M100 0V300M200 0V300M0 100H300M0 200H300" stroke="white" strokeOpacity="0.35" strokeWidth="1"
                vectorEffect="non-scaling-stroke" />
              <path d="M0 0H300V300H0Z" fill="none" stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              <path d="M0 30V0H30M270 0H300V30M300 270V300H270M30 300H0V270" fill="none" stroke="white" strokeWidth="5"
                strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
        </div>

        <div className="grid gap-4 p-4">
          <ul className="grid list-disc gap-1 pl-5 text-sm text-white/75">
            <li>Kéo ảnh để đưa đĩa ăn vào khung, chụm hai ngón để phóng to.</li>
            <li>Chụp từng bữa riêng; để chảo, nồi, dụng cụ ra ngoài khung.</li>
          </ul>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="hero" onClick={onCancel} disabled={busy}>Chọn ảnh khác</Button>
            <Button onClick={() => void confirm()} disabled={!natural || busy}>
              <ScanSearch aria-hidden="true" className="size-4" /> Nhận diện món
            </Button>
          </div>
          <p className="text-center text-sm text-white/60">
            Dùng 1 lượt nhận diện{remaining != null ? `, hôm nay còn ${remaining} lượt` : ''}.{' '}
            <button type="button" onClick={onUseOriginal} disabled={busy}
              className="cursor-pointer font-medium text-white underline underline-offset-2 disabled:cursor-not-allowed">
              Gửi cả ảnh, không cắt
            </button>
          </p>
        </div>
      </div>
    </dialog>
  );
}