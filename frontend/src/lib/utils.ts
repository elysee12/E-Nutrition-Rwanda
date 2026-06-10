import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { NutritionStatus } from "./api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function statusColor(status: NutritionStatus): string {
  switch (status) {
    case "SAM":
      return "bg-destructive/15 text-destructive border-destructive/30";
    case "MAM":
      return "bg-orange-500/15 text-orange-700 border-orange-500/30";
    case "Wasting":
      return "bg-orange-500/15 text-orange-700 border-orange-500/30";
    case "Stunting":
      return "bg-purple-500/15 text-purple-700 border-purple-500/30";
    case "Underweight":
      return "bg-amber-500/15 text-amber-700 border-amber-500/30";
    default:
      return "bg-emerald-500/15 text-emerald-700 border-emerald-500/30";
  }
}
