"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
} from "react-icons/fi";
import { cn } from "@/utils/cn.utils";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange?: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
}: PaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-between py-3 px-4 text-xs text-text-secondary select-none">
        <span>
          Mostrando 1 - {totalItems} de {totalItems} resultados
        </span>
      </div>
    );
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) {
        pages.push("...");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const handlePageClick = (
    e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>,
    page: number,
  ) => {
    if (onPageChange) {
      e.preventDefault();
      onPageChange(page);
    }
  };

  const btnClass = cn(
    "flex items-center justify-center w-8 h-8 rounded-lg border select-none text-xs font-semibold transition-all duration-150 cursor-pointer",
    "border-border-default bg-bg-card text-text-secondary",
    "hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
  );

  const renderButton = (
    page: number,
    content: React.ReactNode,
    label: string,
    disabled: boolean,
  ) => {
    const isActive = page === currentPage;

    if (isActive) {
      return (
        <button
          type="button"
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg border select-none text-xs font-bold transition-all duration-150 cursor-default",
            "bg-brand-600 border-brand-600 text-white shadow-2xs",
          )}
          aria-current="page"
          aria-label={label}
        >
          {content}
        </button>
      );
    }

    if (disabled) {
      return (
        <button
          type="button"
          disabled
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg border select-none text-xs font-semibold transition-all duration-150",
            "border-border-default/40 bg-bg-surface/50 text-text-tertiary/40 cursor-not-allowed",
          )}
          aria-label={label}
        >
          {content}
        </button>
      );
    }

    if (onPageChange) {
      return (
        <button
          type="button"
          onClick={(e) => handlePageClick(e, page)}
          className={btnClass}
          aria-label={label}
        >
          {content}
        </button>
      );
    }

    return (
      <Link href={createPageURL(page)} className={btnClass} aria-label={label}>
        {content}
      </Link>
    );
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 border-t border-border-default w-full">
      <div className="text-xs text-text-secondary select-none">
        Mostrando{" "}
        <span className="font-semibold text-text-primary">{startItem}</span> a{" "}
        <span className="font-semibold text-text-primary">{endItem}</span> de{" "}
        <span className="font-semibold text-text-primary">{totalItems}</span>{" "}
        resultados
      </div>

      <nav className="flex items-center gap-1" aria-label="Paginación">
        {renderButton(
          1,
          <FiChevronsLeft className="w-3.5 h-3.5" />,
          "Primera página",
          currentPage === 1,
        )}
        {renderButton(
          currentPage - 1,
          <FiChevronLeft className="w-3.5 h-3.5" />,
          "Página anterior",
          currentPage === 1,
        )}

        {pageNumbers.map((page, index) => {
          if (page === "...") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="flex items-center justify-center w-8 h-8 text-text-tertiary select-none text-xs font-medium"
              >
                ...
              </span>
            );
          }

          const pageNum = page as number;
          return (
            <span key={`page-${pageNum}`}>
              {renderButton(
                pageNum,
                pageNum.toString(),
                `Ir a página ${pageNum}`,
                false,
              )}
            </span>
          );
        })}

        {renderButton(
          currentPage + 1,
          <FiChevronRight className="w-3.5 h-3.5" />,
          "Página siguiente",
          currentPage === totalPages,
        )}
        {renderButton(
          totalPages,
          <FiChevronsRight className="w-3.5 h-3.5" />,
          "Última página",
          currentPage === totalPages,
        )}
      </nav>
    </div>
  );
}
