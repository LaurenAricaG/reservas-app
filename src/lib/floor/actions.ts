"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { floorSchema, type FloorInput } from "./schema";
import { createAuditLog } from "@/lib/audit";
import { hasPermission } from "@/utils/permissions.utils";

export interface FloorActionResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
  data?: any;
}

/**
 * Crea un nuevo piso con validación Zod, verificación de permisos y registro en AuditLog
 */
export async function createFloorAction(
  input: FloorInput,
): Promise<FloorActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["floors:create", "floors:manage", "rooms:create", "rooms:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para registrar pisos.",
      };
    }

    const parsed = floorSchema.safeParse(input);

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

    const { number, name } = parsed.data;

    // Verificar unicidad de número de piso (entre los no eliminados o totales)
    const existingNumber = await prisma.floor.findFirst({
      where: {
        number,
        deletedAt: null,
      },
    });

    if (existingNumber) {
      return {
        success: false,
        errors: {
          number: `Ya existe un piso activo registrado con el nivel ${number} ("${existingNumber.name}").`,
        },
      };
    }

    // Verificar unicidad del nombre
    const existingName = await prisma.floor.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        deletedAt: null,
      },
    });

    if (existingName) {
      return {
        success: false,
        errors: {
          name: `Ya existe un piso registrado con el nombre "${name}".`,
        },
      };
    }

    const floor = await prisma.floor.create({
      data: {
        number,
        name,
      },
    });

    // Registrar en AuditLog con detalle explícito
    await createAuditLog({
      action: "FLOOR_CREATED",
      entity: "Floor",
      entityId: floor.id,
      details: {
        mensaje: `Se registró el piso "${floor.name}" (Nivel ${floor.number}, ID: ${floor.id})`,
        pisoId: floor.id,
        nivelPiso: floor.number,
        nombrePiso: floor.name,
        estado: "Activo",
      },
    });

    revalidatePath("/admin/pisos");
    revalidatePath("/admin/habitaciones");

    return {
      success: true,
      message: `Piso "${floor.name}" (Nivel ${floor.number}) creado exitosamente.`,
      data: JSON.parse(JSON.stringify(floor)),
    };
  } catch (error: any) {
    console.error("Error al crear piso:", error);
    if (error?.code === "P2002") {
      return {
        success: false,
        errors: {
          number: "Ya existe un registro con este número de piso en la base de datos.",
        },
      };
    }
    return {
      success: false,
      message: "Ocurrió un error inesperado al registrar el piso.",
    };
  }
}

/**
 * Actualiza los datos de un piso con validación Zod, verificación de permisos y bitácora de cambios
 */
export async function updateFloorAction(
  id: number,
  input: FloorInput,
): Promise<FloorActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["floors:update", "floors:edit", "floors:manage", "rooms:update", "rooms:edit", "rooms:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para modificar pisos.",
      };
    }

    const parsed = floorSchema.safeParse(input);

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

    const { number, name } = parsed.data;

    const existing = await prisma.floor.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        message: `No se encontró el piso con ID ${id}.`,
      };
    }

    // Verificar unicidad de nivel si cambió
    if (existing.number !== number) {
      const duplicateNumber = await prisma.floor.findFirst({
        where: {
          number,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (duplicateNumber) {
        return {
          success: false,
          errors: {
            number: `Ya existe otro piso activo con el nivel ${number} ("${duplicateNumber.name}").`,
          },
        };
      }
    }

    // Verificar unicidad de nombre si cambió
    if (existing.name.toLowerCase() !== name.toLowerCase()) {
      const duplicateName = await prisma.floor.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          id: { not: id },
          deletedAt: null,
        },
      });

      if (duplicateName) {
        return {
          success: false,
          errors: {
            name: `Ya existe otro piso con el nombre "${name}".`,
          },
        };
      }
    }

    // Auditoría de cambios
    const cambios: Record<string, { anterior: any; nuevo: any }> = {};
    if (existing.number !== number) {
      cambios["nivel"] = { anterior: existing.number, nuevo: number };
    }
    if (existing.name !== name) {
      cambios["nombre"] = { anterior: existing.name, nuevo: name };
    }

    const updated = await prisma.floor.update({
      where: { id },
      data: {
        number,
        name,
      },
    });

    await createAuditLog({
      action: "FLOOR_UPDATED",
      entity: "Floor",
      entityId: updated.id,
      details: {
        mensaje: `Se modificó el piso "${updated.name}" (ID: ${updated.id})`,
        pisoId: updated.id,
        nivelActual: updated.number,
        nombreActual: updated.name,
        cambiosDetectados:
          Object.keys(cambios).length > 0
            ? cambios
            : "Sin modificaciones detectadas",
      },
    });

    revalidatePath("/admin/pisos");
    revalidatePath("/admin/habitaciones");

    return {
      success: true,
      message: `Piso "${updated.name}" actualizado exitosamente.`,
      data: JSON.parse(JSON.stringify(updated)),
    };
  } catch (error: any) {
    console.error("Error al actualizar piso:", error);
    if (error?.code === "P2002") {
      return {
        success: false,
        errors: {
          number: "Ya existe un registro con este número de piso.",
        },
      };
    }
    return {
      success: false,
      message: "Ocurrió un error inesperado al actualizar el piso.",
    };
  }
}

/**
 * Desactiva (da de baja lógica) un piso.
 * Regla de negocio requerida:
 * 1. Solo se puede desactivar si TODAS las habitaciones de ese piso están libres (sin ocupadas ni reservadas).
 * 2. Al desactivar el piso, todas sus habitaciones activas pasan automáticamente a "FUERA DE SERVICIO" (MAINTENANCE).
 */
