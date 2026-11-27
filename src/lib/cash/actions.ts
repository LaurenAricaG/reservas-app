"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hasPermission } from "@/utils/permissions.utils";
import {
  openCashShiftSchema,
  closeCashShiftSchema,
  type OpenCashShiftInput,
  type CloseCashShiftInput,
} from "./schema";
import type {
  PaymentMethodBreakdown,
  SerializedCashPayment,
  SerializedCashShift,
} from "@/types/cash";

export interface CashActionResult<T = unknown> {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
  data?: T;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function computeBreakdown(
  payments: Array<{ amount: unknown; method: string }>,
): {
  breakdown: PaymentMethodBreakdown;
  totalCollected: number;
  cashCollected: number;
  digitalCollected: number;
} {
  const breakdown: PaymentMethodBreakdown = {
    CASH: 0,
    CARD: 0,
    TRANSFER: 0,
    YAPE: 0,
    PLIN: 0,
  };

  for (const payment of payments) {
    const amt = Number(payment.amount) || 0;
    if (payment.method in breakdown) {
      const key = payment.method as keyof PaymentMethodBreakdown;
      breakdown[key] = roundMoney(breakdown[key] + amt);
    }
  }

  const cashCollected = breakdown.CASH;
  const digitalCollected = roundMoney(
    breakdown.CARD + breakdown.TRANSFER + breakdown.YAPE + breakdown.PLIN,
  );
  const totalCollected = roundMoney(cashCollected + digitalCollected);

  return { breakdown, totalCollected, cashCollected, digitalCollected };
}

/**
 * Abre un nuevo turno de caja validando que no exista otro turno abierto simultáneamente.
 */
export async function openCashShiftAction(
  input: OpenCashShiftInput,
): Promise<CashActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["cash:open", "cash:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para abrir un turno de caja.",
      };
    }

    const userId = session?.user?.id ? Number(session.user.id) : null;
    if (!userId || Number.isNaN(userId)) {
      return {
        success: false,
        message: "No se pudo identificar al usuario de la sesión actual.",
      };
    }

    const parsed = openCashShiftSchema.safeParse(input);
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

    const { initialCash, notes } = parsed.data;

    // Verificar si ya existe un turno abierto
    const existingOpenShift = await prisma.cashShift.findFirst({
      where: { status: "OPEN" },
      include: {
        user: { select: { name: true, username: true } },
      },
    });

    if (existingOpenShift) {
      return {
        success: false,
        message: `Ya existe un turno de caja abierto (#${existingOpenShift.id}) a cargo de ${existingOpenShift.user.name}. Ciérralo antes de abrir uno nuevo.`,
      };
    }

    const shift = await prisma.cashShift.create({
      data: {
        userId,
        initialCash: roundMoney(initialCash),
        status: "OPEN",
        notes,
      },
    });

    await createAuditLog({
      action: "CASH_SHIFT_OPENED",
      entity: "CashShift",
      entityId: shift.id,
      userId,
      details: {
        mensaje: `Se abrió el turno de caja #${shift.id} con saldo inicial de S/ ${roundMoney(initialCash).toFixed(2)}`,
        turnoId: shift.id,
        saldoInicial: roundMoney(initialCash),
        notas: notes || "Sin observaciones",
      },
    });

    revalidatePath("/admin/caja");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Turno de caja #${shift.id} abierto correctamente con S/ ${roundMoney(initialCash).toFixed(2)}.`,
      data: { id: shift.id },
    };
  } catch (error) {
    console.error("Error al abrir turno de caja:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al abrir el turno de caja.",
    };
  }
}

/**
 * Realiza el arqueo y cierre de un turno de caja abierto.
 */
