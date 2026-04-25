import { SkeletonBase } from "./SkeletonBase";
import { cn } from "@/lib/utils";

export function ProjectSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-xl transition-all duration-300">
      {/* Project Image Placeholder with Category Gradient */}
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-blue-600/40 via-blue-500/20 to-cyan-500/10">
        <div className="absolute inset-0 z-0 opacity-10">
          <div className="h-32 w-32 animate-pulse rounded-full bg-white/20" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-slate-950/20 to-transparent z-10" />
        <div className="absolute right-4 top-4 z-10">
          <div className="h-7 w-24 rounded-full bg-white/10 backdrop-blur-md animate-pulse" />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        {/* Title */}
        <div className="mb-2">
          <SkeletonBase className="h-6 w-3/4 rounded-none" />
        </div>

        {/* Description */}
        <div className="mt-2 space-y-2">
          <SkeletonBase className="h-4 w-full rounded-none" />
          <SkeletonBase className="h-4 w-5/6 rounded-none" />
        </div>

        {/* Progress Bar Section */}
        <div className="mt-8 space-y-2">
          <div className="flex justify-between text-sm">
            <SkeletonBase className="h-4 w-16 rounded-none" />
            <SkeletonBase className="h-4 w-20 rounded-none" />
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-primary to-purple-500" />
          </div>
        </div>

        {/* Stats & Social */}
        <div className="mt-auto pt-6">
          <div className="flex items-center justify-between border-t border-white/5 pt-4 text-sm text-white/40">
            <div className="flex items-center gap-1.5">
              <SkeletonBase className="h-4 w-4 rounded-none" />
              <SkeletonBase className="h-4 w-12 rounded-none" />
            </div>
            <div className="flex items-center gap-1.5">
              <SkeletonBase className="h-4 w-4 rounded-none" />
              <SkeletonBase className="h-4 w-10 rounded-none" />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <div className="flex items-center gap-2">
              <SkeletonBase className="h-8 w-8 rounded-full" />
              <SkeletonBase className="h-8 w-16 rounded-lg" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonBase className="h-8 w-8 rounded-full" />
              <SkeletonBase className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
