import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils/cn.utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          ref={ref}
          className={cn(
            "w-full px-3.5 py-2.5 rounded-lg border text-sm bg-bg-card text-text-primary transition-all duration-150 outline-none resize-y min-h-24",
            "border-border-default placeholder:text-text-tertiary focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
            "disabled:opacity-50 disabled:bg-bg-surface disabled:cursor-not-allowed",
            error &&
              "border-danger-border focus:border-danger-text focus:ring-2 focus:ring-danger-bg",
            className,
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs font-medium text-danger-text select-none animate-fade-in">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export default Textarea;
