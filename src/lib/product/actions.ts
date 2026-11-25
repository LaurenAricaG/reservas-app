"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { productSchema, type ProductInput } from "./schema";
import { createAuditLog } from "@/lib/audit";
import { hasPermission } from "@/utils/permissions.utils";

export interface ProductActionResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
  data?: any;
}

/**
 * Crea un nuevo producto con validación Zod, verificación de categoría y registro en AuditLog
 */
export async function createProductAction(
  input: ProductInput,
): Promise<ProductActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["products:create", "products:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para registrar productos.",
      };
    }

    const parsed = productSchema.safeParse(input);

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !errors[field]) {
          errors[field] = issue.message;
        }
      });
      return { success: false, errors };
    }

    const { name, description, categoryId, price, stock } = parsed.data;

    // Verificar unicidad de nombre de producto
    const existing = await prisma.product.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        deletedAt: null,
      },
    });

    if (existing) {
      return {
        success: false,
        errors: {
          name: `Ya existe un producto activo con el nombre "${name}".`,
        },
      };
    }

    // Verificar existencia de la categoría
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category || category.deletedAt !== null) {
      return {
        success: false,
        errors: {
          categoryId: "La categoría seleccionada no existe o se encuentra inactiva.",
        },
      };
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        categoryId,
        price,
        stock,
        isActive: true,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    // Registrar en AuditLog con mapeo contextual de IDs
    await createAuditLog({
      action: "PRODUCT_CREATED",
      entity: "Product",
      entityId: product.id,
      details: {
        mensaje: `Se registró el producto "${product.name}" (ID de producto: ${product.id}) en la categoría "${product.category.name}" (ID de categoría: ${product.categoryId})`,
        productoId: product.id,
        nombreProducto: product.name,
        categoriaId: product.categoryId,
        nombreCategoria: product.category.name,
        precioUnitario: Number(product.price),
        stockInicial: product.stock,
        estado: "Activo",
      },
    });

    revalidatePath("/admin/productos");
    revalidatePath("/admin/consumos");

    return {
      success: true,
      message: `Producto "${product.name}" registrado con éxito.`,
      data: JSON.parse(JSON.stringify(product)),
    };
  } catch (error: any) {
    console.error("Error al crear producto:", error);
    if (error?.code === "P2002") {
      return {
        success: false,
        errors: {
          name: "Ya existe un producto con este nombre en la base de datos.",
        },
      };
    }
    return {
      success: false,
      message: "Ocurrió un error inesperado al registrar el producto.",
    };
  }
}

/**
 * Actualiza un producto con validación Zod, verificación de permisos y bitácora de cambios
 */
export async function updateProductAction(
  id: number,
  input: ProductInput,
): Promise<ProductActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["products:update", "products:edit", "products:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para modificar productos.",
      };
    }

    const parsed = productSchema.safeParse(input);

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !errors[field]) {
          errors[field] = issue.message;
        }
      });
      return { success: false, errors };
    }

    const { name, description, categoryId, price, stock } = parsed.data;

    const existing = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    if (!existing) {
      return {
        success: false,
        message: `No se encontró el producto con ID ${id}.`,
      };
    }

    // Verificar unicidad de nombre si cambió
    if (existing.name.toLowerCase() !== name.toLowerCase()) {
      const duplicate = await prisma.product.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          id: { not: id },
          deletedAt: null,
        },
      });

      if (duplicate) {
        return {
          success: false,
          errors: {
            name: `Ya existe otro producto activo con el nombre "${name}".`,
          },
        };
      }
    }

    // Verificar categoría si cambió
    let newCategoryName = existing.category.name;
    if (existing.categoryId !== categoryId) {
      const newCategory = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!newCategory || newCategory.deletedAt !== null) {
        return {
          success: false,
          errors: {
            categoryId: "La categoría seleccionada no existe o está inactiva.",
          },
        };
      }
      newCategoryName = newCategory.name;
    }

    // Auditoría de cambios
    const cambios: Record<string, { anterior: any; nuevo: any }> = {};
    if (existing.name !== name) {
      cambios["nombre"] = { anterior: existing.name, nuevo: name };
    }
    if ((existing.description || null) !== (description || null)) {
      cambios["descripcion"] = {
        anterior: existing.description || "Sin descripción",
        nuevo: description || "Sin descripción",
      };
    }
    if (existing.categoryId !== categoryId) {
      cambios["categoria"] = {
        anterior: `${existing.category.name} (ID: ${existing.categoryId})`,
        nuevo: `${newCategoryName} (ID: ${categoryId})`,
      };
    }
    if (Number(existing.price) !== price) {
      cambios["precio"] = {
        anterior: Number(existing.price),
        nuevo: price,
      };
    }
    if (existing.stock !== stock) {
      cambios["stock"] = {
        anterior: existing.stock,
        nuevo: stock,
      };
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        categoryId,
        price,
        stock,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    await createAuditLog({
      action: "PRODUCT_UPDATED",
      entity: "Product",
      entityId: updated.id,
      details: {
        mensaje: `Se modificó el producto "${updated.name}" (ID de producto: ${updated.id})`,
        productoId: updated.id,
        nombreActual: updated.name,
        categoriaId: updated.categoryId,
        nombreCategoria: updated.category.name,
        cambiosDetectados:
          Object.keys(cambios).length > 0
            ? cambios
            : "Sin modificaciones detectadas",
      },
    });

    revalidatePath("/admin/productos");
    revalidatePath("/admin/consumos");

    return {
      success: true,
      message: `Producto "${updated.name}" actualizado con éxito.`,
      data: JSON.parse(JSON.stringify(updated)),
    };
  } catch (error: any) {
    console.error("Error al actualizar producto:", error);
    if (error?.code === "P2002") {
      return {
        success: false,
        errors: {
          name: "Ya existe un producto con este nombre.",
        },
      };
    }
    return {
      success: false,
      message: "Ocurrió un error inesperado al actualizar el producto.",
    };
  }
}

