"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hasPermission } from "@/utils/permissions.utils";
import {
  createBookingSchema,
  updateBookingSchema,
  registerBookingDepositSchema,
  updateBookingStatusSchema,
  cancelBookingSchema,
  type CreateBookingInput,
  type UpdateBookingInput,
  type RegisterBookingDepositInput,
  type UpdateBookingStatusInput,
  type CancelBookingInput,
} from "./schema";
import type {
  ReceiptType,
  SerializedBooking,
  SerializedBookingPayment,
} from "@/types/bookings";

export interface BookingActionResult<T = unknown> {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
  data?: T;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseDateRange(
  checkInStr: string,
  checkOutStr: string,
  stayMode: "NIGHTLY" | "HOURLY" = "NIGHTLY",
) {
  if (stayMode === "HOURLY" || (checkInStr.includes("T") && checkOutStr.includes("T"))) {
    return {
      checkInDate: new Date(checkInStr),
      checkOutDate: new Date(checkOutStr),
    };
  }

  const checkInKey = checkInStr.slice(0, 10);
  const checkOutKey = checkOutStr.slice(0, 10);

  // Si entrada y salida son el mismo día (estancia corta / day-use), cerramos a las 23:59 del mismo día
  if (checkInKey === checkOutKey) {
    return {
      checkInDate: new Date(`${checkInKey}T14:00:00`),
      checkOutDate: new Date(`${checkOutKey}T23:59:00`),
    };
  }

  // Normalizamos fechas YYYY-MM-DD a horas estándar de hotel (14:00 Check-In, 12:00 Check-Out)
  const checkInDate =
    checkInStr.length === 10
      ? new Date(`${checkInStr}T14:00:00`)
      : new Date(checkInStr);
  const checkOutDate =
    checkOutStr.length === 10
      ? new Date(`${checkOutStr}T12:00:00`)
      : new Date(checkOutStr);

  return { checkInDate, checkOutDate };
}

function computeStayDuration(checkIn: Date, checkOut: Date) {
  const diffMs = Math.max(0, checkOut.getTime() - checkIn.getTime());
  const durationHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
  const isSameDayNightly =
    checkIn.getHours() === 14 &&
    checkOut.getHours() === 23 &&
    checkOut.getMinutes() === 59;
  const isHourly = durationHours < 20 && !isSameDayNightly;
  const nights = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  return { nights, isHourly, durationHours };
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

async function generateBookingCode(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RES-${year}-`;
  const lastBooking = await tx.booking.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { id: "desc" },
    select: { code: true },
  });

  let nextNumber = 1;
  if (lastBooking) {
    const numericPart = Number(lastBooking.code.replace(prefix, ""));
    if (!Number.isNaN(numericPart)) {
      nextNumber = numericPart + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

async function checkRoomConflict(
  roomId: number,
  checkInDate: Date,
  checkOutDate: Date,
  excludeBookingId?: number,
): Promise<string | null> {
  const conflictingBooking = await prisma.booking.findFirst({
    where: {
      roomId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
      checkInDate: { lt: checkOutDate },
      checkOutDate: { gt: checkInDate },
    },
    select: { code: true, checkInDate: true, checkOutDate: true },
  });

  if (conflictingBooking) {
    return `La habitación ya tiene la reserva ${conflictingBooking.code} en ese rango de fechas.`;
  }

  const conflictingStay = await prisma.stay.findFirst({
    where: {
      roomId,
      status: "ACTIVE",
      checkInAt: { lt: checkOutDate },
      expectedCheckOut: { gt: checkInDate },
    },
    select: { code: true },
  });

  if (conflictingStay) {
    return `La habitación se encuentra ocupada actualmente (estadía ${conflictingStay.code}) en esas fechas.`;
  }

  return null;
}

/**
 * Crea una nueva reserva con verificación de disponibilidad y registro opcional de adelanto en caja.
 */
export async function createBookingAction(
  input: CreateBookingInput,
): Promise<BookingActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["bookings:create", "bookings:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para crear reservas.",
      };
    }

    const parsed = createBookingSchema.safeParse(input);
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
    const { checkInDate, checkOutDate } = parseDateRange(
      data.checkInDate,
      data.checkOutDate,
      data.stayMode,
    );

    if (checkOutDate <= checkInDate) {
      return {
        success: false,
        errors: {
          checkOutDate:
            "La fecha de salida debe ser posterior a la fecha de llegada.",
        },
      };
    }

    const [room, guest] = await Promise.all([
      prisma.room.findFirst({
        where: { id: data.roomId, deletedAt: null },
        include: { roomType: true, floor: true },
      }),
      prisma.guest.findFirst({
        where: { id: data.guestId, deletedAt: null },
      }),
    ]);

    if (!room) {
      return {
        success: false,
        errors: { roomId: "La habitación seleccionada no existe o fue dada de baja." },
      };
    }

    if (room.status === "MAINTENANCE") {
      return {
        success: false,
        errors: {
          roomId: `La habitación ${room.number} está en mantenimiento y no se puede reservar.`,
        },
      };
    }

    if (data.numberOfGuests > room.roomType.maxGuests) {
      return {
        success: false,
        errors: {
          numberOfGuests: `La habitación ${room.number} (${room.roomType.name}) permite máximo ${room.roomType.maxGuests} huéspedes.`,
        },
      };
    }

    if (!guest) {
      return {
        success: false,
        errors: { guestId: "El huésped seleccionado no existe o está inactivo." },
      };
    }

    const conflictMessage = await checkRoomConflict(
      room.id,
      checkInDate,
      checkOutDate,
    );
    if (conflictMessage) {
      return {
        success: false,
        errors: { roomId: conflictMessage },
      };
    }

    const initialDeposit = roundMoney(data.initialDeposit);
    const totalPrice = roundMoney(data.totalPrice);

    // Si hay adelanto, se requiere un turno de caja abierto
    let activeShiftId: number | null = null;
    if (initialDeposit > 0) {
      const openShift = await prisma.cashShift.findFirst({
        where: { status: "OPEN" },
        select: { id: true },
      });

      if (!openShift) {
        return {
          success: false,
          message:
            "Para registrar un adelanto debes tener un Turno de Caja abierto. Abre caja en el módulo de Turno de Caja o registra la reserva con adelanto S/ 0.00 (Pendiente).",
        };
      }
      activeShiftId = openShift.id;
    }

    const created = await prisma.$transaction(async (tx) => {
      const code = await generateBookingCode(tx);

      const booking = await tx.booking.create({
        data: {
          code,
          origin: data.origin,
          roomId: room.id,
          guestId: guest.id,
          checkInDate,
          checkOutDate,
          numberOfGuests: data.numberOfGuests,
          status: initialDeposit > 0 ? "CONFIRMED" : "PENDING",
          totalPrice,
          depositPaid: initialDeposit,
          clientNotes: data.clientNotes,
          receptionNotes: data.receptionNotes,
        },
      });

      let receiptNumber: string | null = null;
      if (initialDeposit > 0 && activeShiftId) {
        receiptNumber = await issueReceiptNumber(tx, "TICKET");
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            cashShiftId: activeShiftId,
            amount: initialDeposit,
            method: data.paymentMethod,
            receiptType: "TICKET",
            receiptNumber,
            reference: data.paymentReference,
            notes: `Constancia de adelanto inicial — Reserva ${code}`,
          },
        });
      }

      return { booking, receiptNumber };
    });

    await createAuditLog({
      action: "BOOKING_CREATED",
      entity: "Booking",
      entityId: created.booking.id,
      details: {
        mensaje: `Se creó la reserva ${created.booking.code} para ${guest.firstName} ${guest.lastName} en Hab. ${room.number}`,
        codigo: created.booking.code,
        habitacion: room.number,
        huesped: `${guest.firstName} ${guest.lastName}`,
        checkIn: checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString(),
        total: totalPrice,
        adelanto: initialDeposit,
        comprobante: created.receiptNumber || "Sin adelanto",
        estado: created.booking.status,
      },
    });

    revalidatePath("/admin/reservas");
    revalidatePath("/admin/caja");
    revalidatePath("/admin");

    return {
      success: true,
      message: created.receiptNumber
        ? `Reserva ${created.booking.code} confirmada con adelanto de S/ ${initialDeposit.toFixed(2)} (Constancia ${created.receiptNumber}).`
        : `Reserva ${created.booking.code} registrada como Pendiente.`,
      data: { id: created.booking.id, code: created.booking.code },
    };
  } catch (error) {
    console.error("Error al crear reserva:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al registrar la reserva.",
    };
  }
}

/**
 * Actualiza los datos de una reserva pendiente o confirmada.
 */
export async function updateBookingAction(
  input: UpdateBookingInput,
): Promise<BookingActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["bookings:create", "bookings:update", "bookings:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para editar reservas.",
      };
    }

    const parsed = updateBookingSchema.safeParse(input);
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
    const existing = await prisma.booking.findUnique({
      where: { id: data.id },
    });

    if (!existing) {
      return { success: false, message: "La reserva no existe." };
    }

    if (existing.status !== "PENDING" && existing.status !== "CONFIRMED") {
      return {
        success: false,
        message: "Solo se pueden editar reservas en estado Pendiente o Confirmada.",
      };
    }

    const { checkInDate, checkOutDate } = parseDateRange(
      data.checkInDate,
      data.checkOutDate,
      data.stayMode,
    );

    if (checkOutDate <= checkInDate) {
      return {
        success: false,
        errors: {
          checkOutDate:
            "La fecha de salida debe ser posterior a la fecha de llegada.",
        },
      };
    }

    const totalPrice = roundMoney(data.totalPrice);
    const depositPaid = Number(existing.depositPaid);
    if (totalPrice < depositPaid) {
      return {
        success: false,
        errors: {
          totalPrice: `El monto total no puede ser menor al adelanto ya pagado (S/ ${depositPaid.toFixed(2)}).`,
        },
      };
    }

    const [room, guest] = await Promise.all([
      prisma.room.findFirst({
        where: { id: data.roomId, deletedAt: null },
        include: { roomType: true },
      }),
      prisma.guest.findFirst({
        where: { id: data.guestId, deletedAt: null },
      }),
    ]);

    if (!room) {
      return {
        success: false,
        errors: { roomId: "La habitación seleccionada no está disponible." },
      };
    }

    if (data.numberOfGuests > room.roomType.maxGuests) {
      return {
        success: false,
        errors: {
          numberOfGuests: `La habitación ${room.number} permite máximo ${room.roomType.maxGuests} huéspedes.`,
        },
      };
    }

    if (!guest) {
      return {
        success: false,
        errors: { guestId: "El huésped seleccionado no está activo." },
      };
    }

    const conflictMessage = await checkRoomConflict(
      room.id,
      checkInDate,
      checkOutDate,
      existing.id,
    );
    if (conflictMessage) {
      return {
        success: false,
        errors: { roomId: conflictMessage },
      };
    }

    await prisma.booking.update({
      where: { id: existing.id },
      data: {
        roomId: room.id,
        guestId: guest.id,
        checkInDate,
        checkOutDate,
        numberOfGuests: data.numberOfGuests,
        totalPrice,
        clientNotes: data.clientNotes,
        receptionNotes: data.receptionNotes,
      },
    });

    await createAuditLog({
      action: "BOOKING_UPDATED",
      entity: "Booking",
      entityId: existing.id,
      details: {
        mensaje: `Se actualizó la reserva ${existing.code} (Hab. ${room.number}, Total S/ ${totalPrice.toFixed(2)})`,
        codigo: existing.code,
        habitacion: room.number,
        huesped: `${guest.firstName} ${guest.lastName}`,
        total: totalPrice,
      },
    });

    revalidatePath("/admin/reservas");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Reserva ${existing.code} actualizada correctamente.`,
    };
  } catch (error) {
    console.error("Error al actualizar reserva:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al actualizar la reserva.",
    };
  }
}

