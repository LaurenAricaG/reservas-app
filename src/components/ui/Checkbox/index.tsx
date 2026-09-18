import { InputHTMLAttributes, forwardRef, ReactNode } from "react";
import { cn } from "@/utils/cn.utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  subLabel?: ReactNode;
  error?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, subLabel, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <label className="flex items-start gap-3 cursor-pointer select-none group">
          <div className="relative flex items-center mt-0.5">
            <input
              ref={ref}
              type="checkbox"
              className="peer sr-only"
              {...props}
            />
            <div
              className={cn(
                "w-4.5 h-4.5 rounded-md border border-border-strong bg-bg-card flex items-center justify-center transition-all duration-150",
                "peer-checked:bg-brand-600 peer-checked:border-brand-600 peer-checked:shadow-2xs",
                "peer-checked:[&_svg]:scale-100",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-focus-visible:ring-offset-2 ring-offset-bg-card",
                "peer-disabled:opacity-50 peer-disabled:cursor-not-allowed",
                error && "border-danger-border peer-focus-visible:ring-danger-text/20",
                "group-hover:border-brand-500 peer-checked:group-hover:border-brand-700",
              )}
            >
              <svg
                className="w-3 h-3 text-white scale-0 transition-transform duration-150"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          {(label || subLabel) && (
            <div className="flex flex-col select-none">
              {label && (
                <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors leading-tight">
                  {label}
                </span>
              )}
              {subLabel && (
                <span className="text-[11px] text-text-tertiary mt-0.5 leading-normal">
                  {subLabel}
                </span>
              )}
            </div>
          )}
        </label>
        {error && (
          <p className="mt-1 text-xs font-medium text-danger-text select-none animate-fade-in">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
