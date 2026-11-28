"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FiLogOut,
  FiAlertCircle,
  FiInfo,
  FiCheckCircle,
} from "react-icons/fi";
import {
  Modal,
  Input,
  Label,
  Button,
  Select,
  Textarea,
  type SelectOption,
} from "@/components/ui";
import { completeCheckOutSchema } from "@/lib/stay/checkout.schema";
import { completeCheckOutAction } from "@/lib/stay/checkout.actions";
import type {
  PaymentMethod,
  ReceiptType,
  SerializedStay,
} from "@/types/stays";

interface CheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  stay: SerializedStay | null;
  hasOpenCashShift: boolean;
  onSuccess: () => void;
}

const RECEIPT_TYPE_OPTIONS: SelectOption[] = [
  { value: "BOLETA", label: "Boleta de Venta (B001)" },
  { value: "FACTURA", label: "Factura (F001)" },
  { value: "TICKET", label: "Ticket / Nota de Venta (T001)" },
];

const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { value: "CASH", label: "Efectivo" },
  { value: "YAPE", label: "Yape" },
  { value: "PLIN", label: "Plin" },
  { value: "CARD", label: "Tarjeta" },
  { value: "TRANSFER", label: "Transferencia" },
];

const DEPOSIT_RETURN_OPTIONS: SelectOption[] = [
  { value: "RETURNED", label: "Devuelta al huésped (llave/control OK)" },
  { value: "RETAINED", label: "Retenida (por pérdida o daño)" },
];

