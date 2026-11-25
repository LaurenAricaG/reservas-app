"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FiPlus, FiLayers } from "react-icons/fi";
import { SerializedFloor } from "@/types/floors";
import PageHeader from "../ui/PageHeader";
import {
  Pagination,
  SearchInput,
  Button,
  ConfirmModal,
  Select,
  type SelectOption,
} from "../ui";
import TableFloors from "./TableFloors";
import FloorModal from "./FloorModal";
import {
  deactivateFloorAction,
  restoreFloorAction,
} from "@/lib/floor";
import { hasPermission } from "@/utils/permissions.utils";

interface FloorsProps {
  initialFloors: SerializedFloor[];
  overallCount: number;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  search: string;
  statusFilter: string;
  permissions: string[];
  userRole?: string | null;
}

export default function Floors({
  initialFloors,
  overallCount,
  totalItems,
  totalPages,
  currentPage,
  itemsPerPage,
  search,
  permissions,
  userRole,
}: FloorsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Estados para modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<SerializedFloor | null>(null);

  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [targetFloor, setTargetFloor] = useState<SerializedFloor | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Permisos granulares y retrocompatibles
  const canCreate = hasPermission(
    permissions,
    ["floors:create", "floors:manage", "rooms:create", "rooms:manage"],
    userRole,
  );
  const canUpdate = hasPermission(
    permissions,
    ["floors:update", "floors:edit", "floors:manage", "rooms:update", "rooms:edit", "rooms:manage"],
    userRole,
  );
  const canDelete = hasPermission(
    permissions,
    ["floors:delete", "floors:manage", "rooms:delete", "rooms:manage"],
    userRole,
  );

  // Filtros en URL
  const currentStatus = searchParams.get("status") || "all";

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

  // Opciones para el select de estado
  const statusOptions: SelectOption[] = [
    { value: "all", label: "Todos los estados" },
    { value: "active", label: "Activos" },
    { value: "inactive", label: "Inactivos" },
  ];

  // Abrir Modal de Creación
  const handleOpenCreate = () => {
    setSelectedFloor(null);
    setIsModalOpen(true);
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (floor: SerializedFloor) => {
    setSelectedFloor(floor);
    setIsModalOpen(true);
  };

  // Abrir Confirmación para Desactivar Piso
  const handleOpenDeactivate = (floor: SerializedFloor) => {
    setTargetFloor(floor);
    setIsDeactivateOpen(true);
  };

  // Confirmar Desactivación de Piso
  const handleConfirmDeactivate = async () => {
    if (!targetFloor) return;
    setIsActionLoading(true);

    try {
      const res = await deactivateFloorAction(targetFloor.id);
      if (res.success) {
        toast.success(res.message);
        setIsDeactivateOpen(false);
        setTargetFloor(null);
        router.refresh();
      } else {
        toast.error(res.message || "Error al desactivar el piso.");
      }
    } catch (error) {
      console.error("Error al desactivar piso:", error);
      toast.error("Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Abrir Confirmación para Habilitar Piso
  const handleOpenRestore = (floor: SerializedFloor) => {
    setTargetFloor(floor);
    setIsRestoreOpen(true);
  };

  // Confirmar Habilitación de Piso
  const handleConfirmRestore = async () => {
    if (!targetFloor) return;
    setIsActionLoading(true);

    try {
      const res = await restoreFloorAction(targetFloor.id);
      if (res.success) {
        toast.success(res.message);
        setIsRestoreOpen(false);
        setTargetFloor(null);
        router.refresh();
      } else {
        toast.error(res.message || "Error al habilitar el piso.");
      }
    } catch (error) {
      console.error("Error al habilitar piso:", error);
      toast.error("Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pisos"
        subtitle="Administración de los niveles del hotel, control de operatividad y estado general de habitaciones."
        breadcrumbs={[
          { label: "admin", href: "/admin" },
          { label: "pisos" },
        ]}
        action={
          canCreate ? (
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              className="shadow-2xs font-semibold"
            >
              <FiPlus className="w-4 h-4" />
              <span>Nuevo Piso</span>
            </Button>
          ) : null
        }
      />

      {/* Main Content Card - sin overflow-hidden para que los selects floten sin cortarse */}
      <div className="bg-bg-card border border-border-default/80 rounded-2xl shadow-xs min-h-[360px] flex flex-col justify-between">
        {/* Filters Bar con relative z-20 */}
        <div className="px-6 py-4 border-b border-border-soft flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-bg-card justify-between rounded-t-2xl relative z-20">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="w-full sm:w-80">
              <SearchInput
                placeholder="Buscar por nombre o nivel (ej: Piso 1, 2)..."
                className="max-w-none"
              />
            </div>

            {/* Filtro por Estado con Select UI */}
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
            {totalItems === 1 ? "piso encontrado" : "pisos encontrados"}
          </div>
        </div>

        {/* Content / Empty State */}
        {initialFloors.length === 0 ? (
          <div className="p-12 text-center select-none bg-bg-card flex-1 flex flex-col items-center justify-center rounded-b-2xl">
            <FiLayers className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
            <h3 className="text-sm font-bold text-text-primary">
              {overallCount === 0
                ? "No hay pisos registrados"
                : "No se encontraron pisos"}
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
              {overallCount === 0
                ? "Comienza registrando tu primer piso para organizar las habitaciones y niveles del hotel."
                : search
                  ? `No hay pisos que coincidan con "${search}".`
                  : "Intenta cambiar el filtro de estado seleccionado."}
            </p>
            {overallCount === 0 && canCreate && (
              <div className="mt-4">
                <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                  <FiPlus className="w-4 h-4" />
                  <span>Crear Primer Piso</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between">
            {/* Table Component */}
            <TableFloors
              floors={initialFloors}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={handleOpenEdit}
              onDeactivate={handleOpenDeactivate}
              onRestore={handleOpenRestore}
            />

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
      </div>

      {/* MODAL DE CREAR / EDITAR CON VALIDACIÓN ZOD */}
      <FloorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        floor={selectedFloor}
        onSuccess={() => router.refresh()}
      />

      {/* MODAL DE CONFIRMACIÓN: DESACTIVAR PISO */}
      <ConfirmModal
        isOpen={isDeactivateOpen}
        onClose={() => {
          setIsDeactivateOpen(false);
          setTargetFloor(null);
        }}
        onConfirm={handleConfirmDeactivate}
        title={`¿Desactivar el piso "${targetFloor?.name}"?`}
        description={`Al desactivar este piso:\n\n• Todas sus habitaciones pasarán automáticamente a estado FUERA DE SERVICIO (Mantenimiento) hasta que se habilite el piso nuevamente.\n• Solo se podrá desactivar si todas las habitaciones del piso se encuentran libres (sin huéspedes ocupando ni reservas activas).`}
        confirmText="Sí, desactivar piso"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isActionLoading}
      />

      {/* MODAL DE CONFIRMACIÓN: HABILITAR PISO */}
      <ConfirmModal
        isOpen={isRestoreOpen}
        onClose={() => {
          setIsRestoreOpen(false);
          setTargetFloor(null);
        }}
        onConfirm={handleConfirmRestore}
        title={`¿Habilitar el piso "${targetFloor?.name}"?`}
        description={`El piso volverá a estar ACTIVO y sus habitaciones en mantenimiento pasarán a estado DISPONIBLE, listas para recibir huéspedes y reservas.`}
        confirmText="Sí, habilitar piso"
        cancelText="Cancelar"
        variant="success"
        isLoading={isActionLoading}
      />
    </div>
  );
}
