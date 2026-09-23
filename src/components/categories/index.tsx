"use client";

import { SerializedCategory } from "@/types/categories";
import PageHeader from "../ui/PageHeader";
import { Pagination, SearchInput } from "../ui";
import { FiPlus, FiTag } from "react-icons/fi";
import TableCategories from "./TableCategories";

interface CategoriesProps {
  initialCategories: SerializedCategory[];
  overallCount: number;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  search: string;
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
  permissions,
}: CategoriesProps) {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Categorías"
        subtitle="Administración de categorías para clasificación de productos."
        breadcrumbs={[
          { label: "admin", href: "/admin" },
          { label: "categorías" },
        ]}
      />

      {/* Main Content */}
      <div className="bg-bg-card border border-border-default/80 rounded-2xl shadow-xs overflow-hidden">
        {/* Filters Bar */}
        <div className="px-6 py-4 border-b border-border-soft flex flex-col md:flex-row items-stretch md:items-center gap-4 bg-bg-card">
          <div className="flex-1 max-w-md">
            <SearchInput placeholder="Buscar por nombre de categoría..." />
          </div>
          <div className="text-xs text-text-secondary md:ml-auto select-none font-medium">
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
                  : "Intenta cambiar los términos de búsqueda o filtros aplicados."}
            </p>
          </div>
        ) : (
          <>
            {/* Table Component */}
            <TableCategories
              categories={initialCategories}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
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
    </div>
  );
}
