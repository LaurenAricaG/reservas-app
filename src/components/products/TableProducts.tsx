"use client";

import {
  FiEdit2,
  FiSlash,
  FiCheckCircle,
  FiShoppingBag,
  FiTag,
  FiPackage,
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
import { SerializedProduct } from "@/types/products";

interface TableProductsProps {
  products: SerializedProduct[];
  currentPage: number;
  itemsPerPage: number;
  canUpdate?: boolean;
  canDelete?: boolean;
  onEdit: (product: SerializedProduct) => void;
  onDeactivate: (product: SerializedProduct) => void;
  onRestore: (product: SerializedProduct) => void;
}

export default function TableProducts({
  products,
  currentPage,
  itemsPerPage,
  canUpdate = true,
  canDelete = true,
  onEdit,
  onDeactivate,
  onRestore,
}: TableProductsProps) {
  return (
    <ErrorBoundary variant="embedded" title="Tabla de Productos">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center w-16">Número</TableHead>
            <TableHead className="text-left">Producto</TableHead>
            <TableHead className="text-left w-44">Categoría</TableHead>
            <TableHead className="text-right w-32">Precio</TableHead>
            <TableHead className="text-center w-36">Stock</TableHead>
            <TableHead className="text-center w-28">Estado</TableHead>
            <TableHead className="text-center w-36">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {products.map((product, index) => {
            const correlativeNumber =
              (currentPage - 1) * itemsPerPage + index + 1;

            return (
              <TableRow
                key={product.id}
                className={!product.isActive ? "bg-bg-surface/40 opacity-75" : ""}
              >
                {/* # Correlativo */}
                <TableCell className="text-center font-mono text-xs text-text-tertiary">
                  {correlativeNumber}
                </TableCell>

                {/* Producto y descripción */}
                <TableCell>
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200/50 flex items-center justify-center shrink-0 mt-0.5 text-brand-600">
                      <FiShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary text-sm flex items-center gap-2">
                        <span>{product.name}</span>
                        {!product.isActive && (
                          <span className="text-[10px] uppercase font-bold text-danger-text px-1.5 py-0.5 bg-danger-bg rounded-md">
                            Inactivo
                          </span>
                        )}
                      </div>
                      {product.description ? (
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                          {product.description}
                        </p>
                      ) : (
                        <p className="text-[11px] text-text-tertiary italic mt-0.5">
                          Sin descripción
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Categoría */}
                <TableCell>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-bg-surface border border-border-default rounded-lg text-xs font-medium text-text-secondary shadow-3xs">
                    <FiTag className="w-3.5 h-3.5 text-brand-600" />
                    <span>{product.categoryName}</span>
                  </span>
                </TableCell>

                {/* Precio de Venta */}
                <TableCell className="text-right">
                  <span className="font-mono font-bold text-text-primary text-sm">
                    S/ {product.price.toFixed(2)}
                  </span>
                </TableCell>

                {/* Stock Disponible */}
                <TableCell className="text-center">
                  {product.stock === 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      <FiPackage className="w-3 h-3" />
                      Agotado (0)
                    </span>
                  ) : product.stock <= 5 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <FiPackage className="w-3 h-3" />
                      Bajo ({product.stock})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <FiPackage className="w-3 h-3" />
                      {product.stock} unid.
                    </span>
                  )}
                </TableCell>

                {/* Estado */}
                <TableCell className="text-center">
                  <Badge variant={product.isActive ? "available" : "maintenance"}>
                    {product.isActive ? "● Activo" : "● Inactivo"}
                  </Badge>
                </TableCell>

                {/* Acciones */}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {/* Editar */}
                    {canUpdate && (
                      <ButtonIcon
                        onClick={() => onEdit(product)}
                        variant="warning"
                        icon={FiEdit2}
                        title={`Editar producto "${product.name}" (ID #${product.id})`}
                      />
                    )}

                    {/* Desactivar (si está activo) */}
                    {canDelete && product.isActive && (
                      <ButtonIcon
                        onClick={() => onDeactivate(product)}
                        variant="danger"
                        icon={FiSlash}
                        title={`Dar de baja al producto "${product.name}"`}
                      />
                    )}

                    {/* Habilitar / Restaurar (si está inactivo) */}
                    {canUpdate && !product.isActive && (
                      <ButtonIcon
                        onClick={() => onRestore(product)}
                        variant="success"
                        icon={FiCheckCircle}
                        title={`Restaurar producto "${product.name}"`}
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
