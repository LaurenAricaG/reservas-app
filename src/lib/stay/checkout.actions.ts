"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hasPermission } from "@/utils/permissions.utils";
import {
  completeCheckOutSchema,
  extendStaySchema,
  type CompleteCheckOutInput,
  type ExtendStayInput,
} from "./checkout.schema";
import type { ReceiptType } from "@/types/stays";
import type { StayActionResult } from "./actions";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const DEFAULT_SERIES_MAP: Record<ReceiptType, string> = {
  TICKET: "T001",
  BOLETA: "B001",
  FACTURA: "F001",
};

async function issueReceiptNumber(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  receiptType: ReceiptType,
): Promise<string> {
  const seriesCode = DEFAULT_SERIES_MAP[receiptType];
  const updatedSeries = await tx.receiptSeries.upsert({
    where: { series: seriesCode },
    update: { currentNumber: { increment: 1 } },
    create: {
      receiptType,
      series: seriesCode,
      currentNumber: 1,
    },
  });

  const padded = String(updatedSeries.currentNumber).padStart(8, "0");
  return `${updatedSeries.series}-${padded}`;
}

/**
 * Completa el Check-Out de una estadía activa:
 * - Liquida el saldo pendiente en el Turno de Caja abierto emitiendo comprobante formal (Ticket/Boleta/Factura)
 * - Marca la estadía como COMPLETED con actualCheckOut
 * - Cambia la habitación automáticamente a CLEANING (En limpieza)
 */
