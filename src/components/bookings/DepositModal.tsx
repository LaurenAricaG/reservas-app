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
import { registerBookingDepositSchema } from "@/lib/booking/schema";
import { registerBookingDepositAction } from "@/lib/booking/actions";
import type { PaymentMethod, SerializedBooking } from "@/types/bookings";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: SerializedBooking | null;
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

export default function DepositModal({
  isOpen,
  onClose,
  booking,
  hasOpenCashShift,
  onSuccess,
}: DepositModalProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && booking) {
      setAmount(booking.pendingBalance.toFixed(2));
      setMethod("CASH");
      setReference("");
      setNotes("");
      setErrors({});
      setServerError(null);
    }
  }, [isOpen, booking]);

  if (!booking) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = registerBookingDepositSchema.safeParse({
      bookingId: booking.id,
      amount: amount === "" ? 0 : Number(amount),
      method,
      receiptType: "TICKET",
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

    if (parsed.data.amount > booking.pendingBalance) {
      setErrors({
        amount: `El monto supera el saldo pendiente (S/ ${booking.pendingBalance.toFixed(2)}).`,
      });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const res = await registerBookingDepositAction(parsed.data);
      if (res.success) {
        toast.success(res.message || "Adelanto registrado correctamente.");
        onSuccess();
        onClose();
      } else {
        if (res.errors) setErrors(res.errors);
        if (res.message) setServerError(res.message);
      }
    } catch (err) {
      console.error(err);
      setServerError("Ocurrió un error inesperado al registrar el adelanto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Registrar Adelanto — ${booking.code}`}
      subtitle={`Huésped: ${booking.guestFullName} · Hab. ${booking.roomNumber}`}
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
            form="deposit-form"
            variant="primary"
            loading={loading}
            disabled={!hasOpenCashShift}
          >
            <FiCheck className="w-4 h-4" />
            <span>Registrar Pago</span>
          </Button>
        </div>
      }
    >
      <form id="deposit-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        {!hasOpenCashShift && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-start gap-2">
            <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              No hay un Turno de Caja abierto. Abre caja en{" "}
              <strong>Turno de Caja</strong> para poder recibir adelantos.
            </span>
          </div>
        )}

        {serverError && (
          <div className="p-3 rounded-xl bg-danger-bg border border-danger-border text-danger-text text-xs font-medium flex items-start gap-2">
            <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Resumen financiero */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-bg-surface border border-border-soft">
            <span className="text-[11px] text-text-secondary">Total</span>
            <p className="font-mono font-bold text-sm text-text-primary mt-0.5">
              S/ {booking.totalPrice.toFixed(2)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-bg-surface border border-border-soft">
            <span className="text-[11px] text-text-secondary">Pagado</span>
            <p className="font-mono font-bold text-sm text-emerald-700 mt-0.5">
              S/ {booking.depositPaid.toFixed(2)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-brand-50 border border-brand-200">
            <span className="text-[11px] font-semibold text-brand-700">
              Pendiente
            </span>
            <p className="font-mono font-bold text-sm text-brand-700 mt-0.5">
              S/ {booking.pendingBalance.toFixed(2)}
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="depositAmount" required>
            Monto a cobrar (S/)
          </Label>
          <div className="relative mt-1">
            <FiDollarSign className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="depositAmount"
              type="number"
              step="0.01"
              min="0.01"
              max={booking.pendingBalance}
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
            <Label htmlFor="depositMethod">Método de pago</Label>
            <div className="mt-1">
              <Select
                id="depositMethod"
                value={method}
                onValueChange={(val) => setMethod(val as PaymentMethod)}
                options={PAYMENT_METHOD_OPTIONS}
                searchable={false}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="depositReference">N° Operación (opcional)</Label>
            <Input
              id="depositReference"
              type="text"
              placeholder="Ej: Yape 987654"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <p className="text-[11px] text-text-tertiary">
          Se emitirá automáticamente una constancia interna de adelanto. La
          Boleta o Factura se emite al finalizar la estadía.
        </p>

        <div>
          <Label htmlFor="depositNotes">Observación (opcional)</Label>
          <Textarea
            id="depositNotes"
            rows={2}
            placeholder="Nota del pago..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1"
          />
        </div>
      </form>
    </Modal>
  );
}
