import { ReactNode, InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils/cn.utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: ReactNode;
  endIcon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, icon, endIcon, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-text-tertiary select-none pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            className={cn(
              "w-full px-3.5 py-2 text-sm bg-bg-card border border-border-default rounded-lg text-text-primary transition-all duration-150 outline-none",
              "placeholder:text-text-tertiary focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
              "disabled:opacity-50 disabled:bg-bg-surface disabled:cursor-not-allowed",
              icon && "pl-10",
              endIcon && "pr-10",
              error &&
                "border-danger-border focus:border-danger-text focus:ring-2 focus:ring-danger-bg",
              className,
            )}
            {...props}
          />
          {endIcon && (
            <div className="absolute right-3.5 text-text-tertiary flex items-center justify-center">
              {endIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-xs font-medium text-danger-text select-none animate-fade-in">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
