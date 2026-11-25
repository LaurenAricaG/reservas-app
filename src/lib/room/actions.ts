"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { roomSchema, type RoomInput } from "./schema";
import { createAuditLog } from "@/lib/audit";
import { hasPermission } from "@/utils/permissions.utils";

export interface RoomActionResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
  data?: any;
}

/**
 * Crea una nueva habitación con validación Zod, verificación de permisos y registro en AuditLog
 */
export async function createRoomAction(
  input: RoomInput,
): Promise<RoomActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["rooms:create", "rooms:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para crear habitaciones.",
      };
    }

    const parsed = roomSchema.safeParse(input);

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

    const { number, floorId, roomTypeId, status, notes } = parsed.data;

    // Verificar unicidad del número de habitación
    const existing = await prisma.room.findFirst({
      where: {
        number: { equals: number, mode: "insensitive" },
        deletedAt: null,
      },
    });

    if (existing) {
      return {
        success: false,
        errors: {
          number: `Ya existe una habitación registrada con el número "${number}".`,
        },
      };
    }

    // Verificar existencia de piso y tipo de habitación
    const [floor, roomType] = await Promise.all([
      prisma.floor.findUnique({ where: { id: floorId } }),
      prisma.roomType.findUnique({ where: { id: roomTypeId } }),
    ]);

    if (!floor) {
      return {
        success: false,
        errors: {
          floorId: "El piso seleccionado no existe en el sistema.",
        },
      };
    }

    if (!roomType || roomType.deletedAt !== null) {
      return {
        success: false,
        errors: {
          roomTypeId: "El tipo de habitación seleccionado no existe o está inactivo.",
        },
      };
    }

    // Crear la habitación
    const room = await prisma.room.create({
      data: {
        number,
        floorId,
        roomTypeId,
        status,
        notes,
      },
      include: {
        floor: true,
        roomType: true,
      },
    });

    // Registrar en AuditLog con detalle explícito
    await createAuditLog({
      action: "ROOM_CREATED",
      entity: "Room",
      entityId: room.id,
      details: {
        mensaje: `Se creó la habitación "${room.number}" en el ${room.floor.name} (${room.roomType.name}) [ID: ${room.id}]`,
        habitacionId: room.id,
        numeroHabitacion: room.number,
        pisoId: room.floor.id,
        nombrePiso: room.floor.name,
        tipoHabitacionId: room.roomType.id,
        nombreTipoHabitacion: room.roomType.name,
        precioBaseNoche: Number(room.roomType.basePrice),
        estadoInicial: room.status,
        notasTecnicas: room.notes || "Sin notas técnicas",
      },
    });

    revalidatePath("/admin/habitaciones");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Habitación "${room.number}" creada con éxito.`,
      data: JSON.parse(JSON.stringify(room)),
    };
  } catch (error) {
    console.error("Error al crear habitación:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al registrar la habitación.",
    };
  }
}

/**
 * Edita una habitación existente con validación Zod, permisos y registro en AuditLog
 */
export async function updateRoomAction(
  id: number,
  input: RoomInput,
): Promise<RoomActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["rooms:update", "rooms:edit", "rooms:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para editar habitaciones.",
      };
    }

    const parsed = roomSchema.safeParse(input);

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

    const { number, floorId, roomTypeId, status, notes } = parsed.data;

    const existing = await prisma.room.findUnique({
      where: { id },
      include: {
        floor: true,
        roomType: true,
      },
    });

    if (!existing || existing.deletedAt !== null) {
      return {
        success: false,
        message: `No se encontró la habitación con ID: ${id}.`,
      };
    }

    // Verificar unicidad de número excluyendo el registro actual
    const duplicate = await prisma.room.findFirst({
      where: {
        id: { not: id },
        number: { equals: number, mode: "insensitive" },
        deletedAt: null,
      },
    });

    if (duplicate) {
      return {
        success: false,
        errors: {
          number: `Ya existe otra habitación registrada con el número "${number}".`,
        },
      };
    }

    // Verificar piso y tipo
    const [floor, roomType] = await Promise.all([
      prisma.floor.findUnique({ where: { id: floorId } }),
      prisma.roomType.findUnique({ where: { id: roomTypeId } }),
    ]);

    if (!floor) {
      return {
        success: false,
        errors: {
          floorId: "El piso seleccionado no existe en el sistema.",
        },
      };
    }

    if (!roomType || roomType.deletedAt !== null) {
      return {
        success: false,
        errors: {
          roomTypeId: "El tipo de habitación seleccionado no existe o está inactivo.",
        },
      };
    }

    // Detectar cambios comparativos
    const cambios: Record<string, { valorAnterior: any; valorNuevo: any }> = {};

    if (existing.number !== number) {
      cambios["numero"] = {
        valorAnterior: existing.number,
        valorNuevo: number,
      };
    }

    if (existing.floorId !== floorId) {
      cambios["piso"] = {
        valorAnterior: `${existing.floor.name} (ID: ${existing.floorId})`,
        valorNuevo: `${floor.name} (ID: ${floorId})`,
      };
    }

    if (existing.roomTypeId !== roomTypeId) {
      cambios["tipoHabitacion"] = {
        valorAnterior: `${existing.roomType.name} (ID: ${existing.roomTypeId})`,
        valorNuevo: `${roomType.name} (ID: ${roomTypeId})`,
      };
    }

    if (existing.status !== status) {
      cambios["estado"] = {
        valorAnterior: existing.status,
        valorNuevo: status,
      };
    }

    if ((existing.notes || null) !== (notes || null)) {
      cambios["notasTecnicas"] = {
        valorAnterior: existing.notes || "Sin notas",
        valorNuevo: notes || "Sin notas",
      };
    }

    const updated = await prisma.room.update({
      where: { id },
      data: {
        number,
        floorId,
        roomTypeId,
        status,
        notes,
      },
      include: {
        floor: true,
        roomType: true,
      },
    });

    // Registrar en AuditLog
    await createAuditLog({
      action: "ROOM_UPDATED",
      entity: "Room",
      entityId: updated.id,
      details: {
        mensaje: `Se modificó la habitación "${updated.number}" [ID de habitación: ${updated.id}]`,
        habitacionId: updated.id,
        numeroHabitacion: updated.number,
        piso: updated.floor.name,
        tipoHabitacion: updated.roomType.name,
        cambiosDetectados:
          Object.keys(cambios).length > 0
            ? cambios
            : "Sin modificaciones en los campos",
      },
    });

    revalidatePath("/admin/habitaciones");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Habitación "${updated.number}" actualizada con éxito.`,
      data: JSON.parse(JSON.stringify(updated)),
    };
  } catch (error) {
    console.error("Error al actualizar habitación:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al actualizar la habitación.",
    };
  }
}