/**
 * Registra un pago/adelanto adicional en una reserva y la vincula al Turno de Caja abierto.
 */
export async function registerBookingDepositAction(
  input: RegisterBookingDepositInput,
): Promise<BookingActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["bookings:create", "bookings:update", "bookings:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para registrar adelantos en reservas.",
      };
    }

    const parsed = registerBookingDepositSchema.safeParse(input);
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
    const amount = roundMoney(data.amount);

    const [booking, openShift] = await Promise.all([
      prisma.booking.findUnique({ where: { id: data.bookingId } }),
      prisma.cashShift.findFirst({
        where: { status: "OPEN" },
        select: { id: true },
      }),
    ]);

    if (!booking) {
      return { success: false, message: "No se encontró la reserva." };
    }

    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      return {
        success: false,
        message:
          "Solo se pueden registrar adelantos en reservas Pendientes o Confirmadas.",
      };
    }

    if (!openShift) {
      return {
        success: false,
        message:
          "No hay un Turno de Caja abierto. Abre un turno en el módulo de Caja antes de recibir pagos.",
      };
    }

    const pendingBalance = roundMoney(
      Number(booking.totalPrice) - Number(booking.depositPaid),
    );
    if (amount > pendingBalance) {
      return {
        success: false,
        errors: {
          amount: `El monto supera el saldo pendiente de la reserva (S/ ${pendingBalance.toFixed(2)}).`,
        },
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const receiptNumber = await issueReceiptNumber(tx, "TICKET");
      const newDepositPaid = roundMoney(Number(booking.depositPaid) + amount);

      await tx.payment.create({
        data: {
          bookingId: booking.id,
          cashShiftId: openShift.id,
          amount,
          method: data.method,
          receiptType: "TICKET",
          receiptNumber,
          reference: data.reference,
          notes: data.notes || `Constancia de adelanto — Reserva ${booking.code}`,
        },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          depositPaid: newDepositPaid,
          status: booking.status === "PENDING" ? "CONFIRMED" : booking.status,
        },
      });

      return { receiptNumber, newDepositPaid };
    });

    await createAuditLog({
      action: "BOOKING_DEPOSIT_REGISTERED",
      entity: "Booking",
      entityId: booking.id,
      details: {
        mensaje: `Se registró un adelanto de S/ ${amount.toFixed(2)} (${data.method}) para la reserva ${booking.code} — Comprobante ${result.receiptNumber}`,
        codigo: booking.code,
        monto: amount,
        metodo: data.method,
        comprobante: result.receiptNumber,
        turnoCajaId: openShift.id,
        adelantoAcumulado: result.newDepositPaid,
      },
    });

    revalidatePath("/admin/reservas");
    revalidatePath("/admin/caja");

    return {
      success: true,
      message: `Adelanto de S/ ${amount.toFixed(2)} registrado (Constancia ${result.receiptNumber}).`,
    };
  } catch (error) {
    console.error("Error al registrar adelanto:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al registrar el adelanto.",
    };
  }
}

