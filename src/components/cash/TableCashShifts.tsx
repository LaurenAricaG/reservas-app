"use client";

import { FiEye, FiClock, FiUser } from "react-icons/fi";
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
import type { SerializedCashShift } from "@/types/cash";

interface TableCashShiftsProps {
  shifts: SerializedCashShift[];
  currentPage: number;
  itemsPerPage: number;
  onViewDetail: (shift: SerializedCashShift) => void;
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function TableCashShifts({
  shifts,
  currentPage,
  itemsPerPage,
  onViewDetail,
}: TableCashShiftsProps) {
  return (
    <ErrorBoundary variant="embedded" title="Historial de Turnos de Caja">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center w-16">Número</TableHead>
            <TableHead className="text-left">Turno / Responsable</TableHead>
            <TableHead className="text-left w-52">Apertura / Cierre</TableHead>
            <TableHead className="text-right w-32">Saldo Inicial</TableHead>
            <TableHead className="text-right w-36">Recaudado</TableHead>
            <TableHead className="text-right w-36">Arqueo Físico</TableHead>
            <TableHead className="text-center w-28">Diferencia</TableHead>
            <TableHead className="text-center w-28">Estado</TableHead>
            <TableHead className="text-center w-28">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {shifts.map((shift, index) => {
            const correlativeNumber =
              (currentPage - 1) * itemsPerPage + index + 1;
            const isOpen = shift.status === "OPEN";
            const expectedCash =
              shift.expectedCash ?? shift.initialCash + shift.cashCollected;

            return (
              <TableRow key={shift.id}>
                {/* # Correlativo */}
                <TableCell className="text-center font-mono text-xs text-text-tertiary">
                  {correlativeNumber}
                </TableCell>

                {/* Turno / Responsable */}
                <TableCell>
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200/50 flex items-center justify-center shrink-0 mt-0.5 text-brand-600">
                      <FiUser className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary text-sm flex items-center gap-1.5">
                        <span>Turno #{shift.id}</span>
                        <span className="text-text-tertiary font-normal">·</span>
                        <span>{shift.userName}</span>
                      </div>
                      <p className="text-[11px] text-text-tertiary mt-0.5">
                        @{shift.userUsername} · {shift.totalPaymentsCount}{" "}
                        {shift.totalPaymentsCount === 1 ? "pago" : "pagos"}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Apertura / Cierre */}
                <TableCell>
                  <div className="flex flex-col gap-0.5 text-xs">
                    <div className="flex items-center gap-1.5 text-text-primary font-medium">
                      <FiClock className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{formatDateTime(shift.openedAt)}</span>
                    </div>
                    <div className="text-[11px] text-text-tertiary pl-4.5">
                      {shift.closedAt
                        ? `Cierre: ${formatDateTime(shift.closedAt)}`
                        : "Turno en curso"}
                    </div>
                  </div>
                </TableCell>

                {/* Saldo Inicial */}
                <TableCell className="text-right font-mono text-xs font-semibold text-text-primary">
                  S/ {shift.initialCash.toFixed(2)}
                </TableCell>

                {/* Recaudado */}
                <TableCell className="text-right">
                  <div className="font-mono font-bold text-xs text-text-primary">
                    S/ {shift.totalCollected.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-text-tertiary font-mono">
                    Ef: {shift.cashCollected.toFixed(2)} · Dig:{" "}
                    {shift.digitalCollected.toFixed(2)}
                  </div>
                </TableCell>

                {/* Arqueo Físico */}
                <TableCell className="text-right">
                  {shift.actualCash !== null ? (
                    <>
                      <div className="font-mono font-bold text-xs text-text-primary">
                        S/ {shift.actualCash.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-text-tertiary font-mono">
                        Esp: S/ {expectedCash.toFixed(2)}
                      </div>
                    </>
                  ) : (
                    <div className="font-mono text-xs text-brand-700 font-semibold">
                      Esp: S/ {expectedCash.toFixed(2)}
                    </div>
                  )}
                </TableCell>

                {/* Diferencia */}
                <TableCell className="text-center">
                  {shift.difference === null ? (
                    <span className="text-xs text-text-tertiary">—</span>
                  ) : shift.difference === 0 ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      S/ 0.00
                    </span>
                  ) : shift.difference > 0 ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      +S/ {shift.difference.toFixed(2)}
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      -S/ {Math.abs(shift.difference).toFixed(2)}
                    </span>
                  )}
                </TableCell>

                {/* Estado */}
                <TableCell className="text-center">
                  <Badge variant={isOpen ? "available" : "neutral"}>
                    {isOpen ? "● Abierto" : "● Cerrado"}
                  </Badge>
                </TableCell>

                {/* Acciones */}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <ButtonIcon
                      onClick={() => onViewDetail(shift)}
                      variant="info"
                      icon={FiEye}
                      title={`Ver detalle del turno #${shift.id}`}
                    />
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
