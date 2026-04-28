import { cn } from "@/lib/utils";

interface SkeletonBaseProps {
  className?: string;
}

export function SkeletonBase({ className }: SkeletonBaseProps) {
  return (
    <div className={cn("animate-pulse rounded-md bg-muted/60", className)} />
  );
}