export default function CheckOutModal({
  isOpen,
  onClose,
  stay,
  hasOpenCashShift,
  onSuccess,
}: CheckOutModalProps) {
  const [receiptType, setReceiptType] = useState<ReceiptType>("BOLETA");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [extraDiscount, setExtraDiscount] = useState("0");
  const [depositAction, setDepositAction] = useState<"RETURNED" | "RETAINED">(
    "RETURNED",
  );
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && stay) {
      setReceiptType(
        stay.primaryGuestDocumentType === "RUC" ? "FACTURA" : "BOLETA",
      );
      setPaymentMethod("CASH");
      setPaymentReference("");
      setExtraDiscount("0");
      setDepositAction("RETURNED");
      setNotes("");
      setErrors({});
      setServerError(null);
    }
  }, [isOpen, stay]);

  if (!stay) return null;

  const numExtraDiscount = Math.max(0, Number(extraDiscount) || 0);
  const grossTotal = stay.totalRoomCost + stay.totalExtraCost;
  const finalDiscount = stay.discount + numExtraDiscount;
  const finalTotal = Math.max(0, grossTotal - finalDiscount);
  const finalPending = Math.max(
    0,
    Math.round((finalTotal - stay.paidAmount + Number.EPSILON) * 100) / 100,
  );
  const needsCashShift = finalPending > 0 && !hasOpenCashShift;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = completeCheckOutSchema.safeParse({
      stayId: stay.id,
      receiptType,
      paymentMethod,
      paymentReference: paymentReference || null,
      extraDiscount: extraDiscount === "" ? 0 : Number(extraDiscount),
      securityDepositReturned: depositAction === "RETURNED",
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

    if (finalDiscount > grossTotal) {
      setErrors({
        extraDiscount: "El descuento supera el total de la cuenta.",
      });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const res = await completeCheckOutAction(parsed.data);
      if (res.success) {
        toast.success(res.message || "Check-Out completado.");
        onSuccess();
        onClose();
      } else {
        if (res.errors) setErrors(res.errors);
        if (res.message) setServerError(res.message);
      }
    } catch (err) {
      console.error(err);
      setServerError("Ocurrió un error inesperado al procesar el Check-Out.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Liquidación y Check-Out — Hab. ${stay.roomNumber}`}
      subtitle={`Estadía ${stay.code} · ${stay.primaryGuestName} (${stay.primaryGuestDocumentType}: ${stay.primaryGuestDocumentNumber})`}
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
            form="checkout-form"
            variant="primary"
            loading={loading}
            disabled={needsCashShift}
          >
            <FiLogOut className="w-4 h-4" />
            <span>
              {finalPending > 0
                ? `Cobrar S/ ${finalPending.toFixed(2)} y Finalizar`
                : "Finalizar Check-Out"}
            </span>
          </Button>
        </div>
      }
    >
      <form
        id="checkout-form"
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4"
      >
        {serverError && (
          <div className="p-3 rounded-xl bg-danger-bg border border-danger-border text-danger-text text-xs font-medium flex items-start gap-2">
            <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Resumen financiero */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-bg-surface border border-border-soft">
            <span className="text-[11px] text-text-secondary">Alojamiento</span>
            <p className="font-mono font-bold text-sm text-text-primary mt-0.5">
              S/ {stay.totalRoomCost.toFixed(2)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-bg-surface border border-border-soft">
            <span className="text-[11px] text-text-secondary">
              Consumos ({stay.extraChargesCount})
            </span>
            <p className="font-mono font-bold text-sm text-text-primary mt-0.5">
              S/ {stay.totalExtraCost.toFixed(2)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-bg-surface border border-border-soft">
            <span className="text-[11px] text-text-secondary">Ya Pagado</span>
            <p className="font-mono font-bold text-sm text-emerald-700 mt-0.5">
              S/ {stay.paidAmount.toFixed(2)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-brand-50 border border-brand-200">
            <span className="text-[11px] font-semibold text-brand-700">
              Saldo a Cobrar
            </span>
            <p className="font-mono font-bold text-sm text-brand-700 mt-0.5">
              S/ {finalPending.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Comprobante formal y Descuento final */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="checkoutReceipt" required>
              Comprobante formal a emitir
            </Label>
            <div className="mt-1">
              <Select
                id="checkoutReceipt"
                value={receiptType}
                onValueChange={(val) => setReceiptType(val as ReceiptType)}
                options={RECEIPT_TYPE_OPTIONS}
                searchable={false}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="extraDiscount">Descuento adicional (S/)</Label>
            <Input
              id="extraDiscount"
              type="number"
              step="0.01"
              min="0"
              value={extraDiscount}
              onChange={(e) => {
                setExtraDiscount(e.target.value);
                if (errors.extraDiscount) {
                  setErrors((p) => ({ ...p, extraDiscount: "" }));
                }
              }}
              error={errors.extraDiscount}
              className="mt-1 font-mono"
            />
          </div>
        </div>

        {/* Pago del saldo pendiente */}
        {finalPending > 0 ? (
          <div className="p-4 rounded-xl bg-bg-surface/70 border border-border-default space-y-3">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Liquidación de Saldo Pendiente (S/ {finalPending.toFixed(2)})
            </h4>

            {!hasOpenCashShift && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <FiInfo className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Debes abrir un <strong>Turno de Caja</strong> para cobrar el
                  saldo pendiente de S/ {finalPending.toFixed(2)}.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <Label htmlFor="checkoutMethod">Método de pago</Label>
                <div className="mt-1">
                  <Select
                    id="checkoutMethod"
                    value={paymentMethod}
                    onValueChange={(val) =>
                      setPaymentMethod(val as PaymentMethod)
                    }
                    options={PAYMENT_METHOD_OPTIONS}
                    searchable={false}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="checkoutRef">N° Operación (opcional)</Label>
                <Input
                  id="checkoutRef"
                  type="text"
                  placeholder="Ej: Yape 789456, POS..."
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <FiCheckCircle className="w-4 h-4 shrink-0" />
            <span>
              La cuenta está totalmente cancelada (saldo S/ 0.00). Solo se
              emitirá el comprobante formal y se liberará la habitación.
            </span>
          </div>
        )}

        {/* Garantía */}
        {stay.securityDeposit > 0 && (
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-amber-900">
                Garantía en custodia (llave / control)
              </span>
              <span className="font-mono font-bold text-amber-900">
                S/ {stay.securityDeposit.toFixed(2)}
              </span>
            </div>
            <Select
              value={depositAction}
              onValueChange={(val) =>
                setDepositAction(val as "RETURNED" | "RETAINED")
              }
              options={DEPOSIT_RETURN_OPTIONS}
              searchable={false}
            />
          </div>
        )}

        {/* Notas */}
        <div>
          <Label htmlFor="checkoutNotes">Observaciones de salida (opcional)</Label>
          <Textarea
            id="checkoutNotes"
            rows={2}
            placeholder="Ej: Habitación revisada sin novedades, llave entregada..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1"
          />
        </div>

        <p className="text-[11px] text-text-tertiary">
          Al confirmar el Check-Out, la estadía pasará a{" "}
          <strong>Finalizada</strong> y la <strong>Hab. {stay.roomNumber}</strong>{" "}
          pasará automáticamente a estado <strong>En Limpieza</strong>.
        </p>
      </form>
    </Modal>
  );
}
