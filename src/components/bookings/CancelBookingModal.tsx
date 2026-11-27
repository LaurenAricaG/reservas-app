"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FiAlertCircle, FiXCircle, FiInfo } from "react-icons/fi";
import {
  Modal,
  Input,
  Label,
  Button,
  Select,
  Textarea,
  type SelectOption,
} from "@/components/ui";
import { cancelBookingSchema } from "@/lib/booking/schema";
import { cancelOrNoShowBookingAction } from "@/lib/booking/actions";
import type { PaymentMethod, SerializedBooking } from "@/types/bookings";

interface CancelBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: SerializedBooking | null;
  hasOpenCashShift: boolean;
  onSuccess: () => void;
}

const OUTCOME_OPTIONS: SelectOption[] = [
  {
    value: "CANCELLED",
    label: "Cancelar reserva",
    description: "El cliente avisó o solicitó anular su reserva",
  },
  {
    value: "NO_SHOW",
    label: "No se presentó",
    description: "No llegó en la fecha acordada (retiene adelanto)",
  },
];

const REFUND_POLICY_OPTIONS: SelectOption[] = [
  { value: "NONE", label: "Sin devolución (retiene adelanto)" },
  { value: "REFUND", label: "Con devolución (registrar egreso en caja)" },
];

const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { value: "CASH", label: "Efectivo" },
  { value: "YAPE", label: "Yape" },
  { value: "PLIN", label: "Plin" },
  { value: "CARD", label: "Tarjeta" },
  { value: "TRANSFER", label: "Transferencia" },
];

