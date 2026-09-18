import { ButtonHTMLAttributes } from "react";
import { cn } from "@/utils/cn.utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "soft" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export default function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium whitespace-nowrap transition-all duration-150 cursor-pointer select-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-bg-card disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-5 py-3 text-base gap-2.5",
  };

  const variants = {
    primary:
      "bg-brand-600 hover:bg-brand-700 text-text-on-accent shadow-2xs focus-visible:ring-brand-500",
    secondary:
      "bg-bg-card hover:bg-bg-surface text-text-secondary border border-border-default shadow-2xs focus-visible:ring-brand-300",
    soft:
      "bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 focus-visible:ring-brand-300",
    outline:
      "border border-border-default hover:bg-bg-surface text-text-primary focus-visible:ring-brand-400",
    danger:
      "bg-danger-bg hover:bg-red-100 text-danger-text border border-danger-border shadow-2xs focus-visible:ring-danger-text",
    ghost:
      "hover:bg-bg-surface text-text-secondary hover:text-text-primary focus-visible:ring-brand-300",
  };

  return (
    <button
      className={cn(baseStyles, sizeStyles[size], variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
