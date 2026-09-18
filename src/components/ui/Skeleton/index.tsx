import { cn } from "@/utils/cn.utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export default function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-border-default/70",
        className
      )}
      {...props}
    />
  );
}
