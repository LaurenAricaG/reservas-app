"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FiLock,
  FiAlertCircle,
  FiCheckCircle,
  FiAlertTriangle,
  FiDollarSign,
} from "react-icons/fi";
import { Modal, Input, Label, Button, Textarea } from "@/components/ui";
import { closeCashShiftSchema } from "@/lib/cash/schema";
import { closeCashShiftAction } from "@/lib/cash/actions";
import type { SerializedCashShift } from "@/types/cash";

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: SerializedCashShift | null;
  onSuccess: () => void;
}

export default function CloseShiftModal({
  isOpen,
  onClose,
  shift,
  onSuccess,
}: CloseShiftModalProps) {
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const expectedCash = shift
    ? Math.round((shift.initialCash + shift.cashCollected + Number.EPSILON) * 100) /
      100
    : 0;

  useEffect(() => {
    if (isOpen && shift) {
      setActualCash(expectedCash.toFixed(2));
      setNotes("");
      setErrors({});
      setServerError(null);
    }
  }, [isOpen, shift, expectedCash]);

  if (!shift) return null;

  const parsedActual = actualCash === "" ? NaN : Number(actualCash);
  const hasValidActual = !Number.isNaN(parsedActual) && parsedActual >= 0;
  const difference = hasValidActual
    ? Math.round((parsedActual - expectedCash + Number.EPSILON) * 100) / 100
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = closeCashShiftSchema.safeParse({
      shiftId: shift.id,
      actualCash: actualCash === "" ? undefined : Number(actualCash),
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
      const res = await closeCashShiftAction(parsed.data);

      if (res.success) {
        toast.success(res.message || "Turno cerrado correctamente.");
        onSuccess();
        onClose();
      } else {
        if (res.errors) setErrors(res.errors);
        if (res.message) setServerError(res.message);
      }
    } catch (error) {
      console.error("Error al cerrar turno:", error);
      setServerError("Ocurrió un error inesperado al cerrar el turno.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Arqueo y Cierre — Turno #${shift.id}`}
      subtitle={`Responsable: ${shift.userName}. Verifica el efectivo físico antes de cerrar el turno.`}
      size="lg"
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
            form="close-shift-form"
            variant="danger"
            loading={loading}
          >
            <FiLock className="w-4 h-4" />
            <span>Confirmar Cierre de Caja</span>
          </Button>
        </div>
      }
    >
      <form id="close-shift-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        {serverError && (
          <div className="p-3 rounded-xl bg-danger-bg border border-danger-border text-danger-text text-xs font-medium flex items-start gap-2">
            <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Resumen del Sistema */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-bg-surface border border-border-default">
            <span className="text-[11px] font-medium text-text-secondary">
              Saldo Inicial
            </span>
            <p className="font-mono font-bold text-base text-text-primary mt-0.5">
              S/ {shift.initialCash.toFixed(2)}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-bg-surface border border-border-default">
            <span className="text-[11px] font-medium text-text-secondary">
              Cobros en Efectivo
            </span>
            <p className="font-mono font-bold text-base text-emerald-700 mt-0.5">
              + S/ {shift.cashCollected.toFixed(2)}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-brand-50 border border-brand-200">
            <span className="text-[11px] font-semibold text-brand-700">
              Efectivo Esperado
            </span>
            <p className="font-mono font-bold text-base text-brand-700 mt-0.5">
              S/ {expectedCash.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Cobros Digitales Informativos */}
        <div className="p-3.5 rounded-xl bg-bg-surface/60 border border-border-soft">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-primary">
              Cobros Digitales / Bancarios (no ingresan al cajón físico)
            </span>
            <span className="font-mono text-xs font-bold text-text-primary">
              S/ {shift.digitalCollected.toFixed(2)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="px-2.5 py-1.5 rounded-lg bg-bg-card border border-border-soft flex items-center justify-between">
              <span className="text-text-secondary">Yape</span>
              <span className="font-mono font-semibold text-text-primary">
                S/ {shift.breakdown.YAPE.toFixed(2)}
              </span>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-bg-card border border-border-soft flex items-center justify-between">
              <span className="text-text-secondary">Plin</span>
              <span className="font-mono font-semibold text-text-primary">
                S/ {shift.breakdown.PLIN.toFixed(2)}
              </span>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-bg-card border border-border-soft flex items-center justify-between">
              <span className="text-text-secondary">Tarjeta</span>
              <span className="font-mono font-semibold text-text-primary">
                S/ {shift.breakdown.CARD.toFixed(2)}
              </span>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg bg-bg-card border border-border-soft flex items-center justify-between">
              <span className="text-text-secondary">Transf.</span>
              <span className="font-mono font-semibold text-text-primary">
                S/ {shift.breakdown.TRANSFER.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Conteo Físico */}
        <div>
          <Label htmlFor="actualCash" required>
            Efectivo contado físicamente en caja (S/)
          </Label>
          <div className="relative mt-1">
            <FiDollarSign className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="actualCash"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={actualCash}
              onChange={(e) => {
                setActualCash(e.target.value);
                if (errors.actualCash) {
                  setErrors((prev) => ({ ...prev, actualCash: "" }));
                }
              }}
              error={errors.actualCash}
              className="pl-9 font-mono font-bold text-base"
              autoFocus
            />
          </div>
        </div>

        {/* Resultado del Arqueo en tiempo real */}
        {hasValidActual && (
          <div
            className={
              difference === 0
                ? "p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between"
                : difference > 0
                  ? "p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between"
                  : "p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between"
            }
          >
            <div className="flex items-center gap-2 text-xs font-semibold">
              {difference === 0 ? (
                <>
                  <FiCheckCircle className="w-4 h-4 shrink-0" />
                  <span>Caja cuadrada — sin diferencias</span>
                </>
              ) : difference > 0 ? (
                <>
                  <FiAlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Sobrante en efectivo</span>
                </>
              ) : (
                <>
                  <FiAlertCircle className="w-4 h-4 shrink-0" />
                  <span>Faltante en efectivo</span>
                </>
              )}
            </div>
            <span className="font-mono font-bold text-sm">
              {difference > 0 ? "+" : ""}S/ {difference.toFixed(2)}
            </span>
          </div>
        )}

        {/* Notas de cierre */}
        <div>
          <Label htmlFor="closeNotes">Observaciones de cierre (opcional)</Label>
          <Textarea
            id="closeNotes"
            rows={3}
            placeholder="Ej: Se deja S/ 100.00 de sencillo para el siguiente turno, diferencia por vuelto..."
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
