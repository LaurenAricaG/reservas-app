"use client";

import {
  FiEye,
  FiShoppingBag,
  FiDollarSign,
  FiClock,
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
import type { SerializedStay, StayStatus } from "@/types/stays";

interface TableStaysProps {
  stays: SerializedStay[];
  currentPage: number;
  itemsPerPage: number;
  canAddExtra?: boolean;
  canRegisterPayment?: boolean;
  onViewDetail: (stay: SerializedStay) => void;
  onAddExtra: (stay: SerializedStay) => void;
  onRegisterPayment: (stay: SerializedStay) => void;
}

const STATUS_BADGE: Record<
  StayStatus,
  { label: string; variant: "available" | "neutral" | "danger" }
> = {
  ACTIVE: { label: "● Activa", variant: "available" },
  COMPLETED: { label: "● Finalizada", variant: "neutral" },
  CANCELLED: { label: "● Anulada", variant: "danger" },
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function TableStays({
  stays,
  currentPage,
  itemsPerPage,
  canAddExtra = true,
  canRegisterPayment = true,
  onViewDetail,
  onAddExtra,
  onRegisterPayment,
}: TableStaysProps) {
  return (
    <ErrorBoundary variant="embedded" title="Tabla de Estadías">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center w-14">Número</TableHead>
            <TableHead className="text-left w-36">Código</TableHead>
            <TableHead className="text-left w-36">Habitación</TableHead>
            <TableHead className="text-left">Huésped Titular</TableHead>
            <TableHead className="text-left w-48">Ingreso / Salida Est.</TableHead>
            <TableHead className="text-right w-40">Cuenta / Pendiente</TableHead>
            <TableHead className="text-center w-28">Estado</TableHead>
            <TableHead className="text-center w-36">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {stays.map((stay, index) => {
            const correlativeNumber =
              (currentPage - 1) * itemsPerPage + index + 1;
            const statusInfo = STATUS_BADGE[stay.status];
            const isActive = stay.status === "ACTIVE";
            const isOverdueCheckOut =
              isActive && new Date(stay.expectedCheckOut).getTime() < Date.now();

            return (
              <TableRow
                key={stay.id}
                className={!isActive ? "bg-bg-surface/40 opacity-80" : ""}
              >
                <TableCell className="text-center font-mono text-xs text-text-tertiary">
                  {correlativeNumber}
                </TableCell>

                <TableCell>
                  <div className="font-mono font-bold text-xs text-text-primary">
                    {stay.code}
                  </div>
                  <div className="text-[11px] text-text-tertiary mt-0.5">
                    {stay.bookingCode ? `Ref: ${stay.bookingCode}` : "Walk-in"}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="font-semibold text-xs text-text-primary">
                    Hab. {stay.roomNumber}
                  </div>
                  <div className="text-[11px] text-text-tertiary mt-0.5">
                    {stay.roomTypeName} · {stay.floorName}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="font-semibold text-sm text-text-primary">
                    {stay.primaryGuestName}
                  </div>
                  <div className="text-[11px] text-text-tertiary font-mono mt-0.5">
                    {stay.primaryGuestDocumentType}:{" "}
                    {stay.primaryGuestDocumentNumber}
                    {stay.extraChargesCount > 0
                      ? ` · ${stay.extraChargesCount} consumo(s)`
                      : ""}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
                    <FiClock className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span>{formatDateTime(stay.checkInAt)}</span>
                  </div>
                  <div className="text-[11px] text-text-tertiary mt-0.5 pl-5">
                    Salida: {formatDateTime(stay.expectedCheckOut)}
                  </div>
                  {isOverdueCheckOut && (
                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 mt-1 pl-5">
                      <FiAlertTriangle className="w-3 h-3 shrink-0" />
                      <span>Salida vencida</span>
                    </div>
                  )}
                </TableCell>

                <TableCell className="text-right">
                  <div className="font-mono font-bold text-xs text-text-primary">
                    S/ {stay.totalAmount.toFixed(2)}
                  </div>
                  <div className="text-[11px] font-mono mt-0.5">
                    {stay.pendingBalance > 0 ? (
                      <span className="text-amber-700 font-semibold">
                        Pend: S/ {stay.pendingBalance.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">
                        Pagado
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="text-center">
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </TableCell>

                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <ButtonIcon
                      onClick={() => onViewDetail(stay)}
                      variant="info"
                      icon={FiEye}
                      title={`Ver estado de cuenta (${stay.code})`}
                    />

                    {canAddExtra && isActive && (
                      <ButtonIcon
                        onClick={() => onAddExtra(stay)}
                        variant="warning"
                        icon={FiShoppingBag}
                        title={`Agregar consumo a Hab. ${stay.roomNumber}`}
                      />
                    )}

                    {canRegisterPayment && isActive && stay.pendingBalance > 0 && (
                      <ButtonIcon
                        onClick={() => onRegisterPayment(stay)}
                        variant="success"
                        icon={FiDollarSign}
                        title={`Registrar abono (${stay.code})`}
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
