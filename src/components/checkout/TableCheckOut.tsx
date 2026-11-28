"use client";

import {
  FiEye,
  FiLogOut,
  FiClock,
  FiAlertTriangle,
  FiPlusCircle,
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

interface TableCheckOutProps {
  stays: SerializedStay[];
  currentPage: number;
  itemsPerPage: number;
  canCheckOut?: boolean;
  onViewDetail: (stay: SerializedStay) => void;
  onExtendStay: (stay: SerializedStay) => void;
  onCheckOut: (stay: SerializedStay) => void;
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

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function TableCheckOut({
  stays,
  currentPage,
  itemsPerPage,
  canCheckOut = true,
  onViewDetail,
  onExtendStay,
  onCheckOut,
}: TableCheckOutProps) {
  const now = new Date();

  return (
    <ErrorBoundary variant="embedded" title="Tabla de Salidas y Check-Out">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center w-14">Número</TableHead>
            <TableHead className="text-left w-32">Código</TableHead>
            <TableHead className="text-left w-36">Habitación</TableHead>
            <TableHead className="text-left">Huésped Titular</TableHead>
            <TableHead className="text-left w-48">Salida Estimada</TableHead>
            <TableHead className="text-right w-40">Cuenta / Saldo</TableHead>
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
            const expectedDate = new Date(stay.expectedCheckOut);
            const isOverdue = isActive && expectedDate.getTime() < now.getTime();
            const isToday = isActive && !isOverdue && isSameLocalDay(expectedDate, now);

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
                    {stay.extraChargesCount} consumo(s)
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
                    {stay.securityDeposit > 0
                      ? ` · Garantía S/ ${stay.securityDeposit.toFixed(2)}`
                      : ""}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
                    <FiClock className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span>
                      {stay.actualCheckOut
                        ? formatDateTime(stay.actualCheckOut)
                        : formatDateTime(stay.expectedCheckOut)}
                    </span>
                  </div>
                  {isOverdue && (
                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 mt-1 pl-5">
                      <FiAlertTriangle className="w-3 h-3 shrink-0" />
                      <span>Salida vencida</span>
                    </div>
                  )}
                  {isToday && (
                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 mt-1 pl-5">
                      <span>Sale hoy</span>
                    </div>
                  )}
                  {stay.actualCheckOut && (
                    <div className="text-[11px] text-text-tertiary mt-0.5 pl-5">
                      Check-Out realizado
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
                        Saldo: S/ {stay.pendingBalance.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">
                        Cancelado
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

                    {canCheckOut && isActive && (
                      <ButtonIcon
                        onClick={() => onExtendStay(stay)}
                        variant="warning"
                        icon={FiPlusCircle}
                        title={`Extender estadía (${stay.code})`}
                      />
                    )}

                    {canCheckOut && isActive && (
                      <ButtonIcon
                        onClick={() => onCheckOut(stay)}
                        variant="success"
                        icon={FiLogOut}
                        title={`Realizar Check-Out de Hab. ${stay.roomNumber}`}
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
