"use client";

import {
  FiEye,
  FiEdit2,
  FiDollarSign,
  FiCheckCircle,
  FiXCircle,
  FiCalendar,
  FiGlobe,
  FiMonitor,
  FiAlertTriangle,
} from "react-icons/fi";
import ErrorBoundary from "@/components/error/ErrorBoundary";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import ButtonIcon from "@/components/ui/ButtonIcon";
import type { BookingStatus, SerializedBooking } from "@/types/bookings";

interface TableBookingsProps {
  bookings: SerializedBooking[];
  currentPage: number;
  itemsPerPage: number;
  canUpdate?: boolean;
  canCancel?: boolean;
  onViewDetail: (booking: SerializedBooking) => void;
  onEdit: (booking: SerializedBooking) => void;
  onRegisterDeposit: (booking: SerializedBooking) => void;
  onConfirmBooking: (booking: SerializedBooking) => void;
  onCancel: (booking: SerializedBooking) => void;
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

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));
}

function formatShortTime(iso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export default function TableBookings({
  bookings,
  currentPage,
  itemsPerPage,
  canUpdate = true,
  canCancel = true,
  onViewDetail,
  onEdit,
  onRegisterDeposit,
  onConfirmBooking,
  onCancel,
}: TableBookingsProps) {
  return (
    <ErrorBoundary variant="embedded" title="Tabla de Reservas">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center w-14">Número</TableHead>
            <TableHead className="text-left w-36">Código / Origen</TableHead>
            <TableHead className="text-left">Huésped</TableHead>
            <TableHead className="text-left w-40">Habitación</TableHead>
            <TableHead className="text-left w-44">Fechas / Noches</TableHead>
            <TableHead className="text-right w-36">Total / Adelanto</TableHead>
            <TableHead className="text-center w-32">Estado</TableHead>
            <TableHead className="text-center w-40">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {bookings.map((booking, index) => {
            const correlativeNumber =
              (currentPage - 1) * itemsPerPage + index + 1;
            const statusInfo = STATUS_BADGE[booking.status];
            const isEditable =
              booking.status === "PENDING" || booking.status === "CONFIRMED";
            const isOverdueArrival =
              isEditable && new Date(booking.checkInDate).getTime() < Date.now();

            return (
              <TableRow
                key={booking.id}
                className={
                  booking.status === "CANCELLED" || booking.status === "NO_SHOW"
                    ? "bg-bg-surface/40 opacity-75"
                    : ""
                }
              >
                {/* # Correlativo */}
                <TableCell className="text-center font-mono text-xs text-text-tertiary">
                  {correlativeNumber}
                </TableCell>

                {/* Código / Origen */}
                <TableCell>
                  <div className="font-mono font-bold text-xs text-text-primary">
                    {booking.code}
                  </div>
                  <div className="inline-flex items-center gap-1 text-[11px] text-text-tertiary mt-0.5">
                    {booking.origin === "WEB" ? (
                      <>
                        <FiGlobe className="w-3 h-3 text-brand-600" />
                        <span>Web</span>
                      </>
                    ) : (
                      <>
                        <FiMonitor className="w-3 h-3 text-text-tertiary" />
                        <span>Recepción</span>
                      </>
                    )}
                  </div>
                </TableCell>

                {/* Huésped */}
                <TableCell>
                  <div className="font-semibold text-sm text-text-primary">
                    {booking.guestFullName}
                  </div>
                  <div className="text-[11px] text-text-tertiary font-mono mt-0.5">
                    {booking.guestDocumentType}: {booking.guestDocumentNumber}
                    {booking.guestPhone ? ` · ${booking.guestPhone}` : ""}
                  </div>
                </TableCell>

                {/* Habitación */}
                <TableCell>
                  <div className="font-semibold text-xs text-text-primary">
                    Hab. {booking.roomNumber}
                  </div>
                  <div className="text-[11px] text-text-tertiary mt-0.5">
                    {booking.roomTypeName} · {booking.floorName}
                  </div>
                </TableCell>

                {/* Fechas / Noches o Horas */}
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
                    <FiCalendar className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    {booking.isHourly ? (
                      <span>
                        {formatShortDate(booking.checkInDate)} ·{" "}
                        {formatShortTime(booking.checkInDate)} →{" "}
                        {formatShortTime(booking.checkOutDate)}
                      </span>
                    ) : (
                      <span>
                        {formatShortDate(booking.checkInDate)} →{" "}
                        {formatShortDate(booking.checkOutDate)}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-text-tertiary mt-0.5 pl-5">
                    {booking.isHourly
                      ? `${booking.durationHours} ${booking.durationHours === 1 ? "hora" : "horas"}`
                      : `${booking.nights} ${booking.nights === 1 ? "noche" : "noches"}`}{" "}
                    · {booking.numberOfGuests} pers.
                  </div>
                  {isOverdueArrival && (
                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 mt-1 pl-5">
                      <FiAlertTriangle className="w-3 h-3 shrink-0" />
                      <span>Llegada vencida</span>
                    </div>
                  )}
                </TableCell>

                {/* Total / Adelanto */}
                <TableCell className="text-right">
                  <div className="font-mono font-bold text-xs text-text-primary">
                    S/ {booking.totalPrice.toFixed(2)}
                  </div>
                  <div className="text-[11px] font-mono mt-0.5">
                    <span className="text-emerald-700 font-semibold">
                      Adel: S/ {booking.depositPaid.toFixed(2)}
                    </span>
                  </div>
                </TableCell>

                {/* Estado */}
                <TableCell className="text-center">
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </TableCell>

                {/* Acciones */}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <ButtonIcon
                      onClick={() => onViewDetail(booking)}
                      variant="info"
                      icon={FiEye}
                      title={`Ver detalle de ${booking.code}`}
                    />

                    {canUpdate && booking.status === "PENDING" && (
                      <ButtonIcon
                        onClick={() => onConfirmBooking(booking)}
                        variant="success"
                        icon={FiCheckCircle}
                        title={`Confirmar reserva ${booking.code} sin adelanto`}
                      />
                    )}

                    {canUpdate && isEditable && booking.pendingBalance > 0 && (
                      <ButtonIcon
                        onClick={() => onRegisterDeposit(booking)}
                        variant="success"
                        icon={FiDollarSign}
                        title={`Registrar adelanto (${booking.code})`}
                      />
                    )}

                    {canUpdate && isEditable && (
                      <ButtonIcon
                        onClick={() => onEdit(booking)}
                        variant="warning"
                        icon={FiEdit2}
                        title={`Editar reserva ${booking.code}`}
                      />
                    )}

                    {canCancel && isEditable && (
                      <ButtonIcon
                        onClick={() => onCancel(booking)}
                        variant="danger"
                        icon={FiXCircle}
                        title={`Cancelar reserva ${booking.code}`}
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ErrorBoundary>
  );
}