/**
 * Cambia el estado de una reserva (Confirmar, Cancelar o No-Show).
 */
export async function updateBookingStatusAction(
  input: UpdateBookingStatusInput,
): Promise<BookingActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    const parsed = updateBookingStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: "Datos inválidos para actualizar el estado." };
    }

    const { bookingId, status, reason } = parsed.data;

    const requiredPerms =
      status === "CONFIRMED"
        ? ["bookings:create", "bookings:update", "bookings:manage"]
        : ["bookings:cancel", "bookings:manage"];

    if (!hasPermission(permissions, requiredPerms, session?.user?.role)) {
      return {
        success: false,
        message: "No tienes permiso para realizar esta acción sobre la reserva.",
      };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return { success: false, message: "No se encontró la reserva." };
    }

    if (booking.status === "CHECKED_IN") {
      return {
        success: false,
        message: "No se puede modificar una reserva que ya pasó a Check-In.",
      };
    }

    if (booking.status === "CANCELLED" || booking.status === "NO_SHOW") {
      return {
        success: false,
        message: "La reserva ya se encuentra cerrada (Cancelada o No-Show).",
      };
    }

    const updatedNotes = reason
      ? booking.receptionNotes
        ? `${booking.receptionNotes}\n[${status}] ${reason}`
        : `[${status}] ${reason}`
      : booking.receptionNotes;

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status,
        receptionNotes: updatedNotes,
      },
    });

    await createAuditLog({
      action: "BOOKING_STATUS_CHANGED",
      entity: "Booking",
      entityId: booking.id,
      details: {
        mensaje: `Reserva ${booking.code} cambió de ${booking.status} a ${status}`,
        codigo: booking.code,
        estadoAnterior: booking.status,
        estadoNuevo: status,
        motivo: reason || "No especificado",
      },
    });

    revalidatePath("/admin/reservas");
    revalidatePath("/admin");

    const labelMap = {
      CONFIRMED: "confirmada",
      CANCELLED: "cancelada",
      NO_SHOW: "marcada como No-Show",
    };

    return {
      success: true,
      message: `Reserva ${booking.code} ${labelMap[status]} correctamente.`,
    };
  } catch (error) {
    console.error("Error al actualizar estado de reserva:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al cambiar el estado de la reserva.",
    };
  }
}

