"use client";

type SkeletonBlockProps = {
  className?: string;
};

export function SkeletonBlock({ className = "" }: SkeletonBlockProps) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/80 ${className}`.trim()} />;
}
