"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FiPlus, FiShoppingBag } from "react-icons/fi";
import { SerializedProduct, SerializedCategoryOption } from "@/types/products";
import PageHeader from "../ui/PageHeader";
import {
  Pagination,
  SearchInput,
  Button,
  ConfirmModal,
  Select,
  type SelectOption,
} from "../ui";
import TableProducts from "./TableProducts";
import ProductModal from "./ProductModal";
import {
  deactivateProductAction,
  restoreProductAction,
} from "@/lib/product";
import { hasPermission } from "@/utils/permissions.utils";

interface ProductsProps {
  initialProducts: SerializedProduct[];
  categories: SerializedCategoryOption[];
  overallCount: number;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  search: string;
  categoryFilter: string;
  statusFilter: string;
  permissions: string[];
  userRole?: string | null;
}

export default function Products({
  initialProducts,
  categories,
  overallCount,
  totalItems,
  totalPages,
  currentPage,
  itemsPerPage,
  search,
  permissions,
  userRole,
}: ProductsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Estados para modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SerializedProduct | null>(null);

  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [targetProduct, setTargetProduct] = useState<SerializedProduct | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Permisos granulares y retrocompatibles
  const canCreate = hasPermission(
    permissions,
    ["products:create", "products:manage"],
    userRole,
  );
  const canUpdate = hasPermission(
    permissions,
    ["products:update", "products:edit", "products:manage"],
    userRole,
  );
  const canDelete = hasPermission(
    permissions,
    ["products:delete", "products:manage"],
    userRole,
  );

  // Filtros en URL
  const currentStatus = searchParams.get("status") || "all";
  const currentCategory = searchParams.get("category") || "all";

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

  const handleCategoryChange = (newCategory: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newCategory === "all") {
      params.delete("category");
    } else {
      params.set("category", newCategory);
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

  const categoryOptions: SelectOption[] = [
    { value: "all", label: "Todas las categorías" },
    ...categories.map((cat) => ({
      value: String(cat.id),
      label: cat.name,
    })),
  ];

  // Abrir Modal de Creación
  const handleOpenCreate = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (product: SerializedProduct) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  // Abrir Confirmación para Desactivar Producto
  const handleOpenDeactivate = (product: SerializedProduct) => {
    setTargetProduct(product);
    setIsDeactivateOpen(true);
  };

  // Confirmar Desactivación de Producto
  const handleConfirmDeactivate = async () => {
    if (!targetProduct) return;
    setIsActionLoading(true);

    try {
      const res = await deactivateProductAction(targetProduct.id);
      if (res.success) {
        toast.success(res.message);
        setIsDeactivateOpen(false);
        setTargetProduct(null);
        router.refresh();
      } else {
        toast.error(res.message || "Error al desactivar el producto.");
      }
    } catch (error) {
      console.error("Error al desactivar producto:", error);
      toast.error("Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Abrir Confirmación para Habilitar Producto
  const handleOpenRestore = (product: SerializedProduct) => {
    setTargetProduct(product);
    setIsRestoreOpen(true);
  };

  // Confirmar Habilitación de Producto
  const handleConfirmRestore = async () => {
    if (!targetProduct) return;
    setIsActionLoading(true);

    try {
      const res = await restoreProductAction(targetProduct.id);
      if (res.success) {
        toast.success(res.message);
        setIsRestoreOpen(false);
        setTargetProduct(null);
        router.refresh();
      } else {
        toast.error(res.message || "Error al habilitar el producto.");
      }
    } catch (error) {
      console.error("Error al habilitar producto:", error);
      toast.error("Ocurrió un error inesperado al procesar la solicitud.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Productos y Consumos"
        subtitle="Administración del catálogo de productos, bebidas, snacks y artículos para minibar y recepción."
        breadcrumbs={[
          { label: "admin", href: "/admin" },
          { label: "productos" },
        ]}
        action={
          canCreate ? (
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              className="shadow-2xs font-semibold"
            >
              <FiPlus className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </Button>
          ) : null
        }
      />

      {/* Main Content Card - sin overflow-hidden para que los selects no se corten */}
      <div className="bg-bg-card border border-border-default/80 rounded-2xl shadow-xs">
        {/* Filters Bar con relative z-20 */}
        <div className="px-6 py-4 border-b border-border-soft flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-bg-card justify-between rounded-t-2xl relative z-20">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="w-full sm:w-72">
              <SearchInput
                placeholder="Buscar por nombre de producto..."
                className="max-w-none"
              />
            </div>

            {/* Filtro por Categoría */}
            <div className="w-full sm:w-52">
              <Select
                value={currentCategory}
                onValueChange={handleCategoryChange}
                options={categoryOptions}
                placeholder="Todas las categorías"
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
            {totalItems === 1 ? "producto encontrado" : "productos encontrados"}
          </div>
        </div>

        {/* Content / Empty State */}
        {initialProducts.length === 0 ? (
          <div className="p-12 text-center select-none bg-bg-card flex-1 flex flex-col items-center justify-center rounded-b-2xl">
            <FiShoppingBag className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
            <h3 className="text-sm font-bold text-text-primary">
              {overallCount === 0
                ? "No hay productos registrados"
                : "No se encontraron productos"}
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
              {overallCount === 0
                ? "Comienza registrando tu primer producto para el minibar o ventas en recepción."
                : search
                  ? `No hay productos que coincidan con "${search}".`
                  : "Intenta cambiar los filtros de categoría o estado seleccionados."}
            </p>
            {overallCount === 0 && canCreate && (
              <div className="mt-4">
                <Button variant="primary" size="sm" onClick={handleOpenCreate}>
                  <FiPlus className="w-4 h-4" />
                  <span>Crear Primer Producto</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Table Component */}
            <TableProducts
              products={initialProducts}
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
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
        categories={categories}
        onSuccess={() => router.refresh()}
      />

      {/* MODAL DE CONFIRMACIÓN: DESACTIVAR PRODUCTO */}
      <ConfirmModal
        isOpen={isDeactivateOpen}
        onClose={() => {
          setIsDeactivateOpen(false);
          setTargetProduct(null);
        }}
        onConfirm={handleConfirmDeactivate}
        title={`¿Dar de baja al producto "${targetProduct?.name}"?`}
        description={`El producto pasará a estado INACTIVO.\n\nYa no aparecerá como opción para nuevos consumos de frigobar ni cargos extras en recepción hasta que sea activado nuevamente.`}
        confirmText="Sí, dar de baja"
        cancelText="Cancelar"
        variant="danger"
        isLoading={isActionLoading}
      />

      {/* MODAL DE CONFIRMACIÓN: HABILITAR PRODUCTO */}
      <ConfirmModal
        isOpen={isRestoreOpen}
        onClose={() => {
          setIsRestoreOpen(false);
          setTargetProduct(null);
        }}
        onConfirm={handleConfirmRestore}
        title={`¿Restaurar y habilitar "${targetProduct?.name}"?`}
        description={`El producto volverá a estar ACTIVO y disponible para registrar ventas, consumos en habitación y minibar.`}
        confirmText="Sí, habilitar producto"
        cancelText="Cancelar"
        variant="success"
        isLoading={isActionLoading}
      />
    </div>
  );
}
