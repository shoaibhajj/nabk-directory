import {
  Pill,
  Stethoscope,
  Coffee,
  ShoppingBasket,
  Wrench,
  Scissors,
  GraduationCap,
  Home as HomeIcon,
  Shirt,
  Hammer,
  Store,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  pharmacies: Pill,
  clinics: Stethoscope,
  restaurants: Coffee,
  grocery: ShoppingBasket,
  auto: Wrench,
  salons: Scissors,
  education: GraduationCap,
  mosques: HomeIcon,
  clothing: Shirt,
  construction: Hammer,
};

export function getCategoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[slug] ?? Store;
}
