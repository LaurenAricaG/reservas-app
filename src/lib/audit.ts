import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export interface CreateAuditLogParams {
  action: string;
  entity: string;
  entityId?: number | null;
  details: Record<string, any>;
  userId?: number | null;
}

/**
 * Registra una actividad en la bitácora del sistema (AuditLog).
 * Garantiza que cada ID cuente con su descripción y contexto entendible
 * para un monitoreo claro de las acciones realizadas.
 */
export async function createAuditLog({
  action,
  entity,
  entityId,
  details,
  userId,
}: CreateAuditLogParams) {
  try {
    let resolvedUserId = userId;
    let resolvedUserData: {
      usuarioId?: number | null;
      username?: string | null;
      nombre?: string | null;
      rol?: string | null;
    } | null = null;

    if (!resolvedUserId) {
      const session = await auth();
      if (session?.user) {
        resolvedUserId = session.user.id ? Number(session.user.id) : null;
        resolvedUserData = {
          usuarioId: resolvedUserId,
          username: session.user.username || null,
          nombre: session.user.name || null,
          rol: session.user.role || null,
        };
      }
    }

    const enrichedDetails = {
      ...details,
      usuarioResponsable: details.usuarioResponsable || resolvedUserData || {
        usuarioId: resolvedUserId ?? null,
        referencia: "Sistema / Sesión actual",
      },
      fechaRegistro: new Date().toISOString(),
    };

    return await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId ?? null,
        userId: resolvedUserId ?? null,
        details: enrichedDetails,
      },
    });
  } catch (error) {
    console.error("Error al registrar en AuditLog:", error);
    return null;
  }
}