export async function closeCashShiftAction(
  input: CloseCashShiftInput,
): Promise<CashActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["cash:close", "cash:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para cerrar turnos de caja.",
      };
    }

    const parsed = closeCashShiftSchema.safeParse(input);
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

    const { shiftId, actualCash, notes } = parsed.data;

    const shift = await prisma.cashShift.findUnique({
      where: { id: shiftId },
      include: {
        user: { select: { name: true, username: true } },
        payments: {
          select: { amount: true, method: true },
        },
      },
    });

    if (!shift) {
      return {
        success: false,
        message: "No se encontró el turno de caja especificado.",
      };
    }

    if (shift.status !== "OPEN") {
      return {
        success: false,
        message: `El turno de caja #${shift.id} ya se encuentra cerrado.`,
      };
    }

    const { breakdown, cashCollected, digitalCollected, totalCollected } =
      computeBreakdown(shift.payments);

    const initialCashNum = Number(shift.initialCash);
    const expectedCash = roundMoney(initialCashNum + cashCollected);
    const actualCashRounded = roundMoney(actualCash);
    const difference = roundMoney(actualCashRounded - expectedCash);

    const mergedNotes = notes
      ? shift.notes
        ? `${shift.notes}\n[Cierre] ${notes}`
        : notes
      : shift.notes;

    const updated = await prisma.cashShift.update({
      where: { id: shift.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        expectedCash,
        actualCash: actualCashRounded,
        difference,
        notes: mergedNotes,
      },
    });

    await createAuditLog({
      action: "CASH_SHIFT_CLOSED",
      entity: "CashShift",
      entityId: updated.id,
      details: {
        mensaje: `Se cerró el turno de caja #${updated.id}. Esperado: S/ ${expectedCash.toFixed(2)} | Contado: S/ ${actualCashRounded.toFixed(2)} | Diferencia: S/ ${difference.toFixed(2)}`,
        turnoId: updated.id,
        responsableApertura: shift.user.name,
        saldoInicial: initialCashNum,
        cobrosEfectivo: cashCollected,
        cobrosDigitales: digitalCollected,
        totalRecaudado: totalCollected,
        desgloseMetodos: breakdown,
        efectivoEsperado: expectedCash,
        efectivoContado: actualCashRounded,
        diferencia: difference,
        notasCierre: notes || "Sin observaciones",
      },
    });

    revalidatePath("/admin/caja");
    revalidatePath("/admin");

    const diffLabel =
      difference === 0
        ? "Caja cuadrada sin diferencias."
        : difference > 0
          ? `Sobrante registrado de S/ ${difference.toFixed(2)}.`
          : `Faltante registrado de S/ ${Math.abs(difference).toFixed(2)}.`;

    return {
      success: true,
      message: `Turno #${updated.id} cerrado exitosamente. ${diffLabel}`,
      data: {
        id: updated.id,
        expectedCash,
        actualCash: actualCashRounded,
        difference,
      },
    };
  } catch (error) {
    console.error("Error al cerrar turno de caja:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al cerrar el turno de caja.",
    };
  }
}

/**
 * Obtiene el detalle completo y los pagos registrados en un turno de caja.
 */
export async function getCashShiftDetailAction(
  shiftId: number,
): Promise<CashActionResult<SerializedCashShift>> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["cash:read", "cash:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para ver el detalle de caja.",
      };
    }

    const shift = await prisma.cashShift.findUnique({
      where: { id: shiftId },
      include: {
        user: { select: { name: true, username: true } },
        payments: {
          orderBy: { createdAt: "desc" },
          include: {
            booking: {
              select: {
                code: true,
                guest: { select: { firstName: true, lastName: true } },
              },
            },
            stay: {
              select: {
                code: true,
                primaryGuest: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    if (!shift) {
      return {
        success: false,
        message: "Turno de caja no encontrado.",
      };
    }

    const { breakdown, totalCollected, cashCollected, digitalCollected } =
      computeBreakdown(shift.payments);

    const payments: SerializedCashPayment[] = shift.payments.map((p) => {
      const guestObj = p.stay?.primaryGuest ?? p.booking?.guest ?? null;
      return {
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        receiptType: p.receiptType,
        receiptNumber: p.receiptNumber,
        reference: p.reference,
        notes: p.notes,
        createdAt: p.createdAt.toISOString(),
        bookingCode: p.booking?.code ?? null,
        stayCode: p.stay?.code ?? null,
        guestName: guestObj ? `${guestObj.firstName} ${guestObj.lastName}` : null,
      };
    });

    const initialCashNum = Number(shift.initialCash);
    const serialized: SerializedCashShift = {
      id: shift.id,
      userId: shift.userId,
      userName: shift.user.name,
      userUsername: shift.user.username,
      openedAt: shift.openedAt.toISOString(),
      closedAt: shift.closedAt ? shift.closedAt.toISOString() : null,
      initialCash: initialCashNum,
      expectedCash:
        shift.expectedCash !== null
          ? Number(shift.expectedCash)
          : roundMoney(initialCashNum + cashCollected),
      actualCash: shift.actualCash !== null ? Number(shift.actualCash) : null,
      difference: shift.difference !== null ? Number(shift.difference) : null,
      status: shift.status,
      notes: shift.notes,
      createdAt: shift.createdAt.toISOString(),
      updatedAt: shift.updatedAt.toISOString(),
      totalPaymentsCount: payments.length,
      totalCollected,
      cashCollected,
      digitalCollected,
      breakdown,
      payments,
    };

    return {
      success: true,
      data: serialized,
    };
  } catch (error) {
    console.error("Error al obtener detalle del turno de caja:", error);
    return {
      success: false,
      message: "No se pudo cargar el detalle del turno de caja.",
    };
  }
}