export async function deactivateFloorAction(
  id: number,
): Promise<FloorActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["floors:delete", "floors:manage", "rooms:delete", "rooms:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para desactivar pisos.",
      };
    }

    const floor = await prisma.floor.findUnique({
      where: { id },
      include: {
        rooms: {
          where: { deletedAt: null },
          select: {
            id: true,
            number: true,
            status: true,
          },
        },
      },
    });

    if (!floor) {
      return {
        success: false,
        message: `No se encontró el piso con ID ${id}.`,
      };
    }

    if (floor.deletedAt !== null) {
      return {
        success: false,
        message: `El piso "${floor.name}" ya se encuentra desactivado.`,
      };
    }

    // Regla de Negocio: Validar que no haya habitaciones ocupadas ni reservadas
    const busyRooms = floor.rooms.filter(
      (r) => r.status === "OCCUPIED" || r.status === "RESERVED",
    );

    if (busyRooms.length > 0) {
      const busyList = busyRooms
        .map(
          (r) =>
            `Hab. ${r.number} (${r.status === "OCCUPIED" ? "Ocupada" : "Reservada"})`,
        )
        .join(", ");

      return {
        success: false,
        message: `No se puede desactivar el piso porque tiene habitaciones en uso: ${busyList}. Debe esperar a que los huéspedes realicen check-out o reubicarlos antes de desactivar el piso.`,
      };
    }

    // Ejecutar transacción: Desactivar piso y pasar todas sus habitaciones a Fuera de Servicio (MAINTENANCE)
    const [updatedFloor, affectedRoomsResult] = await prisma.$transaction([
      prisma.floor.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      }),
      prisma.room.updateMany({
        where: {
          floorId: id,
          deletedAt: null,
          status: { not: "MAINTENANCE" },
        },
        data: {
          status: "MAINTENANCE",
        },
      }),
    ]);

    await createAuditLog({
      action: "FLOOR_DEACTIVATED",
      entity: "Floor",
      entityId: updatedFloor.id,
      details: {
        mensaje: `Se dio de baja (desactivó) el piso "${floor.name}" (Nivel ${floor.number}, ID: ${floor.id}). Se pasaron ${affectedRoomsResult.count} habitaciones a estado FUERA DE SERVICIO automáticamente.`,
        pisoId: floor.id,
        nivelPiso: floor.number,
        nombrePiso: floor.name,
        totalHabitacionesEnPiso: floor.rooms.length,
        habitacionesPasadasAMantenimiento: affectedRoomsResult.count,
        motivo: "Baja lógica de piso (mantenimiento / fuera de servicio general)",
      },
    });

    revalidatePath("/admin/pisos");
    revalidatePath("/admin/habitaciones");
    revalidatePath("/admin");

    return {
      success: true,
      message: `El piso "${floor.name}" fue desactivado exitosamente. Se colocaron ${affectedRoomsResult.count} habitación(es) en estado Fuera de Servicio.`,
    };
  } catch (error) {
    console.error("Error al desactivar piso:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al desactivar el piso.",
    };
  }
}

/**
 * Habilita / Restaura un piso desactivado y reactiva sus habitaciones a DISPONIBLE
 */
export async function restoreFloorAction(
  id: number,
): Promise<FloorActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["floors:update", "floors:manage", "rooms:update", "rooms:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para habilitar pisos.",
      };
    }

    const floor = await prisma.floor.findUnique({
      where: { id },
    });

    if (!floor) {
      return {
        success: false,
        message: `No se encontró el piso con ID ${id}.`,
      };
    }

    if (floor.deletedAt === null) {
      return {
        success: false,
        message: `El piso "${floor.name}" ya se encuentra activo.`,
      };
    }

    // Verificar que el nivel no esté tomado por otro piso activo
    const duplicateNumber = await prisma.floor.findFirst({
      where: {
        number: floor.number,
        id: { not: id },
        deletedAt: null,
      },
    });

    if (duplicateNumber) {
      return {
        success: false,
        message: `No se puede habilitar el piso porque ya existe otro piso activo con el nivel ${floor.number} ("${duplicateNumber.name}"). Edite el nivel antes de habilitarlo.`,
      };
    }

    // Ejecutar transacción: Habilitar piso y restaurar sus habitaciones en MAINTENANCE a AVAILABLE
    const [restoredFloor, restoredRoomsResult] = await prisma.$transaction([
      prisma.floor.update({
        where: { id },
        data: {
          deletedAt: null,
        },
      }),
      prisma.room.updateMany({
        where: {
          floorId: id,
          deletedAt: null,
          status: "MAINTENANCE",
        },
        data: {
          status: "AVAILABLE",
        },
      }),
    ]);

    await createAuditLog({
      action: "FLOOR_RESTORED",
      entity: "Floor",
      entityId: restoredFloor.id,
      details: {
        mensaje: `Se reactivó el piso "${restoredFloor.name}" (Nivel ${restoredFloor.number}, ID: ${restoredFloor.id}). Se habilitaron ${restoredRoomsResult.count} habitaciones a estado DISPONIBLE.`,
        pisoId: restoredFloor.id,
        nivelPiso: restoredFloor.number,
        nombrePiso: restoredFloor.name,
        habitacionesRestauradasADisponible: restoredRoomsResult.count,
      },
    });

    revalidatePath("/admin/pisos");
    revalidatePath("/admin/habitaciones");
    revalidatePath("/admin");

    return {
      success: true,
      message: `El piso "${restoredFloor.name}" ha sido habilitado con éxito. Se pusieron ${restoredRoomsResult.count} habitación(es) en servicio (Disponibles).`,
    };
  } catch (error) {
    console.error("Error al habilitar piso:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al habilitar el piso.",
    };
  }
}
