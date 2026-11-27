"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FiPlus, FiUsers } from "react-icons/fi";
import { SerializedGuest } from "@/types/guests";
import PageHeader from "../ui/PageHeader";
import {
  Pagination,
  SearchInput,
  Button,
  ConfirmModal,
  Select,
  type SelectOption,
} from "../ui";
import TableGuests from "./TableGuests";
import GuestModal from "./GuestModal";
import {
  deactivateGuestAction,
  restoreGuestAction,
} from "@/lib/guest";
import { hasPermission } from "@/utils/permissions.utils";

interface GuestsProps {
  initialGuests: SerializedGuest[];
  overallCount: number;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  search: string;
  docTypeFilter: string;
  statusFilter: string;
  permissions: string[];
  userRole?: string | null;
}

export default function Guests({
  initialGuests,
  overallCount,
  totalItems,
  totalPages,
  currentPage,
  itemsPerPage,
  search,
  permissions,
  userRole,
}: GuestsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Estados para modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<SerializedGuest | null>(null);

  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [targetGuest, setTargetGuest] = useState<SerializedGuest | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Permisos granulares y retrocompatibles
  const canCreate = hasPermission(
    permissions,
    ["guests:create", "guests:manage"],
    userRole,
  );
  const canUpdate = hasPermission(
    permissions,
    ["guests:update", "guests:edit", "guests:manage"],
    userRole,
  );
  const canDelete = hasPermission(
    permissions,
    ["guests:delete", "guests:manage"],
    userRole,
  );

  // Filtros en URL
  const currentStatus = searchParams.get("status") || "all";
  const currentDocType = searchParams.get("docType") || "all";

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

  const handleDocTypeChange = (newDocType: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newDocType === "all") {
      params.delete("docType");
    } else {
      params.set("docType", newDocType);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  // Opciones para los filtros Select
  const statusOptions: SelectOption[] = [
    { value: "all", label: "Todos los estados" },
    { value: "active", label: "Activos" },
    { value: "inactive", label: "Inactivos" },
  ];

  const docTypeOptions: SelectOption[] = [
    { value: "all", label: "Todos los documentos" },
    { value: "DNI", label: "DNI" },
    { value: "RUC", label: "RUC" },
    { value: "PASSPORT", label: "Pasaporte" },
    { value: "FOREIGNER_CARD", label: "Carnet de Extranjería" },
    { value: "OTHER", label: "Otro" },
  ];

  // Abrir Modal de Creación
  const handleOpenCreate = () => {
    setSelectedGuest(null);
    setIsModalOpen(true);
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (guest: SerializedGuest) => {
    setSelectedGuest(guest);
    setIsModalOpen(true);
  };

  // Abrir Confirmación para Desactivar Huésped
  const handleOpenDeactivate = (guest: SerializedGuest) => {
    setTargetGuest(guest);
    setIsDeactivateOpen(true);
  };

  // Confirmar Desactivación de Huésped
  const handleConfirmDeactivate = async () => {
    if (!targetGuest) return;
    setIsActionLoading(true);

    try {
      const res = await deactivateGuestAction(targetGuest.id);
      if (res.success) {
        toast.success(res.message);
        setIsDeactivateOpen(false);
        setTargetGuest(null);
        router.refresh();
      } else {
        toast.error(res.message || "Error al desactivar al huésped.");
      }
    } catch (error) {
      console.error("Error al desactivar huésped:", error);
      toast.error("Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Abrir Confirmación para Habilitar Huésped
  const handleOpenRestore = (guest: SerializedGuest) => {
    setTargetGuest(guest);
    setIsRestoreOpen(true);
  };

  // Confirmar Habilitación de Huésped
  const handleConfirmRestore = async () => {
    if (!targetGuest) return;
    setIsActionLoading(true);

    try {
      const res = await restoreGuestAction(targetGuest.id);
      if (res.success) {
        toast.success(res.message);
        setIsRestoreOpen(false);
        setTargetGuest(null);
        router.refresh();
      } else {
        toast.error(res.message || "Error al habilitar al huésped.");
      }
    } catch (error) {
      console.error("Error al habilitar huésped:", error);
      toast.error("Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Huéspedes"
        subtitle="Directorio maestro de clientes y huéspedes, registro de identidad, datos de facturación e historial."
        breadcrumbs={[
          { label: "admin", href: "/admin" },
          { label: "huéspedes" },
        ]}
        action={
          canCreate ? (
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              className="shadow-2xs font-semibold"
            >
              <FiPlus className="w-4 h-4" />
              <span>Nuevo Huésped</span>
            </Button>
          ) : null
        }
      />

      {/* Main Content Card - sin overflow-hidden para que los selects floten sin cortarse */}
      <div className="bg-bg-card border border-border-default/80 rounded-2xl shadow-xs">
        {/* Filters Bar con relative z-20 */}
        <div className="px-6 py-4 border-b border-border-soft flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-bg-card justify-between rounded-t-2xl relative z-20">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="w-full sm:w-80">
              <SearchInput
                placeholder="Buscar por nombre, apellido o documento..."
                className="max-w-none"
              />
            </div>

            {/* Filtro por Tipo de Documento */}
            <div className="w-full sm:w-52">
              <Select
                value={currentDocType}
                onValueChange={handleDocTypeChange}
                options={docTypeOptions}
                placeholder="Todos los documentos"
                searchable={false}
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
            {totalItems === 1 ? "huésped encontrado" : "huéspedes encontrados"}
          </div>
        </div>

        {/* Content / Empty State */}
        {initialGuests.length === 0 ? (
          <div className="p-12 text-center select-none bg-bg-card flex-1 flex flex-col items-center justify-center rounded-b-2xl">
            <FiUsers className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
            <h3 className="text-sm font-bold text-text-primary">
              {overallCount === 0
                ? "No hay huéspedes registrados"
                : "No se encontraron huéspedes"}
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
              {overallCount === 0
                ? "Comienza registrando tu primer cliente o huésped para check-in y reservas."
                : search
                  ? `No hay huéspedes que coincidan con "${search}".`
                  : "Intenta cambiar los filtros de documento o estado seleccionados."}
            </p>
            {overallCount === 0 && canCreate && (
              <div className="mt-4">
                <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                  <FiPlus className="w-4 h-4" />
                  <span>Crear Primer Huésped</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Table Component */}
            <TableGuests
              guests={initialGuests}
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
      <GuestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        guest={selectedGuest}
        onSuccess={() => router.refresh()}
      />

      {/* MODAL DE CONFIRMACIÓN: DESACTIVAR HUÉSPED */}
      <ConfirmModal
        isOpen={isDeactivateOpen}
        onClose={() => {
          setIsDeactivateOpen(false);
          setTargetGuest(null);
        }}
        onConfirm={handleConfirmDeactivate}
        title={`¿Dar de baja al huésped "${targetGuest?.fullName}"?`}
        description={`El huésped pasará a estado INACTIVO.\n\nNo estará disponible para asignarle nuevas reservas ni check-in hasta que sea habilitado nuevamente.`}
        confirmText="Sí, dar de baja"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isActionLoading}
      />

      {/* MODAL DE CONFIRMACIÓN: HABILITAR HUÉSPED */}
      <ConfirmModal
        isOpen={isRestoreOpen}
        onClose={() => {
          setIsRestoreOpen(false);
          setTargetGuest(null);
        }}
        onConfirm={handleConfirmRestore}
        title={`¿Habilitar al huésped "${targetGuest?.fullName}"?`}
        description={`El huésped volverá a estar ACTIVO y disponible en el directorio para recibir nuevas reservas y check-in.`}
        confirmText="Sí, habilitar huésped"
        cancelText="Cancelar"
        variant="success"
        isLoading={isActionLoading}
      />
    </div>
  );
}
