"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FiPlus, FiTag } from "react-icons/fi";
import { cn } from "@/utils/cn.utils";
import { SerializedCategory } from "@/types/categories";
import PageHeader from "../ui/PageHeader";
import { Pagination, SearchInput, Button, ConfirmModal } from "../ui";
import TableCategories from "./TableCategories";
import CategoryModal from "./CategoryModal";
import {
  deactivateCategoryAction,
  restoreCategoryAction,
} from "@/lib/category";

interface CategoriesProps {
  initialCategories: SerializedCategory[];
  overallCount: number;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  search: string;
  status: string;
  permissions: string[];
}

export default function Categories({
  initialCategories,
  overallCount,
  totalItems,
  totalPages,
  currentPage,
  itemsPerPage,
  search,
  status,
  permissions,
}: CategoriesProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Estados para modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<SerializedCategory | null>(null);

  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [targetCategory, setTargetCategory] =
    useState<SerializedCategory | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Permisos
  const canCreate =
    permissions.includes("categories:create") ||
    permissions.includes("products:manage") ||
    permissions.includes("categories:read");
  const canUpdate =
    permissions.includes("categories:update") ||
    permissions.includes("products:manage") ||
    permissions.includes("categories:read");
  const canDelete =
    permissions.includes("categories:delete") ||
    permissions.includes("products:manage") ||
    permissions.includes("categories:read");

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

  // Abrir Modal de Creación
  const handleOpenCreate = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (category: SerializedCategory) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  // Abrir Confirmación de Dar de Baja
  const handleOpenDeactivate = (category: SerializedCategory) => {
    setTargetCategory(category);
    setIsDeactivateOpen(true);
  };

  // Confirmar Dar de Baja
  const handleConfirmDeactivate = async () => {
    if (!targetCategory) return;
    setIsActionLoading(true);

    try {
      const res = await deactivateCategoryAction(targetCategory.id);
      if (res.success) {
        toast.success(res.message);
        setIsDeactivateOpen(false);
        setTargetCategory(null);
        router.refresh();
      } else {
        toast.error(res.message || "Error al dar de baja la categoría.");
      }
    } catch (error) {
      console.error("Error al desactivar categoría:", error);
      toast.error("Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Abrir Confirmación de Restaurar
  const handleOpenRestore = (category: SerializedCategory) => {
    setTargetCategory(category);
    setIsRestoreOpen(true);
  };

  // Confirmar Restaurar
  const handleConfirmRestore = async () => {
    if (!targetCategory) return;
    setIsActionLoading(true);

    try {
      const res = await restoreCategoryAction(targetCategory.id);
      if (res.success) {
        toast.success(res.message);
        setIsRestoreOpen(false);
        setTargetCategory(null);
        router.refresh();
      } else {
        toast.error(res.message || "Error al restaurar la categoría.");
      }
    } catch (error) {
      console.error("Error al restaurar categoría:", error);
      toast.error("Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Categorías"
        subtitle="Administración de categorías para clasificación de productos y consumos."
        breadcrumbs={[
          { label: "admin", href: "/admin" },
          { label: "categorías" },
        ]}
        action={
          canCreate ? (
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              className="shadow-2xs font-semibold"
            >
              <FiPlus className="w-4 h-4" />
              <span>Nueva Categoría</span>
            </Button>
          ) : null
        }
      />

      {/* Main Content */}
      <div className="bg-bg-card border border-border-default/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Filters Bar */}
        <div className="px-6 py-4 border-b border-border-soft flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-bg-card justify-between">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-xl">
            <SearchInput placeholder="Buscar por nombre de categoría..." />

            {/* Selector Rápido de Estado */}
            <div className="flex items-center gap-1 p-1 bg-bg-surface border border-border-soft rounded-xl text-xs font-medium self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleStatusChange("all")}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg transition-all cursor-pointer",
                  currentStatus === "all"
                    ? "bg-bg-card text-brand-700 shadow-2xs font-bold"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("active")}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg transition-all cursor-pointer",
                  currentStatus === "active"
                    ? "bg-bg-card text-brand-700 shadow-2xs font-bold"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                Activas
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("inactive")}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg transition-all cursor-pointer",
                  currentStatus === "inactive"
                    ? "bg-bg-card text-brand-700 shadow-2xs font-bold"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                Inactivas
              </button>
            </div>
          </div>

          <div className="text-xs text-text-secondary select-none font-medium">
            Total: {totalItems}{" "}
            {totalItems === 1
              ? "categoría encontrada"
              : "categorías encontradas"}
          </div>
        </div>

        {/* Content / Empty State */}
        {initialCategories.length === 0 ? (
          <div className="p-12 text-center select-none bg-bg-card">
            <FiTag className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
            <h3 className="text-sm font-bold text-text-primary">
              {overallCount === 0
                ? "No hay categorías registradas"
                : "No se encontraron categorías"}
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
              {overallCount === 0
                ? "Para comenzar a organizar tus productos, crea tu primera categoría global."
                : search
                  ? `No hay resultados para "${search}". Intenta con otros términos de búsqueda.`
                  : currentStatus !== "all"
                    ? `No hay categorías con estado "${currentStatus === "active" ? "Activa" : "Inactiva"}".`
                    : "Intenta cambiar los términos de búsqueda o filtros aplicados."}
            </p>
            {overallCount === 0 && canCreate && (
              <div className="mt-4">
                <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                  <FiPlus className="w-4 h-4" />
                  <span>Crear Primera Categoría</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Table Component */}
            <TableCategories
              categories={initialCategories}
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
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={selectedCategory}
        onSuccess={() => router.refresh()}
      />

      {/* MODAL DE CONFIRMACIÓN: DAR DE BAJA (DESACTIVAR) */}
      <ConfirmModal
        isOpen={isDeactivateOpen}
        onClose={() => {
          setIsDeactivateOpen(false);
          setTargetCategory(null);
        }}
        onConfirm={handleConfirmDeactivate}
        title={`¿Dar de baja la categoría "${targetCategory?.name}"?`}
        description={`La categoría (ID #${targetCategory?.id}) pasará a estado inactivo.\n\nLos productos asociados permanecerán registrados en el hotel pero la categoría no estará disponible para nuevos consumos hasta que sea restaurada.`}
        confirmText="Sí, dar de baja"
        cancelText="Conservar activa"
        variant="danger"
        isLoading={isActionLoading}
      />

      {/* MODAL DE CONFIRMACIÓN: RESTAURAR (ACTIVAR) */}
      <ConfirmModal
        isOpen={isRestoreOpen}
        onClose={() => {
          setIsRestoreOpen(false);
          setTargetCategory(null);
        }}
        onConfirm={handleConfirmRestore}
        title={`¿Restaurar categoría "${targetCategory?.name}"?`}
        description={`La categoría (ID #${targetCategory?.id}) volverá a estar activa y disponible en todo el catálogo del sistema.`}
        confirmText="Sí, restaurar categoría"
        cancelText="Cancelar"
        variant="success"
        isLoading={isActionLoading}
      />
    </div>
  );
}
