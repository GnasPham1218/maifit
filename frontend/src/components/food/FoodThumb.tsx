import { Utensils } from 'lucide-react';
import type { FoodImage } from '../../types/food';

// The main photo of a food, or the plain icon while it has none. Decorative (alt=""): the name is next to it.
export function FoodThumb({ image, size = 48 }: { image: FoodImage | null; size?: number }) {
  return image ? (
    <img src={`/${image.path}`} alt="" loading="lazy" width={size} height={size}
      className="shrink-0 rounded-xl object-cover" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden="true" className="flex shrink-0 items-center justify-center rounded-xl bg-soft text-link"
      style={{ width: size, height: size }}>
      <Utensils className="size-1/2" />
    </span>
  );
}
