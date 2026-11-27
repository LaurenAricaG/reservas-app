"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { guestSchema, type GuestInput } from "./schema";
import { createAuditLog } from "@/lib/audit";
import { hasPermission } from "@/utils/permissions.utils";

export interface GuestActionResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
  data?: any;
}

/**
 * Registra un nuevo huésped con validación Zod, verificación de documento y auditoría
 */
export async function createGuestAction(
  input: GuestInput,
): Promise<GuestActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["guests:create", "guests:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para registrar huéspedes.",
      };
    }

    const parsed = guestSchema.safeParse(input);

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

    const data = parsed.data;

    // Verificar unicidad del documento entre huéspedes activos
    const existing = await prisma.guest.findFirst({
      where: {
        documentNumber: data.documentNumber.trim(),
        deletedAt: null,
      },
    });

    if (existing) {
      return {
        success: false,
        errors: {
          documentNumber: `Ya existe un huésped registrado con el documento ${data.documentType}: "${data.documentNumber}" (${existing.firstName} ${existing.lastName}).`,
        },
      };
    }

    const guest = await prisma.guest.create({
      data: {
        documentType: data.documentType,
        documentNumber: data.documentNumber.trim(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email,
        phone: data.phone,
        nationality: data.nationality || "Peruana",
        originCity: data.originCity,
        businessName: data.businessName,
        fiscalAddress: data.fiscalAddress,
        notes: data.notes,
      },
    });

    await createAuditLog({
      action: "GUEST_CREATED",
      entity: "Guest",
      entityId: guest.id,
      details: {
        mensaje: `Se registró al huésped "${guest.firstName} ${guest.lastName}" (${guest.documentType}: ${guest.documentNumber}) con ID #${guest.id}`,
        huespedId: guest.id,
        nombreCompleto: `${guest.firstName} ${guest.lastName}`,
        tipoDocumento: guest.documentType,
        numeroDocumento: guest.documentNumber,
        telefono: guest.phone || "No especificado",
        razonSocial: guest.businessName || "No aplica",
      },
    });

    revalidatePath("/admin/huespedes");

    return {
      success: true,
      message: `Huésped "${guest.firstName} ${guest.lastName}" registrado exitosamente.`,
      data: JSON.parse(JSON.stringify(guest)),
    };
  } catch (error: any) {
    console.error("Error al registrar huésped:", error);
    if (error?.code === "P2002") {
      return {
        success: false,
        errors: {
          documentNumber: "Ya existe un huésped registrado con este número de documento.",
        },
      };
    }
    return {
      success: false,
      message: "Ocurrió un error inesperado al registrar el huésped.",
    };
  }
}

/**
 * Actualiza los datos de un huésped con validación Zod y bitácora de cambios
 */
export async function updateGuestAction(
  id: number,
  input: GuestInput,
): Promise<GuestActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["guests:update", "guests:edit", "guests:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para modificar datos de huéspedes.",
      };
    }

    const parsed = guestSchema.safeParse(input);

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

    const data = parsed.data;

    const existing = await prisma.guest.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        message: `No se encontró el huésped con ID #${id}.`,
      };
    }

    // Verificar unicidad de documento si cambió
    if (
      existing.documentNumber !== data.documentNumber.trim() ||
      existing.documentType !== data.documentType
    ) {
      const duplicate = await prisma.guest.findFirst({
        where: {
          documentNumber: data.documentNumber.trim(),
          id: { not: id },
          deletedAt: null,
        },
      });

      if (duplicate) {
        return {
          success: false,
          errors: {
            documentNumber: `Ya existe otro huésped con el documento "${data.documentNumber}" (${duplicate.firstName} ${duplicate.lastName}).`,
          },
        };
      }
    }

    // Auditoría de modificaciones
    const cambios: Record<string, { anterior: any; nuevo: any }> = {};
    if (existing.documentNumber !== data.documentNumber.trim()) {
      cambios["documento"] = {
        anterior: `${existing.documentType}: ${existing.documentNumber}`,
        nuevo: `${data.documentType}: ${data.documentNumber}`,
      };
    }
    if (existing.firstName !== data.firstName.trim()) {
      cambios["nombres"] = { anterior: existing.firstName, nuevo: data.firstName };
    }
    if (existing.lastName !== data.lastName.trim()) {
      cambios["apellidos"] = { anterior: existing.lastName, nuevo: data.lastName };
    }
    if ((existing.phone || null) !== (data.phone || null)) {
      cambios["telefono"] = {
        anterior: existing.phone || "Sin teléfono",
        nuevo: data.phone || "Sin teléfono",
      };
    }
    if ((existing.email || null) !== (data.email || null)) {
      cambios["email"] = {
        anterior: existing.email || "Sin correo",
        nuevo: data.email || "Sin correo",
      };
    }
    if ((existing.businessName || null) !== (data.businessName || null)) {
      cambios["razonSocial"] = {
        anterior: existing.businessName || "Sin razón social",
        nuevo: data.businessName || "Sin razón social",
      };
    }

    const updated = await prisma.guest.update({
      where: { id },
      data: {
        documentType: data.documentType,
        documentNumber: data.documentNumber.trim(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email,
        phone: data.phone,
        nationality: data.nationality || "Peruana",
        originCity: data.originCity,
        businessName: data.businessName,
        fiscalAddress: data.fiscalAddress,
        notes: data.notes,
      },
    });

    await createAuditLog({
      action: "GUEST_UPDATED",
      entity: "Guest",
      entityId: updated.id,
      details: {
        mensaje: `Se modificó la información del huésped "${updated.firstName} ${updated.lastName}" (ID: #${updated.id})`,
        huespedId: updated.id,
        nombreActual: `${updated.firstName} ${updated.lastName}`,
        documentoActual: `${updated.documentType}: ${updated.documentNumber}`,
        cambiosDetectados:
          Object.keys(cambios).length > 0
            ? cambios
            : "Sin modificaciones detectadas",
      },
    });

    revalidatePath("/admin/huespedes");

    return {
      success: true,
      message: `Huésped "${updated.firstName} ${updated.lastName}" actualizado con éxito.`,
      data: JSON.parse(JSON.stringify(updated)),
    };
  } catch (error: any) {
    console.error("Error al actualizar huésped:", error);
    if (error?.code === "P2002") {
      return {
        success: false,
        errors: {
          documentNumber: "Ya existe un huésped con este número de documento.",
        },
      };
    }
    return {
      success: false,
      message: "Ocurrió un error inesperado al actualizar el huésped.",
    };
  }
}

