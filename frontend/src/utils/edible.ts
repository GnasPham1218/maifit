import type { Food } from '../types/meal';
import { normalize } from './text';

// Values in `foods` are per 100 g of the EDIBLE part (USDA "separable lean and fat", no bone).
// These foods are usually served with bones or shells, so weighing them whole over-counts calories
// (rib bones can be 30-40% of the weight). Exact names, accent-free: "ga" alone must not match "Mề gà".
const WITH_BONES = ['suon heo', 'suon bo', 'canh ga', 'dui ga', 'ga nguyen con', 'vit', 'chim bo cau', 'chim cut', 'chan gio heo'];
const WITH_SHELL = ['cua', 'tom', 'tom cang', 'tom hum', 'ngheu', 'oc', 'so diep', 'trung ga', 'trung vit', 'trung cut'];
const BONES_EATEN = ['ca moi hop']; // canned sardines: the soft bones are eaten

// A short reminder under the grams input, or null when the food has nothing to leave on the plate
export function edibleHint(food: Food): string | null {
  const name = normalize(food.name);
  const fish = name.startsWith('ca ') && !BONES_EATEN.includes(name);
  if (fish || WITH_BONES.includes(name)) return 'Chỉ tính phần ăn được, không tính xương.';
  if (WITH_SHELL.includes(name)) return 'Chỉ tính phần ăn được, không tính vỏ.';
  return null;
}
