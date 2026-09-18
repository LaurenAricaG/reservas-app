import { LabelHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn.utils";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  required?: boolean;
}

export default function Label({ children, required, className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5 select-none",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-danger-text ml-1" title="Campo requerido">*</span>}
    </label>
  );
}
