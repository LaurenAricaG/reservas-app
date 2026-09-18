"use client";

import { useEffect, useRef, ReactNode } from "react";
import { FiX } from "react-icons/fi";
import { cn } from "@/utils/cn.utils";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  className,
  headerClassName,
  bodyClassName,
  footerClassName,
  initialFocusRef,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Bloquear scroll de la página cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Tecla Escape y trampa de foco (Tab)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusableElements =
          modalRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
          );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Foco inicial y restauración
  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      const timer = setTimeout(() => {
        (initialFocusRef?.current ?? closeButtonRef.current)?.focus();
      }, 0);
      return () => clearTimeout(timer);
    } else {
      previouslyFocusedElement.current?.focus();
    }
  }, [isOpen, initialFocusRef]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop suave */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Tarjeta del Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className={cn(
          "relative w-full bg-bg-card border border-border-default rounded-2xl shadow-lg z-10 flex flex-col max-h-[90vh] transition-all duration-200 animate-in fade-in zoom-in-95 outline-none overflow-hidden",
          sizes[size],
          className,
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between px-6 py-4 border-b border-border-default select-none",
            headerClassName,
          )}
        >
          <div>
            {title && (
              <h3 id="modal-title" className="text-base font-bold text-text-primary">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-bg-surface text-text-tertiary hover:text-text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            aria-label="Cerrar ventana"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div
          className={cn(
            "p-6 overflow-y-auto min-h-0 flex-1 text-sm text-text-secondary leading-relaxed outline-none",
            bodyClassName,
          )}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={cn(
              "flex items-center justify-end gap-3 px-6 py-4 border-t border-border-default bg-bg-surface/30 shrink-0",
              footerClassName,
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