export async function completeCheckOutAction(
  input: CompleteCheckOutInput,
): Promise<StayActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["stays:checkout", "stays:update", "stays:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para realizar Check-Out.",
      };
    }

    const parsed = completeCheckOutSchema.safeParse(input);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !errors[field]) errors[field] = issue.message;
      });
      return { success: false, errors };
    }

    const data = parsed.data;
    const stay = await prisma.stay.findUnique({
      where: { id: data.stayId },
      include: {
        room: true,
        primaryGuest: true,
      },
    });

    if (!stay) {
      return { success: false, message: "No se encontró la estadía." };
    }

    if (stay.status !== "ACTIVE") {
      return {
        success: false,
        message: `La estadía ${stay.code} ya no está activa.`,
      };
    }

    const totalRoomCost = Number(stay.totalRoomCost);
    const totalExtraCost = Number(stay.totalExtraCost);
    const currentDiscount = Number(stay.discount);
    const extraDiscount = roundMoney(data.extraDiscount);
    const paidAmount = Number(stay.paidAmount);
    const securityDeposit = Number(stay.securityDeposit);

    const grossTotal = roundMoney(totalRoomCost + totalExtraCost);
    const finalDiscount = roundMoney(currentDiscount + extraDiscount);
    if (finalDiscount > grossTotal) {
      return {
        success: false,
        errors: {
          extraDiscount:
            "El descuento total no puede superar el total de la cuenta.",
        },
      };
    }

    const finalTotalAmount = roundMoney(Math.max(0, grossTotal - finalDiscount));
    const pendingBalance = roundMoney(Math.max(0, finalTotalAmount - paidAmount));

    let openShiftId: number | null = null;
    if (pendingBalance > 0) {
      const openShift = await prisma.cashShift.findFirst({
        where: { status: "OPEN" },
        select: { id: true },
      });

      if (!openShift) {
        return {
          success: false,
          message: `Hay un saldo pendiente de S/ ${pendingBalance.toFixed(2)}. Abre un Turno de Caja antes de realizar el Check-Out.`,
        };
      }
      openShiftId = openShift.id;
    }

    const now = new Date();
    const depositNote =
      securityDeposit > 0
        ? data.securityDepositReturned
          ? `Garantía S/ ${securityDeposit.toFixed(2)} devuelta.`
          : `Garantía S/ ${securityDeposit.toFixed(2)} retenida.`
        : null;

    const result = await prisma.$transaction(async (tx) => {
      const receiptNumber = await issueReceiptNumber(tx, data.receiptType);

      if (pendingBalance > 0 && openShiftId) {
        await tx.payment.create({
          data: {
            stayId: stay.id,
            cashShiftId: openShiftId,
            amount: pendingBalance,
            method: data.paymentMethod,
            receiptType: data.receiptType,
            receiptNumber,
            reference: data.paymentReference,
            notes: `Liquidación Check-Out — Estadía ${stay.code}`,
          },
        });
      }

      const checkOutSummary = [
        `[CHECK-OUT ${receiptNumber}]`,
        depositNote,
        data.notes,
      ]
        .filter(Boolean)
        .join(" ");

      const updatedNotes = stay.notes
        ? `${stay.notes}\n${checkOutSummary}`
        : checkOutSummary;

      await tx.stay.update({
        where: { id: stay.id },
        data: {
          status: "COMPLETED",
          actualCheckOut: now,
          discount: finalDiscount,
          totalAmount: finalTotalAmount,
          paidAmount: roundMoney(paidAmount + pendingBalance),
          notes: updatedNotes,
        },
      });

      // Pasar habitación automáticamente a En Limpieza
      await tx.room.update({
        where: { id: stay.roomId },
        data: { status: "CLEANING" },
      });

      return { receiptNumber };
    });

    await createAuditLog({
      action: "CHECK_OUT",
      entity: "Stay",
      entityId: stay.id,
      details: {
        mensaje: `Check-Out completado para ${stay.code} (Hab. ${stay.room.number} → En Limpieza). Comprobante ${result.receiptNumber}`,
        codigo: stay.code,
        habitacion: stay.room.number,
        huesped: `${stay.primaryGuest.firstName} ${stay.primaryGuest.lastName}`,
        totalFinal: finalTotalAmount,
        descuentoTotal: finalDiscount,
        saldoCobrado: pendingBalance,
        metodoPago: pendingBalance > 0 ? data.paymentMethod : "Ya cancelado",
        comprobanteTipo: data.receiptType,
        comprobanteNumero: result.receiptNumber,
        garantiaDevuelta:
          securityDeposit > 0 ? data.securityDepositReturned : "No aplica",
        turnoCajaId: openShiftId,
      },
    });

    revalidatePath("/admin/check-out");
    revalidatePath("/admin/check-in");
    revalidatePath("/admin/reservas");
    revalidatePath("/admin/habitaciones");
    revalidatePath("/admin/caja");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Check-Out completado (${result.receiptNumber}). Hab. ${stay.room.number} pasó a En Limpieza.`,
      data: { receiptNumber: result.receiptNumber },
    };
  } catch (error) {
    console.error("Error al completar Check-Out:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al procesar el Check-Out.",
    };
  }
}

/**
 * Extiende una estadía activa agregando noches u horas adicionales.
 */
export async function extendStayAction(
  input: ExtendStayInput,
): Promise<StayActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["stays:checkout", "stays:checkin", "stays:update", "stays:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para extender estadías.",
      };
    }

    const parsed = extendStaySchema.safeParse(input);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !errors[field]) errors[field] = issue.message;
      });
      return { success: false, errors };
    }

    const data = parsed.data;
    const stay = await prisma.stay.findUnique({
      where: { id: data.stayId },
      include: { room: { select: { id: true, number: true } } },
    });

    if (!stay) {
      return { success: false, message: "No se encontró la estadía." };
    }

    if (stay.status !== "ACTIVE") {
      return {
        success: false,
        message: "Solo se pueden extender estadías activas.",
      };
    }

    const baseTime = new Date(
      Math.max(Date.now(), stay.expectedCheckOut.getTime()),
    );
    const newExpectedCheckOut = new Date(baseTime);

    if (data.mode === "NIGHTS") {
      newExpectedCheckOut.setDate(newExpectedCheckOut.getDate() + data.units);
      newExpectedCheckOut.setHours(12, 0, 0, 0);
    } else {
      newExpectedCheckOut.setTime(
        newExpectedCheckOut.getTime() + data.units * 60 * 60 * 1000,
      );
    }

    // Verificar que no choque con una reserva futura en la misma habitación
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        roomId: stay.roomId,
        status: { in: ["PENDING", "CONFIRMED"] },
        checkInDate: { lt: newExpectedCheckOut },
        checkOutDate: { gt: stay.expectedCheckOut },
      },
      select: { code: true },
    });

    if (conflictingBooking) {
      return {
        success: false,
        message: `No se puede extender la estadía porque la Hab. ${stay.room.number} tiene la reserva ${conflictingBooking.code} programada en ese horario.`,
      };
    }

    const additionalCost = roundMoney(data.additionalCost);
    const newRoomCost = roundMoney(Number(stay.totalRoomCost) + additionalCost);
    const newTotalAmount = roundMoney(
      Math.max(
        0,
        newRoomCost + Number(stay.totalExtraCost) - Number(stay.discount),
      ),
    );

    const extLabel =
      data.mode === "NIGHTS"
        ? `+${data.units} ${data.units === 1 ? "noche" : "noches"}`
        : `+${data.units} ${data.units === 1 ? "hora" : "horas"}`;
    const noteEntry = `[EXTENSIÓN ${extLabel} · +S/ ${additionalCost.toFixed(2)}]${data.notes ? ` ${data.notes}` : ""}`;
    const updatedNotes = stay.notes ? `${stay.notes}\n${noteEntry}` : noteEntry;

    await prisma.stay.update({
      where: { id: stay.id },
      data: {
        expectedCheckOut: newExpectedCheckOut,
        totalRoomCost: newRoomCost,
        totalAmount: newTotalAmount,
        notes: updatedNotes,
      },
    });

    await createAuditLog({
      action: "STAY_EXTENDED",
      entity: "Stay",
      entityId: stay.id,
      details: {
        mensaje: `Estadía ${stay.code} (Hab. ${stay.room.number}) extendida ${extLabel} (+S/ ${additionalCost.toFixed(2)})`,
        codigo: stay.code,
        habitacion: stay.room.number,
        extension: extLabel,
        costoAdicional: additionalCost,
        nuevaSalidaEstimada: newExpectedCheckOut.toISOString(),
      },
    });

    revalidatePath("/admin/check-out");
    revalidatePath("/admin/check-in");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Estadía ${stay.code} extendida (${extLabel}). Nuevo total: S/ ${newTotalAmount.toFixed(2)}.`,
    };
  } catch (error) {
    console.error("Error al extender estadía:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al extender la estadía.",
    };
  }
}
