"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FiDollarSign, FiAlertCircle, FiUnlock } from "react-icons/fi";
import { Modal, Input, Label, Button, Textarea } from "@/components/ui";
import { openCashShiftSchema } from "@/lib/cash/schema";
import { openCashShiftAction } from "@/lib/cash/actions";

interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OpenShiftModal({
  isOpen,
  onClose,
  onSuccess,
}: OpenShiftModalProps) {
  const [initialCash, setInitialCash] = useState("0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInitialCash("0");
      setNotes("");
      setErrors({});
      setServerError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = openCashShiftSchema.safeParse({
      initialCash: initialCash === "" ? undefined : Number(initialCash),
      notes: notes || null,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !nextErrors[field]) {
          nextErrors[field] = issue.message;
        }
      });
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const res = await openCashShiftAction(parsed.data);

      if (res.success) {
        toast.success(res.message || "Turno de caja abierto exitosamente.");
        onSuccess();
        onClose();
      } else {
        if (res.errors) setErrors(res.errors);
        if (res.message) setServerError(res.message);
      }
    } catch (error) {
      console.error("Error al abrir turno:", error);
      setServerError("Ocurrió un error inesperado al abrir el turno.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Abrir Turno de Caja"
      subtitle="Declara el fondo inicial en efectivo disponible en recepción para comenzar a registrar cobros."
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="open-shift-form"
            variant="primary"
            loading={loading}
          >
            <FiUnlock className="w-4 h-4" />
            <span>Abrir Turno</span>
          </Button>
        </div>
      }
    >
      <form id="open-shift-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {serverError && (
          <div className="p-3 rounded-xl bg-danger-bg border border-danger-border text-danger-text text-xs font-medium flex items-start gap-2">
            <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <div>
          <Label htmlFor="initialCash" required>
            Saldo inicial en efectivo (S/)
          </Label>
          <div className="relative mt-1">
            <FiDollarSign className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="initialCash"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={initialCash}
              onChange={(e) => {
                setInitialCash(e.target.value);
                if (errors.initialCash) {
                  setErrors((prev) => ({ ...prev, initialCash: "" }));
                }
              }}
              error={errors.initialCash}
              className="pl-9 font-mono font-semibold"
              autoFocus
            />
          </div>
          <p className="text-[11px] text-text-tertiary mt-1">
            Monto físico en billetes y monedas con el que inicia el cajón (fondo de sencillo).
          </p>
        </div>

        <div>
          <Label htmlFor="openNotes">Observaciones de apertura (opcional)</Label>
          <Textarea
            id="openNotes"
            rows={3}
            placeholder="Ej: Turno mañana, sencillo entregado por turno noche..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            error={errors.notes}
            className="mt-1"
          />
        </div>
      </form>
    </Modal>
  );
}
