import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Clean stage mapping utilities
export const STAGE_ORDER: Array<'ideation'|'development'|'testing'|'launch'|'growth'> = [
  'ideation','development','testing','launch','growth'
];

export function getStageProgress(currentStage: (typeof STAGE_ORDER)[number], targetStage: (typeof STAGE_ORDER)[number]): number {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const targetIndex = STAGE_ORDER.indexOf(targetStage);
  
  if (currentIndex < 0 || targetIndex < 0) return 0;
  
  // Completed stages = 100%, current stage = 50%, future stages = 0%
  if (targetIndex < currentIndex) return 100;
  if (targetIndex === currentIndex) return 50;
  return 0;
}
