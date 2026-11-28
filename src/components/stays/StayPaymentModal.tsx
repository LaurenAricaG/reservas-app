"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FiDollarSign, FiAlertCircle, FiCheck } from "react-icons/fi";
import {
  Modal,
  Input,
  Label,
  Button,
  Select,
  Textarea,
  type SelectOption,
} from "@/components/ui";
import { registerStayPaymentSchema } from "@/lib/stay/schema";
import { registerStayPaymentAction } from "@/lib/stay/actions";
import type { PaymentMethod, SerializedStay } from "@/types/stays";

interface StayPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  stay: SerializedStay | null;
  hasOpenCashShift: boolean;
  onSuccess: () => void;
}

const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { value: "CASH", label: "Efectivo" },
  { value: "YAPE", label: "Yape" },
  { value: "PLIN", label: "Plin" },
  { value: "CARD", label: "Tarjeta" },
  { value: "TRANSFER", label: "Transferencia" },
];

export default function StayPaymentModal({
  isOpen,
  onClose,
  stay,
  hasOpenCashShift,
  onSuccess,
}: StayPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && stay) {
      setAmount(stay.pendingBalance.toFixed(2));
      setMethod("CASH");
      setReference("");
      setNotes("");
      setErrors({});
      setServerError(null);
    }
  }, [isOpen, stay]);

  if (!stay) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = registerStayPaymentSchema.safeParse({
      stayId: stay.id,
      amount: amount === "" ? 0 : Number(amount),
      method,
      reference: reference || null,
      notes: notes || null,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    if (parsed.data.amount > stay.pendingBalance) {
      setErrors({
        amount: `El monto supera el saldo pendiente (S/ ${stay.pendingBalance.toFixed(2)}).`,
      });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const res = await registerStayPaymentAction(parsed.data);
      if (res.success) {
        toast.success(res.message || "Abono registrado correctamente.");
        onSuccess();
        onClose();
      } else {
        if (res.errors) setErrors(res.errors);
        if (res.message) setServerError(res.message);
      }
    } catch (err) {
      console.error(err);
      setServerError("Ocurrió un error inesperado al registrar el abono.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Registrar Abono — ${stay.code}`}
      subtitle={`Huésped: ${stay.primaryGuestName} · Hab. ${stay.roomNumber}`}
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
            form="stay-payment-form"
            variant="primary"
            loading={loading}
            disabled={!hasOpenCashShift}
          >
            <FiCheck className="w-4 h-4" />
            <span>Registrar Abono</span>
          </Button>
        </div>
      }
    >
      <form
        id="stay-payment-form"
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4"
      >
        {!hasOpenCashShift && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-start gap-2">
            <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              No hay un Turno de Caja abierto. Abre caja en{" "}
              <strong>Turno de Caja</strong> para registrar abonos.
            </span>
          </div>
        )}

        {serverError && (
          <div className="p-3 rounded-xl bg-danger-bg border border-danger-border text-danger-text text-xs font-medium flex items-start gap-2">
            <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-bg-surface border border-border-soft">
            <span className="text-[11px] text-text-secondary">Total Cuenta</span>
            <p className="font-mono font-bold text-sm text-text-primary mt-0.5">
              S/ {stay.totalAmount.toFixed(2)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-bg-surface border border-border-soft">
            <span className="text-[11px] text-text-secondary">Pagado</span>
            <p className="font-mono font-bold text-sm text-emerald-700 mt-0.5">
              S/ {stay.paidAmount.toFixed(2)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-brand-50 border border-brand-200">
            <span className="text-[11px] font-semibold text-brand-700">
              Pendiente
            </span>
            <p className="font-mono font-bold text-sm text-brand-700 mt-0.5">
              S/ {stay.pendingBalance.toFixed(2)}
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="stayPayAmount" required>
            Monto a cobrar (S/)
          </Label>
          <div className="relative mt-1">
            <FiDollarSign className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="stayPayAmount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) setErrors((p) => ({ ...p, amount: "" }));
              }}
              error={errors.amount}
              className="pl-9 font-mono font-bold"
              autoFocus
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="stayPayMethod">Método de pago</Label>
            <div className="mt-1">
              <Select
                id="stayPayMethod"
                value={method}
                onValueChange={(val) => setMethod(val as PaymentMethod)}
                options={PAYMENT_METHOD_OPTIONS}
                searchable={false}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="stayPayRef">N° Operación (opcional)</Label>
            <Input
              id="stayPayRef"
              type="text"
              placeholder="Ej: Yape 123456"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="stayPayNotes">Observación (opcional)</Label>
          <Textarea
            id="stayPayNotes"
            rows={2}
            placeholder="Nota del abono..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1"
          />
        </div>

        <p className="text-[11px] text-text-tertiary">
          Se emitirá una constancia interna de abono. La Boleta o Factura final
          se emite al Check-Out.
        </p>
      </form>
    </Modal>
  );
}
