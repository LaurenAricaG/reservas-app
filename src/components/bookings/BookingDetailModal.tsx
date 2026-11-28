"use client";

import { FiCalendar, FiUser, FiHome, FiFileText } from "react-icons/fi";
import { Modal, Button, Badge } from "@/components/ui";
import type {
  BookingStatus,
  PaymentMethod,
  SerializedBooking,
} from "@/types/bookings";

interface BookingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: SerializedBooking | null;
  isLoading?: boolean;
}

const STATUS_BADGE: Record<
  BookingStatus,
  { label: string; variant: "warning" | "available" | "info" | "danger" | "neutral" }
> = {
  PENDING: { label: "● Pendiente", variant: "warning" },
  CONFIRMED: { label: "● Confirmada", variant: "available" },
  CHECKED_IN: { label: "● En estadía", variant: "info" },
  CANCELLED: { label: "● Cancelada", variant: "danger" },
  NO_SHOW: { label: "● No se presentó", variant: "neutral" },
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  YAPE: "Yape",
  PLIN: "Plin",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export default function BookingDetailModal({
  isOpen,
  onClose,
  booking,
  isLoading = false,
}: BookingDetailModalProps) {
  const statusInfo = booking
    ? booking.status === "CHECKED_IN" && booking.stayStatus === "COMPLETED"
      ? { label: "● Finalizada", variant: "neutral" as const }
      : STATUS_BADGE[booking.status]
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={booking ? `Reserva ${booking.code}` : "Detalle de Reserva"}
      subtitle={
        booking
          ? `Origen: ${booking.origin === "WEB" ? "Web Pública" : "Recepción"} · ${
              booking.isHourly
                ? `${booking.durationHours} ${booking.durationHours === 1 ? "hora" : "horas"} (Por horas)`
                : `${booking.nights} ${booking.nights === 1 ? "noche" : "noches"} (Por noche)`
            }`
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
      {isLoading || !booking ? (
        <div className="py-12 text-center text-xs text-text-secondary">
          Cargando detalle de la reserva...
        </div>
      ) : (
        <div className="space-y-5">
          {/* Cabecera */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-bg-surface border border-border-soft">
            <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <FiUser className="w-3.5 h-3.5 text-brand-600" />
                <strong className="text-text-primary">
                  {booking.guestFullName}
                </strong>
                <span>
                  ({booking.guestDocumentType}: {booking.guestDocumentNumber})
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiHome className="w-3.5 h-3.5 text-brand-600" />
                <strong className="text-text-primary">
                  Hab. {booking.roomNumber}
                </strong>
                <span>
                  ({booking.roomTypeName} · {booking.floorName})
                </span>
              </span>
            </div>
            {statusInfo && (
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            )}
          </div>

          {/* Fechas y montos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-bg-card border border-border-default">
              <span className="text-[11px] text-text-secondary flex items-center gap-1">
                <FiCalendar className="w-3 h-3" />
                Estancia
              </span>
              <p className="font-semibold text-xs text-text-primary mt-1">
                {booking.isHourly
                  ? `${formatDate(booking.checkInDate)} (${formatTime(booking.checkInDate)} → ${formatTime(booking.checkOutDate)})`
                  : `${formatDate(booking.checkInDate)} → ${formatDate(booking.checkOutDate)}`}
              </p>
              <span className="text-[11px] text-text-tertiary">
                {booking.isHourly
                  ? `${booking.durationHours} ${booking.durationHours === 1 ? "hora" : "horas"}`
                  : `${booking.nights} ${booking.nights === 1 ? "noche" : "noches"}`}{" "}
                · {booking.numberOfGuests}{" "}
                {booking.numberOfGuests === 1 ? "huésped" : "huéspedes"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-bg-card border border-border-default">
              <span className="text-[11px] text-text-secondary">Total Reserva</span>
              <p className="font-mono font-bold text-sm text-text-primary mt-1">
                S/ {booking.totalPrice.toFixed(2)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-bg-card border border-border-default">
              <span className="text-[11px] text-text-secondary">Adelanto Pagado</span>
              <p className="font-mono font-bold text-sm text-emerald-700 mt-1">
                S/ {booking.depositPaid.toFixed(2)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-brand-50 border border-brand-200">
              <span className="text-[11px] font-semibold text-brand-700">
                Saldo Pendiente
              </span>
              <p className="font-mono font-bold text-sm text-brand-700 mt-1">
                S/ {booking.pendingBalance.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Notas */}
          {(booking.clientNotes || booking.receptionNotes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {booking.clientNotes && (
                <div className="p-3 rounded-xl bg-bg-surface/60 border border-border-soft">
                  <span className="font-semibold text-text-primary flex items-center gap-1.5 mb-1">
                    <FiFileText className="w-3.5 h-3.5 text-text-tertiary" />
                    Peticiones del cliente
                  </span>
                  <p className="text-text-secondary whitespace-pre-line">
                    {booking.clientNotes}
                  </p>
                </div>
              )}
              {booking.receptionNotes && (
                <div className="p-3 rounded-xl bg-bg-surface/60 border border-border-soft">
                  <span className="font-semibold text-text-primary flex items-center gap-1.5 mb-1">
                    <FiFileText className="w-3.5 h-3.5 text-text-tertiary" />
                    Notas de recepción
                  </span>
                  <p className="text-text-secondary whitespace-pre-line">
                    {booking.receptionNotes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pagos / Adelantos */}
          <div>
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2">
              Adelantos y Pagos Registrados ({booking.payments?.length ?? 0})
            </h4>

            {!booking.payments || booking.payments.length === 0 ? (
              <div className="p-6 text-center rounded-xl border border-dashed border-border-default text-xs text-text-tertiary">
                No se han registrado adelantos para esta reserva.
              </div>
            ) : (
              <div className="border border-border-default rounded-xl overflow-hidden max-h-56 overflow-y-auto">
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
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase text-text-secondary">
                        Referencia
                      </th>
                      <th className="px-3 py-2 text-[10px] font-semibold uppercase text-text-secondary text-right">
                        Monto
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft">
                    {booking.payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-brand-50/30">
                        <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
                          {new Intl.DateTimeFormat("es-PE", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(payment.createdAt))}
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-md bg-bg-surface border border-border-default font-medium text-text-secondary">
                            {METHOD_LABEL[payment.method]}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-text-secondary">
                          {payment.amount < 0
                            ? "Devolución"
                            : payment.receiptNumber || payment.receiptType}
                        </td>
                        <td className="px-3 py-2 text-text-secondary">
                          {payment.reference || "—"}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-mono font-bold whitespace-nowrap ${
                            payment.amount < 0
                              ? "text-rose-700"
                              : "text-emerald-700"
                          }`}
                        >
                          {payment.amount < 0
                            ? `-S/ ${Math.abs(payment.amount).toFixed(2)}`
                            : `S/ ${payment.amount.toFixed(2)}`}
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