/**
 * Pone una habitación FUERA DE SERVICIO (Mantenimiento) con confirmación y registro en AuditLog
 */
export async function setRoomOutOfServiceAction(
  id: number,
  reason?: string,
): Promise<RoomActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["rooms:update", "rooms:edit", "rooms:manage", "rooms:delete"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para poner habitaciones fuera de servicio.",
      };
    }

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        floor: true,
        roomType: true,
      },
    });

    if (!room || room.deletedAt !== null) {
      return {
        success: false,
        message: `No se encontró la habitación con ID: ${id}.`,
      };
    }

    // Validación de negocio: no se puede dar de baja una habitación que actualmente tenga un huésped adentro
    if (room.status === "OCCUPIED") {
      return {
        success: false,
        message:
          "No es posible poner fuera de servicio una habitación actualmente OCUPADA por un huésped. Debe realizarse el check-out primero.",
      };
    }

    const appendedNotes = reason?.trim()
      ? room.notes
        ? `${room.notes} | Motivo fuera de servicio: ${reason.trim()}`
        : `Motivo fuera de servicio: ${reason.trim()}`
      : room.notes;

    const updated = await prisma.room.update({
      where: { id },
      data: {
        status: "MAINTENANCE",
        notes: appendedNotes,
      },
      include: {
        floor: true,
        roomType: true,
      },
    });

    // Registrar en AuditLog con mapeo contextual detallado
    await createAuditLog({
      action: "ROOM_OUT_OF_SERVICE",
      entity: "Room",
      entityId: updated.id,
      details: {
        mensaje: `La habitación "${room.number}" (ID: ${room.id}) fue puesta FUERA DE SERVICIO (Mantenimiento)`,
        habitacionId: room.id,
        numeroHabitacion: room.number,
        pisoId: room.floor.id,
        nombrePiso: room.floor.name,
        tipoHabitacionId: room.roomType.id,
        nombreTipoHabitacion: room.roomType.name,
        estadoAnterior: room.status,
        estadoNuevo: "MAINTENANCE (Fuera de Servicio)",
        motivoEspecificado: reason?.trim() || "Mantenimiento preventivo / Fuera de servicio",
        advertencia:
          "La habitación no aparecerá disponible para reservas ni alquileres hasta que sea habilitada nuevamente.",
      },
    });

    revalidatePath("/admin/habitaciones");
    revalidatePath("/admin");

    return {
      success: true,
      message: `La habitación "${room.number}" ha sido puesta fuera de servicio (Mantenimiento).`,
    };
  } catch (error) {
    console.error("Error al poner habitación fuera de servicio:", error);
    return {
      success: false,
      message: "Ocurrió un error al poner la habitación fuera de servicio.",
    };
  }
}

/**
 * Restaura (habilita) una habitación poniéndola nuevamente EN SERVICIO (Disponible)
 */
export async function restoreRoomToServiceAction(
  id: number,
): Promise<RoomActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["rooms:update", "rooms:edit", "rooms:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para habilitar habitaciones.",
      };
    }

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        floor: true,
        roomType: true,
      },
    });

    if (!room) {
      return {
        success: false,
        message: `No se encontró la habitación con ID: ${id}.`,
      };
    }

    const updated = await prisma.room.update({
      where: { id },
      data: {
        status: "AVAILABLE",
        deletedAt: null,
      },
      include: {
        floor: true,
        roomType: true,
      },
    });

    // Registrar en AuditLog
    await createAuditLog({
      action: "ROOM_RESTORED_TO_SERVICE",
      entity: "Room",
      entityId: updated.id,
      details: {
        mensaje: `La habitación "${room.number}" (ID: ${room.id}) fue HABILITADA NUEVAMENTE (En servicio - Disponible)`,
        habitacionId: room.id,
        numeroHabitacion: room.number,
        pisoId: room.floor.id,
        nombrePiso: room.floor.name,
        tipoHabitacionId: room.roomType.id,
        nombreTipoHabitacion: room.roomType.name,
        estadoAnterior: room.status,
        estadoNuevo: "AVAILABLE (Disponible)",
      },
    });

    revalidatePath("/admin/habitaciones");
    revalidatePath("/admin");

    return {
      success: true,
      message: `La habitación "${room.number}" ha sido habilitada nuevamente (En servicio).`,
    };
  } catch (error) {
    console.error("Error al habilitar habitación:", error);
    return {
      success: false,
      message: "Ocurrió un error al habilitar la habitación.",
    };
  }
}

