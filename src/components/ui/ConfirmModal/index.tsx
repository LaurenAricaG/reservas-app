"use client";

import Modal from "../Modal";
import Button from "../Button";
import { cn } from "@/utils/cn.utils";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info" | "success" | "primary";
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  const buttonVariantMap = {
    danger: "danger" as const,
    warning: "soft" as const,
    info: "soft" as const,
    success: "primary" as const,
    primary: "primary" as const,
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={buttonVariantMap[variant]}
            size="md"
            onClick={onConfirm}
            loading={isLoading}
            disabled={isLoading}
            className="shadow-2xs font-semibold"
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-text-secondary text-xs sm:text-sm leading-relaxed whitespace-pre-line">
        {description}
      </p>
    </Modal>
  );
}
