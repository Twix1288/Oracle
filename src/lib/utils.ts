import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Deterministic stage mapping utilities
export const STAGE_ORDER: Array<'ideation'|'development'|'testing'|'launch'|'growth'> = [
  'ideation','development','testing','launch','growth'
];

export function stageToPercent(stage: (typeof STAGE_ORDER)[number]) {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx < 0) return 0;
  return Math.round((idx / (STAGE_ORDER.length - 1)) * 100);
}