/**
 * Da de baja lógica a un huésped, validando que no tenga un hospedaje activo
 */
export async function deactivateGuestAction(
  id: number,
): Promise<GuestActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["guests:delete", "guests:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para dar de baja huéspedes.",
      };
    }

    const guest = await prisma.guest.findUnique({
      where: { id },
      include: {
        staysAsPrimary: {
          where: { status: "ACTIVE" },
          select: { id: true, code: true, room: { select: { number: true } } },
        },
      },
    });

    if (!guest) {
      return {
        success: false,
        message: `No se encontró el huésped con ID #${id}.`,
      };
    }

    if (guest.deletedAt !== null) {
      return {
        success: false,
        message: `El huésped "${guest.firstName} ${guest.lastName}" ya se encuentra inactivo.`,
      };
    }

    // Regla de negocio: Validar que no tenga un hospedaje activo
    if (guest.staysAsPrimary.length > 0) {
      const activeStay = guest.staysAsPrimary[0];
      return {
        success: false,
        message: `No se puede desactivar al huésped porque actualmente tiene un hospedaje activo en la Habitación ${activeStay.room.number} (Código: ${activeStay.code}). Debe realizar el check-out primero.`,
      };
    }

    const updated = await prisma.guest.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    await createAuditLog({
      action: "GUEST_DEACTIVATED",
      entity: "Guest",
      entityId: updated.id,
      details: {
        mensaje: `Se dio de baja (desactivó) al huésped "${guest.firstName} ${guest.lastName}" (${guest.documentType}: ${guest.documentNumber}, ID: #${guest.id})`,
        huespedId: guest.id,
        nombreCompleto: `${guest.firstName} ${guest.lastName}`,
        documento: `${guest.documentType}: ${guest.documentNumber}`,
        estadoNuevo: "Inactivo (Dado de baja)",
      },
    });

    revalidatePath("/admin/huespedes");

    return {
      success: true,
      message: `Huésped "${guest.firstName} ${guest.lastName}" desactivado con éxito.`,
    };
  } catch (error) {
    console.error("Error al desactivar huésped:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al desactivar el huésped.",
    };
  }
}

/**
 * Restaura un huésped dado de baja
 */
export async function restoreGuestAction(
  id: number,
): Promise<GuestActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["guests:update", "guests:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para restaurar huéspedes.",
      };
    }

    const guest = await prisma.guest.findUnique({
      where: { id },
    });

    if (!guest) {
      return {
        success: false,
        message: `No se encontró el huésped con ID #${id}.`,
      };
    }

    if (guest.deletedAt === null) {
      return {
        success: false,
        message: `El huésped "${guest.firstName} ${guest.lastName}" ya se encuentra activo.`,
      };
    }

    // Verificar que el documento no esté tomado por otro huésped activo
    const duplicate = await prisma.guest.findFirst({
      where: {
        documentNumber: guest.documentNumber,
        id: { not: id },
        deletedAt: null,
      },
    });

    if (duplicate) {
      return {
        success: false,
        message: `No se puede habilitar porque ya existe otro huésped activo con el documento ${guest.documentNumber} ("${duplicate.firstName} ${duplicate.lastName}").`,
      };
    }

    const updated = await prisma.guest.update({
      where: { id },
      data: {
        deletedAt: null,
      },
    });

    await createAuditLog({
      action: "GUEST_RESTORED",
      entity: "Guest",
      entityId: updated.id,
      details: {
        mensaje: `Se restauró y habilitó al huésped "${updated.firstName} ${updated.lastName}" (${updated.documentType}: ${updated.documentNumber}, ID: #${updated.id})`,
        huespedId: updated.id,
        nombreCompleto: `${updated.firstName} ${updated.lastName}`,
        documento: `${updated.documentType}: ${updated.documentNumber}`,
        estadoNuevo: "Activo (Habilitado)",
      },
    });

    revalidatePath("/admin/huespedes");

    return {
      success: true,
      message: `Huésped "${updated.firstName} ${updated.lastName}" habilitado exitosamente.`,
    };
  } catch (error) {
    console.error("Error al restaurar huésped:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al restaurar el huésped.",
    };
  }
}