/**
 * Da de baja lógica (desactiva) un producto
 */
export async function deactivateProductAction(
  id: number,
): Promise<ProductActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["products:delete", "products:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para dar de baja productos.",
      };
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    if (!product) {
      return {
        success: false,
        message: `No se encontró el producto con ID ${id}.`,
      };
    }

    if (!product.isActive || product.deletedAt !== null) {
      return {
        success: false,
        message: `El producto "${product.name}" ya se encuentra inactivo.`,
      };
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    await createAuditLog({
      action: "PRODUCT_DEACTIVATED",
      entity: "Product",
      entityId: updated.id,
      details: {
        mensaje: `Se dio de baja (desactivó) el producto "${product.name}" (ID de producto: ${product.id}, Categoría: ${product.category.name})`,
        productoId: product.id,
        nombreProducto: product.name,
        categoriaId: product.categoryId,
        nombreCategoria: product.category.name,
        estadoAnterior: "Activo",
        estadoNuevo: "Inactivo (Dado de baja)",
        advertencia:
          "El producto ya no estará disponible para nuevos consumos en recepción ni minibar.",
      },
    });

    revalidatePath("/admin/productos");
    revalidatePath("/admin/consumos");

    return {
      success: true,
      message: `Producto "${product.name}" desactivado con éxito.`,
    };
  } catch (error) {
    console.error("Error al desactivar producto:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al desactivar el producto.",
    };
  }
}

/**
 * Restaura y activa un producto dado de baja
 */
export async function restoreProductAction(
  id: number,
): Promise<ProductActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["products:update", "products:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para restaurar productos.",
      };
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, deletedAt: true },
        },
      },
    });

    if (!product) {
      return {
        success: false,
        message: `No se encontró el producto con ID ${id}.`,
      };
    }

    if (product.isActive && product.deletedAt === null) {
      return {
        success: false,
        message: `El producto "${product.name}" ya se encuentra activo.`,
      };
    }

    // Verificar que la categoría a la que pertenece no esté eliminada
    if (product.category.deletedAt !== null) {
      return {
        success: false,
        message: `No se puede activar el producto porque su categoría "${product.category.name}" se encuentra desactivada. Active la categoría primero o asigne otra.`,
      };
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        isActive: true,
        deletedAt: null,
      },
    });

    await createAuditLog({
      action: "PRODUCT_RESTORED",
      entity: "Product",
      entityId: updated.id,
      details: {
        mensaje: `Se restauró y activó el producto "${product.name}" (ID de producto: ${product.id})`,
        productoId: product.id,
        nombreProducto: product.name,
        categoriaId: product.categoryId,
        nombreCategoria: product.category.name,
        estadoNuevo: "Activo (En catálogo)",
      },
    });

    revalidatePath("/admin/productos");
    revalidatePath("/admin/consumos");

    return {
      success: true,
      message: `Producto "${product.name}" restaurado exitosamente.`,
    };
  } catch (error) {
    console.error("Error al restaurar producto:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al restaurar el producto.",
    };
  }
}
