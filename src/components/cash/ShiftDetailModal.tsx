"use client";

import { FiClock, FiUser, FiCreditCard, FiFileText } from "react-icons/fi";
import { Modal, Button, Badge } from "@/components/ui";
import type { SerializedCashShift, PaymentMethod } from "@/types/cash";

interface ShiftDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: SerializedCashShift | null;
  isLoading?: boolean;
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  YAPE: "Yape",
  PLIN: "Plin",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

function formatDateTime(iso: string | null) {
  if (!iso) return "En curso";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function ShiftDetailModal({
  isOpen,
  onClose,
  shift,
  isLoading = false,
}: ShiftDetailModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={shift ? `Detalle del Turno #${shift.id}` : "Detalle del Turno"}
      subtitle={
        shift
          ? `Responsable: ${shift.userName} (@${shift.userUsername})`
          : "Cargando información del turno..."
      }
      size="xl"
      footer={
        <div className="flex justify-end w-full">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      }
    >
      {isLoading || !shift ? (
        <div className="py-12 text-center text-xs text-text-secondary">
          Cargando detalle de movimientos...
        </div>
      ) : (
        <div className="space-y-5">
          {/* Meta superior */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-bg-surface border border-border-soft">
            <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <FiUser className="w-3.5 h-3.5 text-brand-600" />
                <strong className="text-text-primary">{shift.userName}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiClock className="w-3.5 h-3.5 text-text-tertiary" />
                Apertura: <strong className="text-text-primary">{formatDateTime(shift.openedAt)}</strong>
              </span>
              {shift.closedAt && (
                <span className="inline-flex items-center gap-1.5">
                  <FiClock className="w-3.5 h-3.5 text-text-tertiary" />
                  Cierre: <strong className="text-text-primary">{formatDateTime(shift.closedAt)}</strong>
                </span>
              )}
            </div>
            <Badge variant={shift.status === "OPEN" ? "available" : "neutral"}>
              {shift.status === "OPEN" ? "● Abierto" : "● Cerrado"}
            </Badge>
          </div>

          {/* Resumen de Arqueo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-bg-card border border-border-default">
              <span className="text-[11px] text-text-secondary">Saldo Inicial</span>
              <p className="font-mono font-bold text-sm text-text-primary mt-0.5">
                S/ {shift.initialCash.toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-bg-card border border-border-default">
              <span className="text-[11px] text-text-secondary">Efectivo Esperado</span>
              <p className="font-mono font-bold text-sm text-brand-700 mt-0.5">
                S/ {(shift.expectedCash ?? shift.initialCash + shift.cashCollected).toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-bg-card border border-border-default">
              <span className="text-[11px] text-text-secondary">Efectivo Contado</span>
              <p className="font-mono font-bold text-sm text-text-primary mt-0.5">
                {shift.actualCash !== null ? `S/ ${shift.actualCash.toFixed(2)}` : "—"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-bg-card border border-border-default">
              <span className="text-[11px] text-text-secondary">Diferencia</span>
              <p
                className={`font-mono font-bold text-sm mt-0.5 ${
                  shift.difference === null
                    ? "text-text-tertiary"
                    : shift.difference === 0
                      ? "text-emerald-700"
                      : shift.difference > 0
                        ? "text-amber-700"
                        : "text-rose-700"
                }`}
              >
                {shift.difference === null
                  ? "—"
                  : `${shift.difference > 0 ? "+" : ""}S/ ${shift.difference.toFixed(2)}`}
              </p>
            </div>
          </div>

          {/* Desglose por método */}
          <div>
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FiCreditCard className="w-3.5 h-3.5 text-brand-600" />
              <span>Desglose de Recaudación (Total: S/ {shift.totalCollected.toFixed(2)})</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((method) => (
                <div
                  key={method}
                  className="p-2.5 rounded-xl bg-bg-surface border border-border-soft flex flex-col"
                >
                  <span className="text-[11px] text-text-secondary">
                    {METHOD_LABEL[method]}
                  </span>
                  <span className="font-mono font-bold text-text-primary mt-0.5">
                    S/ {shift.breakdown[method].toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notas */}
          {shift.notes && (
            <div className="p-3 rounded-xl bg-bg-surface/60 border border-border-soft text-xs">
              <span className="font-semibold text-text-primary flex items-center gap-1.5 mb-1">
                <FiFileText className="w-3.5 h-3.5 text-text-tertiary" />
                Observaciones
              </span>
              <p className="text-text-secondary whitespace-pre-line">{shift.notes}</p>
            </div>
          )}

          {/* Lista de pagos del turno */}
          <div>
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2">
              Pagos Registrados ({shift.payments?.length ?? 0})
            </h4>

            {!shift.payments || shift.payments.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-border-default text-xs text-text-tertiary">
                No se registraron cobros en este turno.
              </div>
            ) : (
              <div className="border border-border-default rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-bg-surface border-b border-border-default sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase text-text-secondary">
                        Hora
                      </th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase text-text-secondary">
                        Origen / Cliente
                      </th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase text-text-secondary">
                        Método
                      </th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase text-text-secondary">
                        Comprobante
                      </th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase text-text-secondary text-right">
                        Monto
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {shift.payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-brand-50/30">
                        <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
                          {new Intl.DateTimeFormat("es-PE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(payment.createdAt))}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-text-primary">
                            {payment.guestName || "Pago en recepción"}
                          </div>
                          <div className="text-[11px] text-text-tertiary">
                            {payment.stayCode
                              ? `Estadía ${payment.stayCode}`
                              : payment.bookingCode
                                ? `Reserva ${payment.bookingCode}`
                                : payment.notes || "Sin referencia"}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-md bg-bg-surface border border-border-default font-medium text-text-secondary">
                            {METHOD_LABEL[payment.method]}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-text-secondary">
                          {payment.receiptNumber || payment.receiptType}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-text-primary whitespace-nowrap">
                          S/ {payment.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
