"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FiPlus, FiLayers } from "react-icons/fi";
import { SerializedRoomType } from "@/types/roomTypes";
import PageHeader from "../ui/PageHeader";
import {
  Pagination,
  SearchInput,
  Button,
  ConfirmModal,
  Select,
  type SelectOption,
} from "../ui";
import TableRoomTypes from "./TableRoomTypes";
import RoomTypeModal from "./RoomTypeModal";
import {
  deactivateRoomTypeAction,
  restoreRoomTypeAction,
} from "@/lib/roomType";
import { hasPermission } from "@/utils/permissions.utils";

interface RoomTypesProps {
  initialRoomTypes: SerializedRoomType[];
  overallCount: number;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  search: string;
  status: string;
  permissions: string[];
  userRole?: string | null;
}

export default function RoomTypes({
  initialRoomTypes,
  overallCount,
  totalItems,
  totalPages,
  currentPage,
  itemsPerPage,
  search,
  status,
  permissions,
  userRole,
}: RoomTypesProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Estados para modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoomType, setSelectedRoomType] =
    useState<SerializedRoomType | null>(null);

  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [targetRoomType, setTargetRoomType] =
    useState<SerializedRoomType | null>(null);
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
  const canDelete = hasPermission(
    permissions,
    ["rooms:delete", "rooms:manage"],
    userRole,
  );

  // Filtro de estado
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

  const statusOptions: SelectOption[] = [
    { value: "all", label: "Todos los estados" },
    { value: "active", label: "Activos" },
    { value: "inactive", label: "Inactivos" },
  ];

  // Abrir Modal de Creación
  const handleOpenCreate = () => {
    setSelectedRoomType(null);
    setIsModalOpen(true);
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (roomType: SerializedRoomType) => {
    setSelectedRoomType(roomType);
    setIsModalOpen(true);
  };

  // Abrir Confirmación de Dar de Baja
  const handleOpenDeactivate = (roomType: SerializedRoomType) => {
    setTargetRoomType(roomType);
    setIsDeactivateOpen(true);
  };

  // Confirmar Dar de Baja
  const handleConfirmDeactivate = async () => {
    if (!targetRoomType) return;
    setIsActionLoading(true);

    try {
      const res = await deactivateRoomTypeAction(targetRoomType.id);
      if (res.success) {
        toast.success(res.message);
        setIsDeactivateOpen(false);
        setTargetRoomType(null);
        router.refresh();
      } else {
        toast.error(res.message || "Error al dar de baja el tipo de habitación.");
      }
    } catch (error) {
      console.error("Error al desactivar tipo de habitación:", error);
      toast.error("Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Abrir Confirmación de Restaurar
  const handleOpenRestore = (roomType: SerializedRoomType) => {
    setTargetRoomType(roomType);
    setIsRestoreOpen(true);
  };

  // Confirmar Restaurar
  const handleConfirmRestore = async () => {
    if (!targetRoomType) return;
    setIsActionLoading(true);

    try {
      const res = await restoreRoomTypeAction(targetRoomType.id);
      if (res.success) {
        toast.success(res.message);
        setIsRestoreOpen(false);
        setTargetRoomType(null);
        router.refresh();
      } else {
        toast.error(res.message || "Error al restaurar el tipo de habitación.");
      }
    } catch (error) {
      console.error("Error al restaurar tipo de habitación:", error);
      toast.error("Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tipos de Habitación"
        subtitle="Administración de categorías, tarifas y comodidades de habitaciones del hotel."
        breadcrumbs={[
          { label: "admin", href: "/admin" },
          { label: "tipos de habitación" },
        ]}
        action={
          canCreate ? (
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              className="shadow-2xs font-semibold"
            >
              <FiPlus className="w-4 h-4" />
              <span>Nuevo Tipo</span>
            </Button>
          ) : null
        }
      />

      {/* Main Content Card - sin overflow-hidden para que los selects no se corten */}
      <div className="bg-bg-card border border-border-default/80 rounded-2xl shadow-xs">
        {/* Filters Bar con relative z-20 */}
        <div className="px-6 py-4 border-b border-border-soft flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-bg-card justify-between rounded-t-2xl relative z-20">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="w-full sm:w-80">
              <SearchInput
                placeholder="Buscar por nombre de tipo..."
                className="max-w-none"
              />
            </div>

            {/* Filtro por Estado */}
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
              ? "tipo encontrado"
              : "tipos encontrados"}
          </div>
        </div>

        {/* Content / Empty State */}
        {initialRoomTypes.length === 0 ? (
          <div className="p-12 text-center select-none bg-bg-card rounded-b-2xl">
            <FiLayers className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
            <h3 className="text-sm font-bold text-text-primary">
              {overallCount === 0
                ? "No hay tipos de habitación registrados"
                : "No se encontraron tipos de habitación"}
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
              {overallCount === 0
                ? "Comienza creando tipos de cuarto (ej: Simple, Matrimonial, Suite) para asignar tus habitaciones."
                : search
                  ? `No hay resultados para "${search}". Intenta con otros términos de búsqueda.`
                  : currentStatus !== "all"
                    ? `No hay tipos de habitación con estado "${currentStatus === "active" ? "Activo" : "Inactivo"}".`
                    : "Intenta cambiar los términos de búsqueda o filtros aplicados."}
            </p>
            {overallCount === 0 && canCreate && (
              <div className="mt-4">
                <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                  <FiPlus className="w-4 h-4" />
                  <span>Crear Primer Tipo</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Table Component */}
            <TableRoomTypes
              roomTypes={initialRoomTypes}
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
          </>
        )}
      </div>

      {/* MODAL DE CREAR / EDITAR CON VALIDACIÓN ZOD */}
      <RoomTypeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roomType={selectedRoomType}
        onSuccess={() => router.refresh()}
      />

      {/* MODAL DE CONFIRMACIÓN: DAR DE BAJA (DESACTIVAR) */}
      <ConfirmModal
        isOpen={isDeactivateOpen}
        onClose={() => {
          setIsDeactivateOpen(false);
          setTargetRoomType(null);
        }}
        onConfirm={handleConfirmDeactivate}
        title={`¿Dar de baja el tipo "${targetRoomType?.name}"?`}
        description={`El tipo de habitación (ID #${targetRoomType?.id}) pasará a estado inactivo.\n\nLas ${targetRoomType?._count?.rooms ?? 0} habitaciones físicas asociadas permanecerán en el sistema, pero este tipo no estará disponible para nuevas habitaciones ni reservas hasta que sea reactivado.`}
        confirmText="Sí, dar de baja"
        cancelText="Conservar activo"
        variant="danger"
        isLoading={isActionLoading}
      />

      {/* MODAL DE CONFIRMACIÓN: RESTAURAR (ACTIVAR) */}
      <ConfirmModal
        isOpen={isRestoreOpen}
        onClose={() => {
          setIsRestoreOpen(false);
          setTargetRoomType(null);
        }}
        onConfirm={handleConfirmRestore}
        title={`¿Restaurar tipo "${targetRoomType?.name}"?`}
        description={`El tipo de habitación (ID #${targetRoomType?.id}) volverá a estar activo y disponible en el hotel.`}
        confirmText="Sí, restaurar tipo"
        cancelText="Cancelar"
        variant="success"
        isLoading={isActionLoading}
      />
    </div>
  );
}
