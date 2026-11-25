"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FiPlus, FiHome } from "react-icons/fi";
import {
  SerializedRoom,
  SerializedFloorOption,
  SerializedRoomTypeOption,
} from "@/types/rooms";
import PageHeader from "../ui/PageHeader";
import {
  Pagination,
  SearchInput,
  Button,
  ConfirmModal,
  Select,
  type SelectOption,
} from "../ui";
import TableRooms from "./TableRooms";
import RoomModal from "./RoomModal";
import {
  setRoomOutOfServiceAction,
  restoreRoomToServiceAction,
} from "@/lib/room";
import { hasPermission } from "@/utils/permissions.utils";

interface RoomsProps {
  initialRooms: SerializedRoom[];
  floors: SerializedFloorOption[];
  roomTypes: SerializedRoomTypeOption[];
  overallCount: number;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  search: string;
  floorFilter: string;
  statusFilter: string;
  permissions: string[];
  userRole?: string | null;
}

export default function Rooms({
  initialRooms,
  floors,
  roomTypes,
  overallCount,
  totalItems,
  totalPages,
  currentPage,
  itemsPerPage,
  search,
  permissions,
  userRole,
}: RoomsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Estados para modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<SerializedRoom | null>(null);

  const [isOutOfServiceOpen, setIsOutOfServiceOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [targetRoom, setTargetRoom] = useState<SerializedRoom | null>(null);
  const [outOfServiceReason, setOutOfServiceReason] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Permisos granulares y retrocompatibles
  const canCreate = hasPermission(
    permissions,
    ["rooms:create", "rooms:manage"],
    userRole,
  );
  const canUpdate = hasPermission(
    permissions,
    ["rooms:update", "rooms:edit", "rooms:manage"],
    userRole,
  );
  const canManageStatus = hasPermission(
    permissions,
    ["rooms:update", "rooms:edit", "rooms:manage", "rooms:delete", "rooms:clean"],
    userRole,
  );

  // Filtros en URL
  const currentStatus = searchParams.get("status") || "all";
  const currentFloor = searchParams.get("floor") || "all";

  const handleStatusChange = (newStatus: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newStatus === "all") {
      params.delete("status");
    } else {
      params.set("status", newStatus);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleFloorChange = (newFloor: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newFloor === "all") {
      params.delete("floor");
    } else {
      params.set("floor", newFloor);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  // Opciones para los filtros usando el componente Select de UI
  const statusOptions: SelectOption[] = [
    { value: "all", label: "Todos los estados" },
    { value: "AVAILABLE", label: "Disponibles" },
    { value: "OCCUPIED", label: "Ocupadas" },
    { value: "CLEANING", label: "En Limpieza" },
    { value: "MAINTENANCE", label: "Fuera de Servicio" },
  ];

  const floorOptions: SelectOption[] = [
    { value: "all", label: "Todos los pisos" },
    ...floors.map((f) => ({
      value: String(f.id),
      label: `${f.name} (Nivel ${f.number})`,
    })),
  ];

  // Abrir Modal de Creación
  const handleOpenCreate = () => {
    setSelectedRoom(null);
    setIsModalOpen(true);
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (room: SerializedRoom) => {
    setSelectedRoom(room);
    setIsModalOpen(true);
  };

  // Abrir Confirmación para Poner Fuera de Servicio
  const handleOpenOutOfService = (room: SerializedRoom) => {
    setTargetRoom(room);
    setOutOfServiceReason("");
    setIsOutOfServiceOpen(true);
  };

  // Confirmar Fuera de Servicio (Mantenimiento)
  const handleConfirmOutOfService = async () => {
    if (!targetRoom) return;
    setIsActionLoading(true);

    try {
      const res = await setRoomOutOfServiceAction(
        targetRoom.id,
        outOfServiceReason,
      );
      if (res.success) {
        toast.success(res.message);
        setIsOutOfServiceOpen(false);
        setTargetRoom(null);
        router.refresh();
      } else {
        toast.error(res.message || "Error al poner habitación fuera de servicio.");
      }
    } catch (error) {
      console.error("Error al poner habitación fuera de servicio:", error);
      toast.error("Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Abrir Confirmación para Habilitar / Poner en Servicio
  const handleOpenRestore = (room: SerializedRoom) => {
    setTargetRoom(room);
    setIsRestoreOpen(true);
  };

  // Confirmar Habilitar (Disponible)
  const handleConfirmRestore = async () => {
    if (!targetRoom) return;
    setIsActionLoading(true);

    try {
      const res = await restoreRoomToServiceAction(targetRoom.id);
      if (res.success) {
        toast.success(res.message);
        setIsRestoreOpen(false);
        setTargetRoom(null);
        router.refresh();
      } else {
        toast.error(res.message || "Error al habilitar la habitación.");
      }
    } catch (error) {
      console.error("Error al habilitar habitación:", error);
      toast.error("Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Habitaciones"
        subtitle="Administración del inventario de habitaciones, asignación por piso y control de estado."
        breadcrumbs={[
          { label: "admin", href: "/admin" },
          { label: "habitaciones" },
        ]}
        action={
          canCreate ? (
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              className="shadow-2xs font-semibold"
            >
              <FiPlus className="w-4 h-4" />
              <span>Nueva Habitación</span>
            </Button>
          ) : null
        }
      />

      {/* Main Content Card */}
      <div className="bg-bg-card border border-border-default/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Filters Bar */}
            <div className="px-6 py-4 border-b border-border-soft flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-bg-card justify-between">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                <div className="w-full sm:w-72">
                  <SearchInput
                    placeholder="Buscar por número (ej: 101, VIP)..."
                    className="max-w-none"
                  />
                </div>

                    {/* Filtro por Piso con componente Select */}
            <div className="w-full sm:w-48">
                    <Select
                      value={currentFloor}
                      onValueChange={handleFloorChange}
                      options={floorOptions}
                      placeholder="Todos los pisos"
                      searchable={false}
                    />
                </div>

              {/* Filtro por Estado con componente Select */}
              <div className="w-full sm:w-48">
                <Select
                  value={currentStatus}
                  onValueChange={handleStatusChange}
                  options={statusOptions}
                  placeholder="Todos los estados"
                  searchable={false}
                />
              </div>
            </div>

          <div className="text-xs text-text-secondary select-none font-medium whitespace-nowrap self-start xl:self-center">
            Total: <span className="font-bold text-text-primary">{totalItems}</span>{" "}
            {totalItems === 1
              ? "habitación encontrada"
              : "habitaciones encontradas"}
          </div>
        </div>

            {/* Content / Empty State */}
            {initialRooms.length === 0 ? (
              <div className="p-12 text-center select-none bg-bg-card">
                <FiHome className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
                <h3 className="text-sm font-bold text-text-primary">
                  {overallCount === 0
                    ? "No hay habitaciones registradas"
                    : "No se encontraron habitaciones"}
                </h3>
                <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                  {overallCount === 0
                    ? "Comienza creando tu primera habitación para gestionar el Rack y las reservas."
                    : search
                      ? `No hay habitaciones que coincidan con "${search}".`
                      : "Intenta cambiar los filtros de piso o estado aplicados."}
                </p>
                {overallCount === 0 && canCreate && (
                  <div className="mt-4">
                    <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                      <FiPlus className="w-4 h-4" />
                      <span>Crear Primera Habitación</span>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Table Component */}
                <TableRooms
                  rooms={initialRooms}
                  currentPage={currentPage}
                  itemsPerPage={itemsPerPage}
                  canUpdate={canUpdate}
                  canManageStatus={canManageStatus}
                  onEdit={handleOpenEdit}
                  onSetOutOfService={handleOpenOutOfService}
                  onRestoreToService={handleOpenRestore}
                />

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
        />
      </>
        )}
    </div>

  {/* MODAL DE CREAR / EDITAR CON VALIDACIÓN ZOD */ }
  <RoomModal
    isOpen={isModalOpen}
    onClose={() => setIsModalOpen(false)}
    room={selectedRoom}
    floors={floors}
    roomTypes={roomTypes}
    onSuccess={() => router.refresh()}
  />

  {/* MODAL DE CONFIRMACIÓN: PONER FUERA DE SERVICIO (MANTENIMIENTO) */ }
  <ConfirmModal
    isOpen={isOutOfServiceOpen}
    onClose={() => {
      setIsOutOfServiceOpen(false);
      setTargetRoom(null);
      setOutOfServiceReason("");
    }}
    onConfirm={handleConfirmOutOfService}
    title={`¿Poner la habitación "${targetRoom?.number}" fuera de servicio?`}
    description={`La habitación pasará a estado FUERA DE SERVICIO (Mantenimiento).\n\nNo estará disponible para nuevas reservas ni registros de check-in en recepción hasta que sea habilitada nuevamente.`}
    confirmText="Sí, poner fuera de servicio"
    cancelText="Conservar en servicio"
    variant="danger"
    isLoading={isActionLoading}
  />

  {/* MODAL DE CONFIRMACIÓN: HABILITAR / PONER EN SERVICIO */ }
  <ConfirmModal
    isOpen={isRestoreOpen}
    onClose={() => {
      setIsRestoreOpen(false);
      setTargetRoom(null);
    }}
    onConfirm={handleConfirmRestore}
    title={`¿Habilitar la habitación "${targetRoom?.number}"?`}
    description={`La habitación pasará a estado DISPONIBLE y estará lista para ser asignada a huéspedes y reservas de inmediato.`}
    confirmText="Sí, habilitar habitación"
    cancelText="Cancelar"
    variant="success"
    isLoading={isActionLoading}
  />
    </div >
  );
}
