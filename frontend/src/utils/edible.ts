import type { Food } from '../types/meal';
import { normalize } from './text';

// Values in `foods` are per 100 g of the EDIBLE part (USDA "separable lean and fat", no bone).
// These foods are usually served with bones or shells, so weighing them whole over-counts calories
// (rib bones can be 30-40% of the weight). Exact names, accent-free: "ga" alone must not match "Mề gà".
const WITH_BONES = ['canh ga', 'dui ga', 'ga nguyen con', 'vit', 'chim bo cau', 'chim cut', 'chan gio heo'];
const WITH_SHELL = ['cua', 'tom', 'tom cang', 'tom hum', 'ngheu', 'oc', 'so diep', 'trung ga', 'trung vit', 'trung cut'];
const BONES_EATEN = ['ca moi hop']; // canned sardines: the soft bones are eaten

// A short reminder under the grams input, or null when the food has nothing to leave on the plate
export function edibleHint(food: Food): string | null {
  const name = normalize(food.name);
  const fish = name.startsWith('ca ') && !BONES_EATEN.includes(name);
  const ribs = name.startsWith('suon '); // every cut: Sườn heo, Sườn thăn heo nạc, Sườn bò...
  if (fish || ribs || WITH_BONES.includes(name)) return 'Chỉ tính phần ăn được, không tính xương.';
  if (WITH_SHELL.includes(name)) return 'Chỉ tính phần ăn được, không tính vỏ.';
  return null;
}

// Rib rows WITH fat -> the lean-only row to pick when the fat is trimmed before eating (V10).
// "Sườn heo" (spareribs) has no lean-only USDA row, so it points to the lean loin ribs.
const LEAN_VERSION: Record<string, string> = {
  'suon heo': 'Sườn thăn heo nạc',
  'suon than heo': 'Sườn thăn heo nạc',
  'suon lung heo': 'Sườn lưng heo nạc',
};

export function leanHint(food: Food): string | null {
  const lean = LEAN_VERSION[normalize(food.name)];
  return lean ? `Số này tính cả mỡ. Gỡ hết mỡ trước khi ăn? Chọn “${lean}”.` : null;
}
