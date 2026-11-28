"use client";

import { FiUser, FiHome, FiShoppingBag, FiCreditCard } from "react-icons/fi";
import { Modal, Button, Badge } from "@/components/ui";
import type {
  PaymentMethod,
  SerializedStay,
  StayStatus,
} from "@/types/stays";

interface StayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  stay: SerializedStay | null;
  isLoading?: boolean;
}

const STATUS_BADGE: Record<
  StayStatus,
  { label: string; variant: "available" | "neutral" | "danger" }
> = {
  ACTIVE: { label: "● Activa", variant: "available" },
  COMPLETED: { label: "● Finalizada", variant: "neutral" },
  CANCELLED: { label: "● Anulada", variant: "danger" },
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  YAPE: "Yape",
  PLIN: "Plin",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function StayDetailModal({
  isOpen,
  onClose,
  stay,
  isLoading = false,
}: StayDetailModalProps) {
  const statusInfo = stay ? STATUS_BADGE[stay.status] : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={stay ? `Estado de Cuenta — ${stay.code}` : "Estado de Cuenta"}
      subtitle={
        stay
          ? `Hab. ${stay.roomNumber} (${stay.roomTypeName}) · ${stay.bookingCode ? `Desde reserva ${stay.bookingCode}` : "Ingreso directo (Walk-in)"}`
          : "Cargando información..."
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
      {isLoading || !stay ? (
        <div className="py-12 text-center text-xs text-text-secondary">
          Cargando estado de cuenta...
        </div>
      ) : (
        <div className="space-y-5">
          {/* Meta */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-bg-surface border border-border-soft">
            <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <FiUser className="w-3.5 h-3.5 text-brand-600" />
                <strong className="text-text-primary">
                  {stay.primaryGuestName}
                </strong>
                <span>
                  ({stay.primaryGuestDocumentType}:{" "}
                  {stay.primaryGuestDocumentNumber})
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiHome className="w-3.5 h-3.5 text-brand-600" />
                <strong className="text-text-primary">
                  Hab. {stay.roomNumber}
                </strong>
                <span>
                  · Ingreso: {formatDateTime(stay.checkInAt)} · Salida est.:{" "}
                  {formatDateTime(stay.expectedCheckOut)}
                </span>
              </span>
            </div>
            {statusInfo && (
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            )}
          </div>

          {/* Resumen financiero */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="p-3 rounded-xl bg-bg-card border border-border-default">
              <span className="text-[11px] text-text-secondary">Alojamiento</span>
              <p className="font-mono font-bold text-sm text-text-primary mt-0.5">
                S/ {stay.totalRoomCost.toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-bg-card border border-border-default">
              <span className="text-[11px] text-text-secondary">Consumos</span>
              <p className="font-mono font-bold text-sm text-text-primary mt-0.5">
                S/ {stay.totalExtraCost.toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-bg-card border border-border-default">
              <span className="text-[11px] text-text-secondary">Total Cuenta</span>
              <p className="font-mono font-bold text-sm text-text-primary mt-0.5">
                S/ {stay.totalAmount.toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-bg-card border border-border-default">
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

          {stay.securityDeposit > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
              <span>Garantía de llave / control en custodia (se devuelve al Check-Out)</span>
              <strong className="font-mono">
                S/ {stay.securityDeposit.toFixed(2)}
              </strong>
            </div>
          )}

          {/* Consumos extras */}
          <div>
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FiShoppingBag className="w-3.5 h-3.5 text-brand-600" />
              <span>Consumos y Cargos Extras ({stay.extraCharges?.length ?? 0})</span>
            </h4>
            {!stay.extraCharges || stay.extraCharges.length === 0 ? (
              <div className="p-5 text-center rounded-xl border border-dashed border-border-default text-xs text-text-tertiary">
                No se han registrado consumos extras en esta estadía.
              </div>
            ) : (
              <div className="border border-border-default rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-bg-surface border-b border-border-default sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase text-text-secondary">
                        Fecha
                      </th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase text-text-secondary">
                        Concepto
                      </th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase text-text-secondary text-center">
                        Cant.
                      </th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase text-text-secondary text-right">
                        P. Unit
                      </th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase text-text-secondary text-right">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {stay.extraCharges.map((ec) => (
                      <tr key={ec.id} className="hover:bg-brand-50/30">
                        <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
                          {formatDateTime(ec.createdAt)}
                        </td>
                        <td className="px-3 py-2 font-medium text-text-primary">
                          {ec.concept}
                        </td>
                        <td className="px-3 py-2 text-center font-mono">
                          {ec.quantity}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-text-secondary">
                          S/ {ec.unitPrice.toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-text-primary">
                          S/ {ec.totalPrice.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagos */}
          <div>
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FiCreditCard className="w-3.5 h-3.5 text-brand-600" />
              <span>Pagos y Abonos ({stay.payments?.length ?? 0})</span>
            </h4>
            {!stay.payments || stay.payments.length === 0 ? (
              <div className="p-5 text-center rounded-xl border border-dashed border-border-default text-xs text-text-tertiary">
                No se han registrado pagos todavía.
              </div>
            ) : (
              <div className="border border-border-default rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-bg-surface border-b border-border-default sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase text-text-secondary">
                        Fecha
                      </th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase text-text-secondary">
                        Método
                      </th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase text-text-secondary">
                        Constancia
                      </th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase text-text-secondary text-right">
                        Monto
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {stay.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-brand-50/30">
                        <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
                          {formatDateTime(p.createdAt)}
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-md bg-bg-surface border border-border-default font-medium text-text-secondary">
                            {METHOD_LABEL[p.method]}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-text-secondary">
                          {p.receiptNumber || p.receiptType}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          S/ {p.amount.toFixed(2)}
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
