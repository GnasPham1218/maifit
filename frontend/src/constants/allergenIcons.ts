import {
  Bean, Croissant, Egg, Fish, Grip, LeafyGreen, Milk, Nut, Shell, Shrimp, Squirrel, Wheat, Wine, CircleAlert,
  type LucideIcon,
} from 'lucide-react';

// One picture per allergen group (codes from V24). Unknown codes (a group added later) get a plain icon.
const ICONS: Record<string, LucideIcon> = {
  MILK: Milk, EGG: Egg, PEANUT: Nut, TREE_NUT: Squirrel, SOY: Bean, WHEAT: Wheat, GLUTEN: Croissant,
  FISH: Fish, CRUSTACEAN: Shrimp, MOLLUSC: Shell, SESAME: Grip, CELERY: LeafyGreen, SULPHITES: Wine,
};

export function allergenIcon(code: string): LucideIcon {
  return ICONS[code] ?? CircleAlert;
}
