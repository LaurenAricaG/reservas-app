"use client";

import {
  FiEdit2,
  FiSlash,
  FiCheckCircle,
  FiLayers,
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
import { SerializedFloor } from "@/types/floors";

interface TableFloorsProps {
  floors: SerializedFloor[];
  currentPage: number;
  itemsPerPage: number;
  canUpdate?: boolean;
  canDelete?: boolean;
  onEdit: (floor: SerializedFloor) => void;
  onDeactivate: (floor: SerializedFloor) => void;
  onRestore: (floor: SerializedFloor) => void;
}

export default function TableFloors({
  floors,
  currentPage,
  itemsPerPage,
  canUpdate = true,
  canDelete = true,
  onEdit,
  onDeactivate,
  onRestore,
}: TableFloorsProps) {
  return (
    <ErrorBoundary variant="embedded" title="Tabla de Pisos">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center w-16">Número</TableHead>
            <TableHead className="text-left w-32">Nivel</TableHead>
            <TableHead className="text-left">Nombre del Piso</TableHead>
            <TableHead className="text-left w-64">Habitaciones</TableHead>
            <TableHead className="text-center w-32">Estado</TableHead>
            <TableHead className="text-center w-36">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {floors.map((floor, index) => {
            const correlativeNumber = (currentPage - 1) * itemsPerPage + index + 1;
            const hasBusyRooms = floor.occupiedRooms > 0 || floor.reservedRooms > 0;

            return (
              <TableRow
                key={floor.id}
                className={!floor.isActive ? "bg-bg-surface/40 opacity-75" : ""}
              >
                {/* # Correlativo */}
                <TableCell className="text-center font-mono text-xs text-text-tertiary">
                  {correlativeNumber}
                </TableCell>

                {/* Nivel */}
                <TableCell>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-bg-surface border border-border-default rounded-lg font-mono text-xs font-semibold text-text-primary shadow-3xs">
                    <FiLayers className="w-3.5 h-3.5 text-brand-600" />
                    <span>Nivel {floor.number}</span>
                  </span>
                </TableCell>

                {/* Nombre */}
                <TableCell>
                  <div className="font-semibold text-text-primary text-sm flex items-center gap-2">
                    <span>{floor.name}</span>
                    {!floor.isActive && (
                      <span className="text-[10px] uppercase font-bold text-danger-text px-1.5 py-0.5 bg-danger-bg rounded-md">
                        Inactivo
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Conteo de Habitaciones */}
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium">
                      <FiHome className="w-3.5 h-3.5 text-text-tertiary" />
                      <span>{floor.totalRooms} habitación(es) en total</span>
                    </div>

                    {floor.totalRooms > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                        {floor.availableRooms > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
                            {floor.availableRooms} disp.
                          </span>
                        )}
                        {floor.occupiedRooms > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200/60 font-medium">
                            {floor.occupiedRooms} ocup.
                          </span>
                        )}
                        {floor.reservedRooms > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 font-medium">
                            {floor.reservedRooms} res.
                          </span>
                        )}
                        {floor.maintenanceRooms > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                            {floor.maintenanceRooms} mant.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Estado */}
                <TableCell className="text-center">
                  <Badge variant={floor.isActive ? "available" : "maintenance"}>
                    {floor.isActive ? "● Activo" : "● Inactivo"}
                  </Badge>
                </TableCell>

                {/* Acciones */}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {/* Editar */}
                    {canUpdate && (
                      <ButtonIcon
                        onClick={() => onEdit(floor)}
                        variant="warning"
                        icon={FiEdit2}
                        title={`Editar piso "${floor.name}" (ID #${floor.id})`}
                      />
                    )}

                    {/* Desactivar (si está activo) */}
                    {canDelete && floor.isActive && (
                      <ButtonIcon
                        onClick={() => onDeactivate(floor)}
                        variant="danger"
                        icon={FiSlash}
                        disabled={hasBusyRooms}
                        title={
                          hasBusyRooms
                            ? `No se puede desactivar: tiene habitaciones ocupadas (${floor.occupiedRooms}) o reservadas (${floor.reservedRooms})`
                            : `Desactivar piso "${floor.name}" (las habitaciones pasarán a Fuera de Servicio)`
                        }
                      />
                    )}

                    {/* Habilitar / Restaurar (si está inactivo) */}
                    {canUpdate && !floor.isActive && (
                      <ButtonIcon
                        onClick={() => onRestore(floor)}
                        variant="success"
                        icon={FiCheckCircle}
                        title={`Habilitar piso "${floor.name}" (las habitaciones volverán a estar Disponibles)`}
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
