"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { roomTypeSchema, type RoomTypeInput } from "./schema";
import { createAuditLog } from "@/lib/audit";

export interface RoomTypeActionResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
  data?: any;
}

/**
 * Crea un nuevo tipo de habitación con validación Zod y registro en AuditLog
 */
export async function createRoomTypeAction(
  input: RoomTypeInput,
): Promise<RoomTypeActionResult> {
  try {
    const parsed = roomTypeSchema.safeParse(input);

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

    const {
      name,
      description,
      basePrice,
      hourlyPrice,
      maxGuests,
      amenities,
      images,
    } = parsed.data;

    // Verificar unicidad del nombre entre tipos de habitación no eliminados
    const existing = await prisma.roomType.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        deletedAt: null,
      },
    });

    if (existing) {
      return {
        success: false,
        errors: {
          name: `Ya existe un tipo de habitación registrado con el nombre "${name}".`,
        },
      };
    }

    // Crear el tipo de habitación
    const roomType = await prisma.roomType.create({
      data: {
        name,
        description,
        basePrice,
        hourlyPrice: hourlyPrice ?? null,
        maxGuests,
        amenities,
        images,
        isActive: true,
      },
    });

    // Registrar en AuditLog con detalle explícito de cada dato y referencia entendible
    await createAuditLog({
      action: "ROOM_TYPE_CREATED",
      entity: "RoomType",
      entityId: roomType.id,
      details: {
        mensaje: `Se creó el tipo de habitación "${roomType.name}" (ID de tipo de habitación: ${roomType.id})`,
        tipoHabitacionId: roomType.id,
        nombreTipo: roomType.name,
        precioPorNoche: Number(roomType.basePrice),
        precioPorHoras: roomType.hourlyPrice ? Number(roomType.hourlyPrice) : null,
        aforoMaximo: roomType.maxGuests,
        comodidades: roomType.amenities,
        descripcion: roomType.description || "Sin descripción",
        estadoInicial: "Activo (Disponible)",
      },
    });

    revalidatePath("/admin/tipos-habitacion");
    revalidatePath("/admin/habitaciones");

    return {
      success: true,
      message: `Tipo de habitación "${roomType.name}" creado con éxito.`,
      data: JSON.parse(JSON.stringify(roomType)),
    };
  } catch (error) {
    console.error("Error al crear tipo de habitación:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al registrar el tipo de habitación.",
    };
  }
}

/**
 * Edita un tipo de habitación existente con validación Zod y registro en AuditLog
 */
export async function updateRoomTypeAction(
  id: number,
  input: RoomTypeInput,
): Promise<RoomTypeActionResult> {
  try {
    const parsed = roomTypeSchema.safeParse(input);

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

    const {
      name,
      description,
      basePrice,
      hourlyPrice,
      maxGuests,
      amenities,
      images,
    } = parsed.data;

    const existing = await prisma.roomType.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt !== null) {
      return {
        success: false,
        message: `No se encontró el tipo de habitación con ID: ${id}.`,
      };
    }

    // Verificar unicidad de nombre excluyendo el registro actual
    const duplicate = await prisma.roomType.findFirst({
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
          name: `Ya existe otro tipo de habitación registrado con el nombre "${name}".`,
        },
      };
    }

    // Mapear cambios comparativos para la bitácora
    const cambios: Record<string, { valorAnterior: any; valorNuevo: any }> = {};

    if (existing.name !== name) {
      cambios["nombre"] = {
        valorAnterior: existing.name,
        valorNuevo: name,
      };
    }

    if (Number(existing.basePrice) !== Number(basePrice)) {
      cambios["precioPorNoche"] = {
        valorAnterior: Number(existing.basePrice),
        valorNuevo: Number(basePrice),
      };
    }

    const existingHourly = existing.hourlyPrice ? Number(existing.hourlyPrice) : null;
    const newHourly = hourlyPrice ? Number(hourlyPrice) : null;
    if (existingHourly !== newHourly) {
      cambios["precioPorHoras"] = {
        valorAnterior: existingHourly,
        valorNuevo: newHourly,
      };
    }

    if (existing.maxGuests !== maxGuests) {
      cambios["aforoMaximo"] = {
        valorAnterior: existing.maxGuests,
        valorNuevo: maxGuests,
      };
    }

    if ((existing.description || null) !== (description || null)) {
      cambios["descripcion"] = {
        valorAnterior: existing.description || "Sin descripción",
        valorNuevo: description || "Sin descripción",
      };
    }

    if (JSON.stringify(existing.amenities) !== JSON.stringify(amenities)) {
      cambios["comodidades"] = {
        valorAnterior: existing.amenities,
        valorNuevo: amenities,
      };
    }

    const updated = await prisma.roomType.update({
      where: { id },
      data: {
        name,
        description,
        basePrice,
        hourlyPrice: hourlyPrice ?? null,
        maxGuests,
        amenities,
        images,
      },
    });

    // Registrar en AuditLog con detalle explícito
    await createAuditLog({
      action: "ROOM_TYPE_UPDATED",
      entity: "RoomType",
      entityId: updated.id,
      details: {
        mensaje: `Se modificó el tipo de habitación "${updated.name}" (ID de tipo de habitación: ${updated.id})`,
        tipoHabitacionId: updated.id,
        nombreActual: updated.name,
        cambiosDetectados:
          Object.keys(cambios).length > 0
            ? cambios
            : "Sin modificaciones en los campos",
      },
    });

    revalidatePath("/admin/tipos-habitacion");
    revalidatePath("/admin/habitaciones");

    return {
      success: true,
      message: `Tipo de habitación "${updated.name}" actualizado con éxito.`,
      data: JSON.parse(JSON.stringify(updated)),
    };
  } catch (error) {
    console.error("Error al actualizar tipo de habitación:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al actualizar el tipo de habitación.",
    };
  }
}

