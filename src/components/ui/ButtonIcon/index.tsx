import React from "react";
import Link from "next/link";
import { cn } from "@/utils/cn.utils";

export type ButtonIconVariant =
  | "brand"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info";

interface ButtonIconProps {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  variant?: ButtonIconVariant;
  href?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  title?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  target?: string;
  rel?: string;
}

const variantStyles: Record<ButtonIconVariant, string> = {
  brand:
    "border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 hover:border-brand-300 focus-visible:ring-brand-400/40",
  secondary:
    "border-border-default bg-bg-card hover:bg-bg-surface text-text-secondary hover:text-text-primary focus-visible:ring-border-strong",
  success:
    "bg-success-bg border-success-border text-success-text hover:brightness-95 focus-visible:ring-success-border",
  warning:
    "bg-warning-bg border-warning-border text-warning-text hover:brightness-95 focus-visible:ring-warning-border",
  danger:
    "bg-danger-bg border-danger-border text-danger-text hover:brightness-95 focus-visible:ring-danger-border",
  info: "bg-info-bg border-info-border text-info-text hover:brightness-95 focus-visible:ring-info-border",
};

export default function ButtonIcon({
  icon: Icon,
  iconClassName,
  variant = "brand",
  href,
  onClick,
  title,
  className,
  disabled = false,
  loading = false,
  target,
  rel,
}: ButtonIconProps) {
  const commonClasses = cn(
    "p-2 rounded-xl border hover:scale-[1.04] active:scale-[0.96] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2",
    variantStyles[variant],
    className,
  );

  const iconElement = (
    <Icon
      className={cn("w-3.5 h-3.5", loading && "animate-spin", iconClassName)}
    />
  );

  if (href) {
    // If it's a Link, cast the onClick to the Anchor event handler
    const anchorOnClick = onClick as
      | React.MouseEventHandler<HTMLAnchorElement>
      | undefined;

    return (
      <Link
        href={href}
        className={commonClasses}
        onClick={anchorOnClick}
        title={title}
        aria-label={title}
        target={target}
        rel={target === "_blank" && !rel ? "noopener noreferrer" : rel}
      >
        {iconElement}
      </Link>
    );
  }

  // Otherwise it's a standard button
  const buttonOnClick = onClick as
    | React.MouseEventHandler<HTMLButtonElement>
    | undefined;

  return (
    <button
      type="button"
      onClick={buttonOnClick}
      disabled={disabled || loading}
      className={commonClasses}
      title={title}
      aria-label={title}
    >
      {iconElement}
    </button>
  );
}
