import { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn.utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?:
    | "available"
    | "occupied"
    | "reserved"
    | "cleaning"
    | "maintenance"
    | "brand"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "neutral";
  size?: "sm" | "md";
}

export default function Badge({
  children,
  variant = "brand",
  size = "md",
  className,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center gap-1 font-semibold rounded-full border select-none leading-none";

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
  };

  const variants = {
    available:
      "bg-room-available-bg text-room-available-text border-room-available-border",
    occupied:
      "bg-room-occupied-bg text-room-occupied-text border-room-occupied-border",
    reserved:
      "bg-room-reserved-bg text-room-reserved-text border-room-reserved-border",
    cleaning:
      "bg-room-cleaning-bg text-room-cleaning-text border-room-cleaning-border",
    maintenance:
      "bg-room-maintenance-bg text-room-maintenance-text border-room-maintenance-border",
    brand: "bg-brand-50 text-brand-700 border-brand-200",
    success: "bg-success-bg text-success-text border-success-border",
    danger: "bg-danger-bg text-danger-text border-danger-border",
    warning: "bg-warning-bg text-warning-text border-warning-border",
    info: "bg-info-bg text-info-text border-info-border",
    neutral: "bg-bg-surface text-text-secondary border-border-default",
  };

  return (
    <span
      className={cn(baseStyles, sizeStyles[size], variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
}
