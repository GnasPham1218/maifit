import { Camera } from 'lucide-react';

// Explains the photo feature once, next to the calendar. The remaining count comes with the AI quota API (step 9).
export function PhotoInfoCard() {
  return (
    <section className="flex gap-3 rounded-card bg-surface p-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-soft text-link">
        <Camera aria-hidden="true" className="size-5" />
      </span>
      <div className="grid gap-1">
        <h2 className="font-semibold">Nhận diện món từ ảnh</h2>
        <p className="text-sm text-muted">
          AI chỉ nhận món và ước lượng gram. Calo luôn tính từ bảng dữ liệu, bạn sửa gram để tính lại.
        </p>
      </div>
    </section>
  );
}
