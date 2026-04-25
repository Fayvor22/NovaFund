"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Users, Sparkles, Code, Palette, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";
import { LikeButton } from "@/components/social/LikeButton";
import { ShareButton } from "@/components/social/ShareButton";
import { SocialStats } from "@/components/social/SocialStats";
import { subscribeToFundingUpdates } from "@/lib/funding-stream-client";
import Image from "next/image";

const BLUR_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mOMjY39zwAEhQJnxZ6A3QAAAABJRU5ErkJggg==";

export interface Project {
  id: string;
  title: string;
  description: string;
  category: "Tech" | "Art" | "Green Energy" | "UX";
  fundingStage?: string;
  successProbability?: number;
  goal: number;
  raised: number;
  backers: number;
  daysLeft: number;
  imageUrl: string;
  createdAt: string;
}

interface ProjectCardProps {
  project: Project;
}

interface FundingState {
  raised: number;
  backers: number;
}

function getNonNegativeNumber(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getBackerCount(value: number): number {
  return Math.trunc(getNonNegativeNumber(value));
}

function createFundingState(raised: number, backers: number): FundingState {
  return {
    raised: getNonNegativeNumber(raised),
    backers: getBackerCount(backers),
  };
}

function getProgressPercentage(raised: number, goal: number): number {
  if (!Number.isFinite(goal) || goal <= 0) return 0;

  const progress = (raised / goal) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const projectId = project.id;
  const goal = getNonNegativeNumber(project.goal);
  const initialRaised = project.raised;
  const initialBackers = project.backers;
  const [fundingState, setFundingState] = React.useState<FundingState>(() =>
    createFundingState(initialRaised, initialBackers)
  );

  React.useEffect(() => {
    setFundingState(createFundingState(initialRaised, initialBackers));
  }, [projectId, initialRaised, initialBackers]);

  React.useEffect(() => {
    return subscribeToFundingUpdates((update) => {
      if (update.projectId !== projectId) return;

      setFundingState((current) => {
        const nextRaised = getNonNegativeNumber(
          update.raised ?? current.raised + (update.amount ?? 0)
        );
        const nextBackers =
          update.backers !== undefined ? getBackerCount(update.backers) : current.backers;

        if (nextRaised === current.raised && nextBackers === current.backers) {
          return current;
        }

        return {
          raised: nextRaised,
          backers: nextBackers,
        };
      });
    });
  }, [projectId]);

  const progress = getProgressPercentage(fundingState.raised, goal);

  const categoryStyles = {
    Tech: {
      gradient: "from-blue-600/40 via-blue-500/20 to-cyan-500/10",
      color: "text-blue-400",
      border: "border-blue-500/30",
      badge: "bg-blue-500/10 text-blue-300 border-blue-500/20",
      icon: Code,
    },
    Art: {
      gradient: "from-purple-600/40 via-pink-500/20 to-purple-500/10",
      color: "text-purple-400",
      border: "border-purple-500/30",
      badge: "bg-purple-500/10 text-purple-300 border-purple-500/20",
      icon: Palette,
    },
    "Green Energy": {
      gradient: "from-emerald-600/40 via-green-500/20 to-teal-500/10",
      color: "text-emerald-400",
      border: "border-emerald-500/30",
      badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
      icon: Leaf,
    },
    UX: {
      gradient: "from-orange-600/40 via-amber-500/20 to-orange-500/10",
      color: "text-orange-400",
      border: "border-orange-500/30",
      badge: "bg-orange-500/10 text-orange-300 border-orange-500/20",
      icon: Sparkles,
    },
  };

  const style = categoryStyles[project.category];
  const IconComponent = style.icon;

  return (
    <Link href={`/project/${projectId}`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-zinc-800/80 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:shadow-primary/10 cursor-pointer"
      >
        <div
          className={cn(
            "relative aspect-video w-full overflow-hidden bg-gradient-to-br transition-transform duration-500 group-hover:scale-105 flex items-center justify-center",
            style.gradient
          )}
        >
          {project.imageUrl && (
            <Image
              src={project.imageUrl}
              alt={project.title}
              fill
              className="object-cover z-0"
              placeholder="blur"
              blurDataURL={BLUR_DATA_URL}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          )}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 opacity-10 z-0"
          >
            <IconComponent className="h-32 w-32 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </motion.div>

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-slate-950/20 to-transparent z-10" />

          <div className="absolute right-4 top-4 z-10">
            <span
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md inline-flex items-center gap-1.5",
                style.badge
              )}
            >
              <IconComponent className="h-3 w-3" />
              {project.category}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-6">
          <h3 className="line-clamp-1 text-xl font-bold text-white transition-colors group-hover:text-primary">
            {project.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-white/60">
            {project.description}
          </p>

          <div className="mt-8 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-white">
                  ${fundingState.raised.toLocaleString()}
                </span>
                <span className="text-white/40">
                  {Math.round(progress)}% of ${goal.toLocaleString()}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-primary to-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-4 text-sm text-white/40">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>{fundingState.backers} backers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{project.daysLeft}d left</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <SocialStats projectId={projectId} compact />
              <div className="flex items-center gap-2">
                <LikeButton projectId={projectId} compact />
                <ShareButton
                  projectId={projectId}
                  projectTitle={project.title}
                  compact
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