/**
 * Cancela o marca como No-Show una reserva, con devolución opcional registrada como egreso en el Turno de Caja activo.
 */
export async function cancelOrNoShowBookingAction(
  input: CancelBookingInput,
): Promise<BookingActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["bookings:cancel", "bookings:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para cancelar o cerrar reservas.",
      };
    }

    const parsed = cancelBookingSchema.safeParse(input);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !errors[field]) errors[field] = issue.message;
      });
      return { success: false, errors };
    }

    const data = parsed.data;
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
    });

    if (!booking) {
      return { success: false, message: "No se encontró la reserva." };
    }

    if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
      return {
        success: false,
        message: "Esta reserva ya no puede ser cancelada ni marcada como No-Show.",
      };
    }

    const depositPaid = Number(booking.depositPaid);
    const refundAmount =
      data.outcome === "NO_SHOW" ? 0 : roundMoney(data.refundAmount);

    if (refundAmount > depositPaid) {
      return {
        success: false,
        errors: {
          refundAmount: `El monto a devolver no puede superar el adelanto pagado (S/ ${depositPaid.toFixed(2)}).`,
        },
      };
    }

    let openShiftId: number | null = null;
    if (refundAmount > 0) {
      const openShift = await prisma.cashShift.findFirst({
        where: { status: "OPEN" },
        select: { id: true },
      });

      if (!openShift) {
        return {
          success: false,
          message:
            "Para registrar una devolución debes tener un Turno de Caja abierto. Abre caja primero o cancela sin devolución.",
        };
      }
      openShiftId = openShift.id;
    }

    const notePrefix =
      data.outcome === "NO_SHOW"
        ? "[NO-SHOW]"
        : refundAmount > 0
          ? `[CANCELADA - Devolución S/ ${refundAmount.toFixed(2)} (${data.refundMethod})]`
          : "[CANCELADA - Sin devolución]";

    const updatedNotes = booking.receptionNotes
      ? `${booking.receptionNotes}\n${notePrefix} ${data.reason}`
      : `${notePrefix} ${data.reason}`;

    await prisma.$transaction(async (tx) => {
      if (refundAmount > 0 && openShiftId) {
        await tx.payment.create({
          data: {
            bookingId: booking.id,
            cashShiftId: openShiftId,
            amount: -refundAmount,
            method: data.refundMethod,
            receiptType: "TICKET",
            receiptNumber: null,
            reference: data.refundReference,
            notes: `Devolución de adelanto — Reserva ${booking.code}: ${data.reason}`,
          },
        });
      }

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: data.outcome,
          depositPaid: roundMoney(Math.max(0, depositPaid - refundAmount)),
          receptionNotes: updatedNotes,
        },
      });
    });

    await createAuditLog({
      action:
        data.outcome === "NO_SHOW" ? "BOOKING_NO_SHOW" : "BOOKING_CANCELLED",
      entity: "Booking",
      entityId: booking.id,
      details: {
        mensaje:
          data.outcome === "NO_SHOW"
            ? `Reserva ${booking.code} marcada como NO-SHOW (adelanto retenido: S/ ${depositPaid.toFixed(2)})`
            : refundAmount > 0
              ? `Reserva ${booking.code} cancelada con devolución de S/ ${refundAmount.toFixed(2)} (${data.refundMethod})`
              : `Reserva ${booking.code} cancelada sin devolución (adelanto retenido: S/ ${depositPaid.toFixed(2)})`,
        codigo: booking.code,
        estadoNuevo: data.outcome,
        adelantoPrevio: depositPaid,
        montoDevuelto: refundAmount,
        metodoDevolucion: refundAmount > 0 ? data.refundMethod : "No aplica",
        turnoCajaId: openShiftId,
        motivo: data.reason,
      },
    });

    revalidatePath("/admin/reservas");
    revalidatePath("/admin/caja");
    revalidatePath("/admin");

    return {
      success: true,
      message:
        data.outcome === "NO_SHOW"
          ? `Reserva ${booking.code} marcada como "No se presentó". Habitación liberada.`
          : refundAmount > 0
            ? `Reserva ${booking.code} cancelada y devolución de S/ ${refundAmount.toFixed(2)} registrada en caja.`
            : `Reserva ${booking.code} cancelada correctamente.`,
    };
  } catch (error) {
    console.error("Error al cancelar / marcar No-Show reserva:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al procesar la cancelación.",
    };
  }
}

