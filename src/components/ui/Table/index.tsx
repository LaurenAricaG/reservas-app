import React from "react";
import { cn } from "@/utils/cn.utils";

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerClassName, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          "overflow-x-auto w-full outline-none",
          containerClassName,
        )}
      >
        <table
          ref={ref}
          className={cn(
            "w-full min-w-max text-left border-collapse",
            className,
          )}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  },
);
Table.displayName = "Table";

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => {
  return (
    <thead
      ref={ref}
      className={cn(
        "bg-bg-surface select-none border-b border-border-default",
        className,
      )}
      {...props}
    >
      {children}
    </thead>
  );
});
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => {
  return (
    <tbody
      ref={ref}
      className={cn("divide-y divide-border-soft", className)}
      {...props}
    >
      {children}
    </tbody>
  );
});
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, children, ...props }, ref) => {
  return (
    <tr
      ref={ref}
      className={cn(
        "border-b border-border-soft last:border-0 hover:bg-brand-50/40 in-[thead]:hover:bg-transparent transition-colors group",
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
});
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, children, ...props }, ref) => {
  return (
    <th
      ref={ref}
      className={cn(
        "px-4 py-3 text-[10px] font-semibold text-text-secondary uppercase tracking-wider",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
});
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, children, ...props }, ref) => {
  return (
    <td
      ref={ref}
      className={cn(
        "px-4 py-3 text-xs text-text-primary align-middle",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
});
TableCell.displayName = "TableCell";
