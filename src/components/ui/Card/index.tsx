import { HTMLAttributes } from "react";
import { cn } from "@/utils/cn.utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "surface";
}

export default function Card({
  children,
  className,
  variant = "default",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-150 shadow-xs",
        variant === "default"
          ? "bg-bg-card border-border-default"
          : "bg-bg-surface border-border-default",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