export default function CancelBookingModal({
  isOpen,
  onClose,
  booking,
  hasOpenCashShift,
  onSuccess,
}: CancelBookingModalProps) {
  const [outcome, setOutcome] = useState<"CANCELLED" | "NO_SHOW">("CANCELLED");
  const [refundMode, setRefundMode] = useState<"NONE" | "REFUND">("NONE");
  const [refundAmount, setRefundAmount] = useState("0");
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>("CASH");
  const [refundReference, setRefundReference] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && booking) {
      setOutcome("CANCELLED");
      setRefundMode("NONE");
      setRefundAmount(booking.depositPaid.toFixed(2));
      setRefundMethod("CASH");
      setRefundReference("");
      setReason("");
      setErrors({});
      setServerError(null);
    }
  }, [isOpen, booking]);

  if (!booking) return null;

  const hasDeposit = booking.depositPaid > 0;
  const isRefunding =
    outcome === "CANCELLED" && hasDeposit && refundMode === "REFUND";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const resolvedRefund = isRefunding
      ? refundAmount === ""
        ? 0
        : Number(refundAmount)
      : 0;

    if (isRefunding && resolvedRefund <= 0) {
      setErrors({
        refundAmount: "Ingresa un monto de devolución mayor a 0.",
      });
      return;
    }

    if (isRefunding && resolvedRefund > booking.depositPaid) {
      setErrors({
        refundAmount: `No puede superar el adelanto pagado (S/ ${booking.depositPaid.toFixed(2)}).`,
      });
      return;
    }

    const parsed = cancelBookingSchema.safeParse({
      bookingId: booking.id,
      outcome,
      refundAmount: resolvedRefund,
      refundMethod,
      refundReference: refundReference || null,
      reason,
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

    setErrors({});
    setLoading(true);
    try {
      const res = await cancelOrNoShowBookingAction(parsed.data);
      if (res.success) {
        toast.success(res.message);
        onSuccess();
        onClose();
      } else {
        if (res.errors) setErrors(res.errors);
        if (res.message) setServerError(res.message);
      }
    } catch (err) {
      console.error(err);
      setServerError("Ocurrió un error inesperado al procesar la cancelación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cancelar / Cerrar Reserva ${booking.code}`}
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
            Volver
          </Button>
          <Button
            type="submit"
            form="cancel-booking-form"
            variant="danger"
            loading={loading}
            disabled={isRefunding && !hasOpenCashShift}
          >
            <FiXCircle className="w-4 h-4" />
            <span>
              {outcome === "NO_SHOW"
                ? "Marcar como No se presentó"
                : "Confirmar Cancelación"}
            </span>
          </Button>
        </div>
      }
    >
      <form
        id="cancel-booking-form"
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

        {/* Resumen del adelanto */}
        <div className="p-3.5 rounded-xl bg-bg-surface border border-border-soft flex items-center justify-between text-xs">
          <span className="text-text-secondary">
            Adelanto registrado en esta reserva
          </span>
          <span className="font-mono font-bold text-sm text-text-primary">
            S/ {booking.depositPaid.toFixed(2)}
          </span>
        </div>

        {/* Tipo de cierre */}
        <div>
          <Label htmlFor="cancelOutcome" required>
            Acción a registrar
          </Label>
          <div className="mt-1">
            <Select
              id="cancelOutcome"
              value={outcome}
              onValueChange={(val) => {
                setOutcome(val as "CANCELLED" | "NO_SHOW");
                if (val === "NO_SHOW") setRefundMode("NONE");
              }}
              options={OUTCOME_OPTIONS}
              searchable={false}
            />
          </div>
          {outcome === "NO_SHOW" && hasDeposit && (
            <p className="text-[11px] text-text-tertiary mt-1">
              Al no presentarse el cliente, el adelanto de S/{" "}
              {booking.depositPaid.toFixed(2)} queda retenido en caja y la
              habitación se libera.
            </p>
          )}
        </div>

        {/* Manejo de devolución si hay adelanto y es cancelación */}
        {outcome === "CANCELLED" && hasDeposit && (
          <div className="p-3.5 rounded-xl bg-bg-surface/70 border border-border-default space-y-3">
            <div>
              <Label htmlFor="refundMode">Política sobre el adelanto</Label>
              <div className="mt-1">
                <Select
                  id="refundMode"
                  value={refundMode}
                  onValueChange={(val) =>
                    setRefundMode(val as "NONE" | "REFUND")
                  }
                  options={REFUND_POLICY_OPTIONS}
                  searchable={false}
                />
              </div>
            </div>

            {isRefunding && (
              <>
                {!hasOpenCashShift && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                    <FiInfo className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Debes tener un <strong>Turno de Caja abierto</strong> para
                      registrar la devolución y descontarla del arqueo.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="refundAmount" required>
                      Monto a devolver (S/)
                    </Label>
                    <Input
                      id="refundAmount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={booking.depositPaid}
                      value={refundAmount}
                      onChange={(e) => {
                        setRefundAmount(e.target.value);
                        if (errors.refundAmount) {
                          setErrors((p) => ({ ...p, refundAmount: "" }));
                        }
                      }}
                      error={errors.refundAmount}
                      className="mt-1 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <Label htmlFor="refundMethod">Método de devolución</Label>
                    <div className="mt-1">
                      <Select
                        id="refundMethod"
                        value={refundMethod}
                        onValueChange={(val) =>
                          setRefundMethod(val as PaymentMethod)
                        }
                        options={PAYMENT_METHOD_OPTIONS}
                        searchable={false}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="refundReference">
                    N° Operación de devolución (opcional)
                  </Label>
                  <Input
                    id="refundReference"
                    type="text"
                    placeholder="Ej: Yape devuelto, transferencia..."
                    value={refundReference}
                    onChange={(e) => setRefundReference(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Motivo obligatorio */}
        <div>
          <Label htmlFor="cancelReason" required>
            Motivo
          </Label>
          <Textarea
            id="cancelReason"
            rows={3}
            placeholder={
              outcome === "NO_SHOW"
                ? "Ej: El huésped no se presentó pasada la hora límite de llegada..."
                : "Ej: Cliente solicitó cancelación con 24h de anticipación..."
            }
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (errors.reason) setErrors((p) => ({ ...p, reason: "" }));
            }}
            error={errors.reason}
            className="mt-1"
          />
        </div>
      </form>
    </Modal>
  );
}