/**
 * Obtiene el detalle completo y los pagos registrados de una reserva.
 */
export async function getBookingDetailAction(
  bookingId: number,
): Promise<BookingActionResult<SerializedBooking>> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["bookings:read", "bookings:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para ver el detalle de reservas.",
      };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        room: { include: { roomType: true, floor: true } },
        guest: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!booking) {
      return { success: false, message: "Reserva no encontrada." };
    }

    const totalPrice = Number(booking.totalPrice);
    const depositPaid = Number(booking.depositPaid);

    const payments: SerializedBookingPayment[] = booking.payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      receiptType: p.receiptType,
      receiptNumber: p.receiptNumber,
      reference: p.reference,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
    }));

    const duration = computeStayDuration(
      booking.checkInDate,
      booking.checkOutDate,
    );

    const serialized: SerializedBooking = {
      id: booking.id,
      code: booking.code,
      origin: booking.origin,
      roomId: booking.roomId,
      roomNumber: booking.room.number,
      floorName: booking.room.floor.name,
      roomTypeName: booking.room.roomType.name,
      roomBasePrice: Number(booking.room.roomType.basePrice),
      roomHourlyPrice: booking.room.roomType.hourlyPrice
        ? Number(booking.room.roomType.hourlyPrice)
        : null,
      roomMaxGuests: booking.room.roomType.maxGuests,
      guestId: booking.guestId,
      guestFullName: `${booking.guest.firstName} ${booking.guest.lastName}`,
      guestDocumentType: booking.guest.documentType,
      guestDocumentNumber: booking.guest.documentNumber,
      guestPhone: booking.guest.phone,
      checkInDate: booking.checkInDate.toISOString(),
      checkOutDate: booking.checkOutDate.toISOString(),
      nights: duration.nights,
      isHourly: duration.isHourly,
      durationHours: duration.durationHours,
      numberOfGuests: booking.numberOfGuests,
      status: booking.status,
      totalPrice,
      depositPaid,
      pendingBalance: roundMoney(Math.max(0, totalPrice - depositPaid)),
      paymentProofUrl: booking.paymentProofUrl,
      clientNotes: booking.clientNotes,
      receptionNotes: booking.receptionNotes,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      paymentsCount: payments.length,
      payments,
    };

    return { success: true, data: serialized };
  } catch (error) {
    console.error("Error al obtener detalle de reserva:", error);
    return {
      success: false,
      message: "No se pudo cargar el detalle de la reserva.",
    };
  }
}
