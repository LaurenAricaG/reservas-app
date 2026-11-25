"use client";

import {
  FiEdit2,
  FiTool,
  FiRefreshCw,
  FiUsers,
  FiHome,
  FiLayers,
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
import { SerializedRoom, RoomStatus } from "@/types/rooms";

interface TableRoomsProps {
  rooms: SerializedRoom[];
  currentPage: number;
  itemsPerPage: number;
  canUpdate?: boolean;
  canManageStatus?: boolean;
  onEdit: (room: SerializedRoom) => void;
  onSetOutOfService: (room: SerializedRoom) => void;
  onRestoreToService: (room: SerializedRoom) => void;
}

const STATUS_LABELS: Record<RoomStatus, { label: string; variant: any }> = {
  AVAILABLE: { label: "● Disponible", variant: "available" },
  OCCUPIED: { label: "● Ocupada", variant: "occupied" },
  RESERVED: { label: "● Reservada", variant: "reserved" },
  CLEANING: { label: "● En Limpieza", variant: "cleaning" },
  MAINTENANCE: { label: "● Fuera de Servicio", variant: "maintenance" },
};

export default function TableRooms({
  rooms,
  currentPage,
  itemsPerPage,
  canUpdate = true,
  canManageStatus = true,
  onEdit,
  onSetOutOfService,
  onRestoreToService,
}: TableRoomsProps) {
  return (
    <ErrorBoundary variant="embedded" title="Tabla de Habitaciones">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center w-16">Número</TableHead>
            <TableHead className="text-left w-36">Habitación</TableHead>
            <TableHead className="text-left w-32">Piso</TableHead>
            <TableHead className="text-left">Tipo de Habitación</TableHead>
            <TableHead className="text-center w-28">Aforo</TableHead>
            <TableHead className="text-center w-40">Estado</TableHead>
            <TableHead className="text-center w-36">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rooms.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-10 text-text-tertiary"
              >
                No se encontraron habitaciones registradas.
              </TableCell>
            </TableRow>
          ) : (
            rooms.map((room, index) => {
              const statusInfo = STATUS_LABELS[room.status] || {
                label: room.status,
                variant: "neutral",
              };
              const isMaintenance = room.status === "MAINTENANCE";
              const isOccupied = room.status === "OCCUPIED";

              return (
                <TableRow key={room.id}>
                  {/* Número correlativo */}
                  <TableCell className="font-mono text-xs text-text-tertiary text-center">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </TableCell>

                  {/* Habitación y Notas */}
                  <TableCell className="text-left">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 font-bold text-text-primary text-sm">
                        <FiHome className="w-4 h-4 text-brand-600" />
                        <span>Hab. {room.number}</span>
                      </div>
                      {room.notes && (
                        <span
                          className="text-xs text-text-tertiary line-clamp-1 mt-0.5 max-w-50"
                          title={room.notes}
                        >
                          {room.notes}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Piso */}
                  <TableCell className="text-left">
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bg-surface border border-border-soft text-xs text-text-secondary font-medium">
                      <FiLayers className="w-3.5 h-3.5 text-text-tertiary" />
                      <span>
                        {room.floor?.name || `Piso ${room.floor?.number}`}
                      </span>
                    </div>
                  </TableCell>

                  {/* Tipo de Habitación & Precio */}
                  <TableCell className="text-left">
                    <div className="flex flex-col">
                      <span className="font-semibold text-text-primary text-sm">
                        {room.roomType?.name}
                      </span>
                      <span className="text-xs font-bold text-brand-700">
                        S/ {Number(room.roomType?.basePrice || 0).toFixed(2)} /
                        noche
                      </span>
                    </div>
                  </TableCell>

                  {/* Aforo */}
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary">
                      <FiUsers className="w-3.5 h-3.5 text-text-tertiary" />
                      <span>{room.roomType?.maxGuests ?? 2} pers.</span>
                    </div>
                  </TableCell>

                  {/* Estado */}
                  <TableCell className="text-center">
                    <Badge variant={statusInfo.variant}>
                      {statusInfo.label}
                    </Badge>
                  </TableCell>

                  {/* Acciones */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Editar */}
                      {canUpdate && (
                        <ButtonIcon
                          onClick={() => onEdit(room)}
                          variant="warning"
                          icon={FiEdit2}
                          title={`Editar habitación "${room.number}" (ID #${room.id})`}
                        />
                      )}

                      {/* Poner Fuera de Servicio (si no está ya en mantenimiento) */}
                      {canManageStatus && !isMaintenance && (
                        <ButtonIcon
                          onClick={() => onSetOutOfService(room)}
                          variant="danger"
                          icon={FiTool}
                          disabled={isOccupied}
                          title={
                            isOccupied
                              ? "No se puede dar de baja mientras esté ocupada"
                              : `Poner habitación "${room.number}" fuera de servicio (Mantenimiento)`
                          }
                        />
                      )}

                      {/* Habilitar / Poner en Servicio (si está en mantenimiento) */}
                      {canManageStatus && isMaintenance && (
                        <ButtonIcon
                          onClick={() => onRestoreToService(room)}
                          variant="success"
                          icon={FiRefreshCw}
                          title={`Habilitar habitación "${room.number}" (Disponible)`}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </ErrorBoundary>
  );
}
