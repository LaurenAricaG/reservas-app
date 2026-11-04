"use client";

import {
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiUsers,
  FiHome,
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
import { SerializedRoomType } from "@/types/roomTypes";

interface TableRoomTypesProps {
  roomTypes: SerializedRoomType[];
  currentPage: number;
  itemsPerPage: number;
  canUpdate?: boolean;
  canDelete?: boolean;
  onEdit: (roomType: SerializedRoomType) => void;
  onDeactivate: (roomType: SerializedRoomType) => void;
  onRestore: (roomType: SerializedRoomType) => void;
}

export default function TableRoomTypes({
  roomTypes,
  currentPage,
  itemsPerPage,
  canUpdate = true,
  canDelete = true,
  onEdit,
  onDeactivate,
  onRestore,
}: TableRoomTypesProps) {
  return (
    <ErrorBoundary variant="embedded" title="Tabla de Tipos de Habitación">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center w-16">Número</TableHead>
            <TableHead className="text-left">Tipo de Habitación</TableHead>
            <TableHead className="text-left w-36">Tarifa Noche</TableHead>
            <TableHead className="text-left w-32">Tarifa Horas</TableHead>
            <TableHead className="text-center w-24">Aforo</TableHead>
            <TableHead className="text-left">Comodidades</TableHead>
            <TableHead className="text-center w-28">Cuartos</TableHead>
            <TableHead className="text-center w-28">Estado</TableHead>
            <TableHead className="text-center w-36">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roomTypes.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={9}
                className="text-center py-10 text-text-tertiary"
              >
                No se encontraron tipos de habitación registrados.
              </TableCell>
            </TableRow>
          ) : (
            roomTypes.map((roomType, index) => {
              const isActive = roomType.isActive ?? true;
              const roomsCount = roomType._count?.rooms ?? 0;
              const amenities = Array.isArray(roomType.amenities)
                ? roomType.amenities
                : [];

              return (
                <TableRow key={roomType.id}>
                  {/* Número Correlativo */}
                  <TableCell className="font-mono text-xs text-text-tertiary text-center">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </TableCell>

                  {/* Nombre y Descripción */}
                  <TableCell className="text-left">
                    <div className="flex flex-col">
                      <span className="font-semibold text-text-primary text-sm">
                        {roomType.name}
                      </span>
                      {roomType.description && (
                        <span className="text-xs text-text-tertiary line-clamp-1 mt-0.5 max-w-xs">
                          {roomType.description}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Tarifa Noche (Base) */}
                  <TableCell className="text-left">
                    <span className="font-bold text-brand-700 text-sm">
                      S/ {Number(roomType.basePrice).toFixed(2)}
                    </span>
                  </TableCell>

                  {/* Tarifa Horas */}
                  <TableCell className="text-left">
                    {roomType.hourlyPrice ? (
                      <span className="font-medium text-text-secondary text-xs">
                        S/ {Number(roomType.hourlyPrice).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-text-tertiary text-xs">—</span>
                    )}
                  </TableCell>

                  {/* Aforo Máximo */}
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary">
                      <FiUsers className="w-3.5 h-3.5 text-text-tertiary" />
                      <span>{roomType.maxGuests}</span>
                    </div>
                  </TableCell>

                  {/* Comodidades (Preview) */}
                  <TableCell className="text-left">
                    {amenities.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1 max-w-xs">
                        {amenities.slice(0, 2).map((a) => (
                          <span
                            key={a}
                            className="inline-block text-[11px] px-1.5 py-0.5 bg-bg-surface border border-border-soft text-text-secondary rounded truncate max-w-[120px]"
                            title={a}
                          >
                            {a}
                          </span>
                        ))}
                        {amenities.length > 2 && (
                          <span className="text-[10px] font-semibold text-text-tertiary px-1 py-0.5 bg-bg-surface rounded">
                            +{amenities.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-text-tertiary">Sin extras</span>
                    )}
                  </TableCell>

                  {/* Habitaciones Vinculadas */}
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-bg-surface border border-border-soft text-xs text-text-secondary font-medium">
                      <FiHome className="w-3.5 h-3.5 text-text-tertiary" />
                      <span>{roomsCount}</span>
                    </div>
                  </TableCell>

                  {/* Estado (Activo / Inactivo) */}
                  <TableCell className="text-center">
                    <Badge variant={isActive ? "available" : "maintenance"}>
                      {isActive ? "● Activo" : "● Inactivo"}
                    </Badge>
                  </TableCell>

                  {/* Acciones */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Editar */}
                      {canUpdate && (
                        <ButtonIcon
                          onClick={() => onEdit(roomType)}
                          variant="warning"
                          icon={FiEdit2}
                          title={`Editar tipo "${roomType.name}" (ID #${roomType.id})`}
                        />
                      )}

                      {/* Dar de baja (si está activo) */}
                      {canDelete && isActive && (
                        <ButtonIcon
                          onClick={() => onDeactivate(roomType)}
                          variant="danger"
                          icon={FiTrash2}
                          title={`Dar de baja a "${roomType.name}" (ID #${roomType.id})`}
                        />
                      )}

                      {/* Restaurar (si está inactivo) */}
                      {canUpdate && !isActive && (
                        <ButtonIcon
                          onClick={() => onRestore(roomType)}
                          variant="success"
                          icon={FiRefreshCw}
                          title={`Restaurar tipo "${roomType.name}" (ID #${roomType.id})`}
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

