"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { categorySchema, type CategoryInput } from "./schema";
import { createAuditLog } from "@/lib/audit";

export interface CategoryActionResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
  data?: any;
}

/**
 * Crea una nueva categoría con validación Zod y registro en AuditLog
 */
export async function createCategoryAction(
  input: CategoryInput,
): Promise<CategoryActionResult> {
  try {
    const parsed = categorySchema.safeParse(input);

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

    const { name, description } = parsed.data;

    // Verificar unicidad del nombre entre categorías no eliminadas
    const existing = await prisma.category.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        deletedAt: null,
      },
    });

    if (existing) {
      return {
        success: false,
        errors: {
          name: `Ya existe una categoría registrada con el nombre "${name}".`,
        },
      };
    }

    // Crear la categoría
    const category = await prisma.category.create({
      data: {
        name,
        description,
        isActive: true,
      },
    });

    // Registrar en AuditLog con detalle explícito de cada ID
    await createAuditLog({
      action: "CATEGORY_CREATED",
      entity: "Category",
      entityId: category.id,
      details: {
        mensaje: `Se creó la categoría "${category.name}" (ID de categoría: ${category.id})`,
        categoriaId: category.id,
        nombreCategoria: category.name,
        descripcionCategoria: category.description || "Sin descripción",
        estadoInicial: "Activo (Disponible)",
      },
    });

    revalidatePath("/admin/categorias");
    return {
      success: true,
      message: `Categoría "${category.name}" creada con éxito.`,
      data: JSON.parse(JSON.stringify(category)),
    };
  } catch (error) {
    console.error("Error al crear categoría:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al registrar la categoría.",
    };
  }
}

/**
 * Edita una categoría existente con validación Zod y registro en AuditLog
 */
export async function updateCategoryAction(
  id: number,
  input: CategoryInput,
): Promise<CategoryActionResult> {
  try {
    const parsed = categorySchema.safeParse(input);

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

    const { name, description } = parsed.data;

    const existing = await prisma.category.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt !== null) {
      return {
        success: false,
        message: `No se encontró la categoría con ID: ${id}.`,
      };
    }

    // Verificar que otro registro no tenga ya el mismo nombre
    const duplicate = await prisma.category.findFirst({
      where: {
        id: { not: id },
        name: { equals: name, mode: "insensitive" },
        deletedAt: null,
      },
    });

    if (duplicate) {
      return {
        success: false,
        errors: {
          name: `Ya existe otra categoría registrada con el nombre "${name}".`,
        },
      };
    }

    // Registrar cambios comparativos
    const cambios: Record<string, { valorAnterior: any; valorNuevo: any }> = {};
    if (existing.name !== name) {
      cambios["nombre"] = {
        valorAnterior: existing.name,
        valorNuevo: name,
      };
    }
    if ((existing.description || null) !== (description || null)) {
      cambios["descripcion"] = {
        valorAnterior: existing.description || "Sin descripción",
        valorNuevo: description || "Sin descripción",
      };
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name,
        description,
      },
    });

    // Registrar en AuditLog con mapeo contextual de IDs
    await createAuditLog({
      action: "CATEGORY_UPDATED",
      entity: "Category",
      entityId: updated.id,
      details: {
        mensaje: `Se modificó la categoría "${updated.name}" (ID de categoría: ${updated.id})`,
        categoriaId: updated.id,
        nombreActual: updated.name,
        cambiosDetectados:
          Object.keys(cambios).length > 0
            ? cambios
            : "Sin modificaciones en los campos",
      },
    });

    revalidatePath("/admin/categorias");
    return {
      success: true,
      message: `Categoría "${updated.name}" actualizada con éxito.`,
      data: JSON.parse(JSON.stringify(updated)),
    };
  } catch (error) {
    console.error("Error al actualizar categoría:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al actualizar la categoría.",
    };
  }
}

/**
 * Da de baja (desactiva) una categoría con confirmación y registro en AuditLog
 */
export async function deactivateCategoryAction(
  id: number,
): Promise<CategoryActionResult> {
  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category || category.deletedAt !== null) {
      return {
        success: false,
        message: `No se encontró la categoría con ID: ${id}.`,
      };
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    // Registrar en AuditLog con detalle explicativo del estado
    await createAuditLog({
      action: "CATEGORY_DEACTIVATED",
      entity: "Category",
      entityId: updated.id,
      details: {
        mensaje: `Se dio de baja (desactivó) la categoría "${category.name}" (ID de categoría: ${category.id})`,
        categoriaId: category.id,
        nombreCategoria: category.name,
        estadoAnterior: category.isActive ? "Activo" : "Inactivo",
        estadoNuevo: "Inactivo (Dado de baja)",
        totalProductosAsociados: category._count.products,
        advertencia:
          "Los productos vinculados permanecen en el sistema pero la categoría no estará disponible para nuevos registros.",
      },
    });

    revalidatePath("/admin/categorias");
    return {
      success: true,
      message: `La categoría "${category.name}" ha sido dada de baja (desactivada).`,
    };
  } catch (error) {
    console.error("Error al desactivar categoría:", error);
    return {
      success: false,
      message: "Ocurrió un error al dar de baja la categoría.",
    };
  }
}

/**
 * Restaura (activa) una categoría con confirmación y registro en AuditLog
 */
export async function restoreCategoryAction(
  id: number,
): Promise<CategoryActionResult> {
  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return {
        success: false,
        message: `No se encontró la categoría con ID: ${id}.`,
      };
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        isActive: true,
        deletedAt: null,
      },
    });

    // Registrar en AuditLog
    await createAuditLog({
      action: "CATEGORY_RESTORED",
      entity: "Category",
      entityId: updated.id,
      details: {
        mensaje: `Se restauró (activó) la categoría "${category.name}" (ID de categoría: ${category.id})`,
        categoriaId: category.id,
        nombreCategoria: category.name,
        estadoAnterior: "Inactivo (Dado de baja)",
        estadoNuevo: "Activo (Disponible)",
        totalProductosAsociados: category._count.products,
      },
    });

    revalidatePath("/admin/categorias");
    return {
      success: true,
      message: `La categoría "${category.name}" ha sido restaurada (activada) con éxito.`,
    };
  } catch (error) {
    console.error("Error al restaurar categoría:", error);
    return {
      success: false,
      message: "Ocurrió un error al restaurar la categoría.",
    };
  }
}