/**
 * Da de baja (desactiva) un tipo de habitación con confirmación y registro en AuditLog
 */
export async function deactivateRoomTypeAction(
  id: number,
): Promise<RoomTypeActionResult> {
  try {
    const roomType = await prisma.roomType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { rooms: true },
        },
      },
    });

    if (!roomType || roomType.deletedAt !== null) {
      return {
        success: false,
        message: `No se encontró el tipo de habitación con ID: ${id}.`,
      };
    }

    const updated = await prisma.roomType.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    // Registrar en AuditLog
    await createAuditLog({
      action: "ROOM_TYPE_DEACTIVATED",
      entity: "RoomType",
      entityId: updated.id,
      details: {
        mensaje: `Se dio de baja (desactivó) el tipo de habitación "${roomType.name}" (ID de tipo de habitación: ${roomType.id})`,
        tipoHabitacionId: roomType.id,
        nombreTipo: roomType.name,
        estadoAnterior: roomType.isActive ? "Activo" : "Inactivo",
        estadoNuevo: "Inactivo (Dado de baja)",
        totalHabitacionesVinculadas: roomType._count.rooms,
        advertencia:
          "Las habitaciones físicas vinculadas no se eliminan pero no se podrán ofertar nuevos cuartos de este tipo hasta que sea reactivado.",
      },
    });

    revalidatePath("/admin/tipos-habitacion");
    revalidatePath("/admin/habitaciones");

    return {
      success: true,
      message: `El tipo de habitación "${roomType.name}" ha sido dado de baja (desactivado).`,
    };
  } catch (error) {
    console.error("Error al desactivar tipo de habitación:", error);
    return {
      success: false,
      message: "Ocurrió un error al dar de baja el tipo de habitación.",
    };
  }
}

/**
 * Restaura (activa) un tipo de habitación con confirmación y registro en AuditLog
 */
export async function restoreRoomTypeAction(
  id: number,
): Promise<RoomTypeActionResult> {
  try {
    const roomType = await prisma.roomType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { rooms: true },
        },
      },
    });

    if (!roomType) {
      return {
        success: false,
        message: `No se encontró el tipo de habitación con ID: ${id}.`,
      };
    }

    const updated = await prisma.roomType.update({
      where: { id },
      data: {
        isActive: true,
        deletedAt: null,
      },
    });

    // Registrar en AuditLog
    await createAuditLog({
      action: "ROOM_TYPE_RESTORED",
      entity: "RoomType",
      entityId: updated.id,
      details: {
        mensaje: `Se restauró (activó) el tipo de habitación "${roomType.name}" (ID de tipo de habitación: ${roomType.id})`,
        tipoHabitacionId: roomType.id,
        nombreTipo: roomType.name,
        estadoAnterior: "Inactivo (Dado de baja)",
        estadoNuevo: "Activo (Disponible)",
        totalHabitacionesVinculadas: roomType._count.rooms,
      },
    });

    revalidatePath("/admin/tipos-habitacion");
    revalidatePath("/admin/habitaciones");

    return {
      success: true,
      message: `El tipo de habitación "${roomType.name}" ha sido restaurado (activado) con éxito.`,
    };
  } catch (error) {
    console.error("Error al restaurar tipo de habitación:", error);
    return {
      success: false,
      message: "Ocurrió un error al restaurar el tipo de habitación.",
    };
  }
}

