"use client";

import { FiEdit2, FiTrash2, FiRefreshCw, FiPackage } from "react-icons/fi";
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
import { SerializedCategory } from "@/types/categories";

interface TableCategoriesProps {
  categories: SerializedCategory[];
  currentPage: number;
  itemsPerPage: number;
  canUpdate?: boolean;
  canDelete?: boolean;
  onEdit: (category: SerializedCategory) => void;
  onDeactivate: (category: SerializedCategory) => void;
  onRestore: (category: SerializedCategory) => void;
}

export default function TableCategories({
  categories,
  currentPage,
  itemsPerPage,
  canUpdate = true,
  canDelete = true,
  onEdit,
  onDeactivate,
  onRestore,
}: TableCategoriesProps) {
  return (
    <ErrorBoundary variant="embedded" title="Tabla de Categorías">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center w-20">Número</TableHead>
            <TableHead className="text-left">Categoría</TableHead>
            <TableHead className="text-center w-32">Productos</TableHead>
            <TableHead className="text-center w-32">Estado</TableHead>
            <TableHead className="text-center w-36">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center py-10 text-text-tertiary"
              >
                No se encontraron categorías registradas.
              </TableCell>
            </TableRow>
          ) : (
            categories.map((category, index) => {
              const isActive = category.isActive ?? true;
              const productsCount = category._count?.products ?? 0;

              return (
                <TableRow key={category.id}>
                  {/* Número Correlativo */}
                  <TableCell className="font-mono text-xs text-text-tertiary text-center">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </TableCell>

                  {/* Nombre y Descripción */}
                  <TableCell className="text-left">
                    <div className="flex flex-col">
                      <span className="font-semibold text-text-primary text-sm">
                        {category.name}
                      </span>
                      {category.description && (
                        <span className="text-xs text-text-tertiary line-clamp-1 mt-0.5">
                          {category.description}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Cantidad de Productos */}
                  <TableCell className="text-center">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-surface border border-border-soft text-xs text-text-secondary font-medium">
                      <FiPackage className="w-3.5 h-3.5 text-text-tertiary" />
                      <span>{productsCount}</span>
                    </div>
                  </TableCell>

                  {/* Estado (Activo / Inactivo) */}
                  <TableCell className="text-center">
                    <Badge variant={isActive ? "available" : "maintenance"}>
                      {isActive ? "● Activo" : "● Inactivo"}
                    </Badge>
                  </TableCell>

                  {/* Acciones de fila */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Botón Editar */}
                      {canUpdate && (
                        <ButtonIcon
                          onClick={() => onEdit(category)}
                          variant="warning"
                          icon={FiEdit2}
                          title={`Editar categoría "${category.name}" (ID #${category.id})`}
                        />
                      )}

                      {/* Botón Dar de baja (si está activo) */}
                      {canDelete && isActive && (
                        <ButtonIcon
                          onClick={() => onDeactivate(category)}
                          variant="danger"
                          icon={FiTrash2}
                          title={`Dar de baja a "${category.name}" (ID #${category.id})`}
                        />
                      )}

                      {/* Botón Restaurar (si está inactivo) */}
                      {canUpdate && !isActive && (
                        <ButtonIcon
                          onClick={() => onRestore(category)}
                          variant="success"
                          icon={FiRefreshCw}
                          title={`Restaurar y activar "${category.name}" (ID #${category.id})`}
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
