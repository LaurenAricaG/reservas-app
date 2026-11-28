"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hasPermission } from "@/utils/permissions.utils";
import {
  createStaySchema,
  addExtraChargeSchema,
  registerStayPaymentSchema,
  type CreateStayInput,
  type AddExtraChargeInput,
  type RegisterStayPaymentInput,
} from "./schema";
import type {
  SerializedStay,
  SerializedStayAdditionalGuest,
  SerializedStayExtraCharge,
  SerializedStayPayment,
} from "@/types/stays";

export interface StayActionResult<T = unknown> {
  success: boolean;
  message?: string;
  errors?: Record<string, string>;
  data?: T;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function computeStayDuration(checkIn: Date, checkOut: Date) {
  const diffMs = Math.max(0, checkOut.getTime() - checkIn.getTime());
  const durationHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
  const isSameDayNightly =
    checkOut.getHours() === 23 && checkOut.getMinutes() === 59;
  const isHourly = durationHours < 20 && !isSameDayNightly;
  const nights = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  return { nights, isHourly, durationHours };
}

async function generateStayCode(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EST-${year}-`;
  const lastStay = await tx.stay.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { id: "desc" },
    select: { code: true },
  });

  let nextNumber = 1;
  if (lastStay) {
    const numericPart = Number(lastStay.code.replace(prefix, ""));
    if (!Number.isNaN(numericPart)) {
      nextNumber = numericPart + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

async function issueInternalTicketNumber(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
): Promise<string> {
  const updatedSeries = await tx.receiptSeries.upsert({
    where: { series: "T001" },
    update: { currentNumber: { increment: 1 } },
    create: {
      receiptType: "TICKET",
      series: "T001",
      currentNumber: 1,
    },
  });

  const padded = String(updatedSeries.currentNumber).padStart(8, "0");
  return `${updatedSeries.series}-${padded}`;
}

/**
 * Registra un Check-In (directo walk-in o desde una reserva existente),
 * marca la habitación como OCCUPIED y registra el pago inicial en caja si corresponde.
 */
export async function createStayAction(
  input: CreateStayInput,
): Promise<StayActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["stays:checkin", "stays:create", "stays:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para realizar Check-In.",
      };
    }

    const parsed = createStaySchema.safeParse(input);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !errors[field]) errors[field] = issue.message;
      });
      return { success: false, errors };
    }

    const data = parsed.data;
    const now = new Date();
    const expectedCheckOut =
      data.expectedCheckOut.length === 10
        ? new Date(`${data.expectedCheckOut}T12:00:00`)
        : new Date(data.expectedCheckOut);

    if (Number.isNaN(expectedCheckOut.getTime())) {
      return {
        success: false,
        errors: { expectedCheckOut: "Fecha de salida estimada inválida." },
      };
    }

    // Si es mismo día en modalidad por noche, ajustar a las 23:59
    if (
      data.stayMode === "NIGHTLY" &&
      expectedCheckOut.getTime() <= now.getTime()
    ) {
      const sameDayEnd = new Date(expectedCheckOut);
      sameDayEnd.setHours(23, 59, 0, 0);
      if (sameDayEnd.getTime() > now.getTime()) {
        expectedCheckOut.setHours(23, 59, 0, 0);
      } else {
        return {
          success: false,
          errors: {
            expectedCheckOut:
              "La fecha/hora de salida estimada debe ser posterior al momento actual.",
          },
        };
      }
    } else if (expectedCheckOut.getTime() <= now.getTime()) {
      return {
        success: false,
        errors: {
          expectedCheckOut:
            "La hora de salida estimada debe ser posterior a la hora actual.",
        },
      };
    }

    const [room, primaryGuest] = await Promise.all([
      prisma.room.findFirst({
        where: { id: data.roomId, deletedAt: null },
        include: { roomType: true, floor: true },
      }),
      prisma.guest.findFirst({
        where: { id: data.primaryGuestId, deletedAt: null },
      }),
    ]);

    if (!room) {
      return {
        success: false,
        errors: { roomId: "La habitación seleccionada no existe o está inactiva." },
      };
    }

    if (room.status !== "AVAILABLE" && room.status !== "RESERVED") {
      const statusLabels: Record<string, string> = {
        OCCUPIED: "Ocupada",
        CLEANING: "En limpieza",
        MAINTENANCE: "En mantenimiento",
      };
      return {
        success: false,
        errors: {
          roomId: `La habitación ${room.number} está ${statusLabels[room.status] || room.status} y no puede recibir Check-In.`,
        },
      };
    }

    // Verificar que no exista otra estadía ACTIVE en esa habitación
    const activeStayInRoom = await prisma.stay.findFirst({
      where: { roomId: room.id, status: "ACTIVE" },
      select: { code: true },
    });
    if (activeStayInRoom) {
      return {
        success: false,
        errors: {
          roomId: `La habitación ${room.number} ya tiene la estadía activa ${activeStayInRoom.code}.`,
        },
      };
    }

    if (!primaryGuest) {
      return {
        success: false,
        errors: { primaryGuestId: "El huésped titular no existe o está inactivo." },
      };
    }

    const uniqueAdditionalIds = Array.from(
      new Set(data.additionalGuestIds.filter((id) => id !== primaryGuest.id)),
    );
    if (1 + uniqueAdditionalIds.length > room.roomType.maxGuests) {
      return {
        success: false,
        errors: {
          additionalGuestIds: `La habitación ${room.number} permite máximo ${room.roomType.maxGuests} personas (incluyendo titular).`,
        },
      };
    }

    // Si proviene de una reserva, validar y heredar adelanto
    let linkedBooking: {
      id: number;
      code: string;
      depositPaid: unknown;
      status: string;
    } | null = null;

    if (data.bookingId) {
      linkedBooking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
        select: { id: true, code: true, depositPaid: true, status: true },
      });

      if (!linkedBooking) {
        return { success: false, message: "La reserva seleccionada no existe." };
      }
      if (
        linkedBooking.status !== "PENDING" &&
        linkedBooking.status !== "CONFIRMED"
      ) {
        return {
          success: false,
          message: `La reserva ${linkedBooking.code} no está disponible para Check-In.`,
        };
      }
    }

    const totalRoomCost = roundMoney(data.totalRoomCost);
    const discount = roundMoney(data.discount);
    const securityDeposit = roundMoney(data.securityDeposit);
    const totalAmount = roundMoney(Math.max(0, totalRoomCost - discount));
    const inheritedDeposit = linkedBooking
      ? roundMoney(Number(linkedBooking.depositPaid))
      : 0;
    const initialPayment = roundMoney(data.initialPayment);

    if (inheritedDeposit + initialPayment > totalAmount) {
      const maxAllowed = roundMoney(Math.max(0, totalAmount - inheritedDeposit));
      return {
        success: false,
        errors: {
          initialPayment: `El pago inicial excede el saldo pendiente (máximo S/ ${maxAllowed.toFixed(2)}).`,
        },
      };
    }

    let openShiftId: number | null = null;
    if (initialPayment > 0) {
      const openShift = await prisma.cashShift.findFirst({
        where: { status: "OPEN" },
        select: { id: true },
      });

      if (!openShift) {
        return {
          success: false,
          message:
            "Para registrar un pago al ingreso debes tener un Turno de Caja abierto. Abre caja primero o realiza el Check-In con pago inicial S/ 0.00.",
        };
      }
      openShiftId = openShift.id;
    }

    const created = await prisma.$transaction(async (tx) => {
      const code = await generateStayCode(tx);

      const stay = await tx.stay.create({
        data: {
          code,
          roomId: room.id,
          primaryGuestId: primaryGuest.id,
          bookingId: linkedBooking ? linkedBooking.id : null,
          checkInAt: now,
          expectedCheckOut,
          status: "ACTIVE",
          roomPrice: roundMoney(data.roomPrice),
          totalRoomCost,
          totalExtraCost: 0,
          securityDeposit,
          discount,
          totalAmount,
          paidAmount: roundMoney(inheritedDeposit + initialPayment),
          notes: data.notes,
        },
      });

      if (uniqueAdditionalIds.length > 0) {
        await tx.stayGuest.createMany({
          data: uniqueAdditionalIds.map((guestId) => ({
            stayId: stay.id,
            guestId,
          })),
        });
      }

      // Actualizar estado de la habitación a OCUPADA
      await tx.room.update({
        where: { id: room.id },
        data: { status: "OCCUPIED" },
      });

      // Si viene de reserva, marcar reserva como CHECKED_IN y vincular sus pagos a la estadía
      if (linkedBooking) {
        await tx.booking.update({
          where: { id: linkedBooking.id },
          data: { status: "CHECKED_IN" },
        });
        await tx.payment.updateMany({
          where: { bookingId: linkedBooking.id, stayId: null },
          data: { stayId: stay.id },
        });
      }

      // Si hubo pago inicial en recepción, registrarlo en caja
      let receiptNumber: string | null = null;
      if (initialPayment > 0 && openShiftId) {
        receiptNumber = await issueInternalTicketNumber(tx);
        await tx.payment.create({
          data: {
            stayId: stay.id,
            cashShiftId: openShiftId,
            amount: initialPayment,
            method: data.paymentMethod,
            receiptType: "TICKET",
            receiptNumber,
            reference: data.paymentReference,
            notes: `Pago al Check-In — Estadía ${code}`,
          },
        });
      }

      return { stay, receiptNumber };
    });

    await createAuditLog({
      action: "CHECK_IN",
      entity: "Stay",
      entityId: created.stay.id,
      details: {
        mensaje: `Check-In ${created.stay.code} registrado en Hab. ${room.number} para ${primaryGuest.firstName} ${primaryGuest.lastName}`,
        codigo: created.stay.code,
        habitacion: room.number,
        huesped: `${primaryGuest.firstName} ${primaryGuest.lastName}`,
        reservaOrigen: linkedBooking?.code || "Walk-in directo",
        totalAlojamiento: totalAmount,
        adelantoHeredado: inheritedDeposit,
        pagoInicial: initialPayment,
        garantia: securityDeposit,
        constancia: created.receiptNumber || "Sin pago inicial",
      },
    });

    revalidatePath("/admin/check-in");
    revalidatePath("/admin/check-out");
    revalidatePath("/admin/reservas");
    revalidatePath("/admin/habitaciones");
    revalidatePath("/admin/caja");
    revalidatePath("/admin");

    return {
      success: true,
      message: created.receiptNumber
        ? `Check-In ${created.stay.code} realizado en Hab. ${room.number} (Constancia ${created.receiptNumber}).`
        : `Check-In ${created.stay.code} realizado en Hab. ${room.number}.`,
      data: { id: created.stay.id, code: created.stay.code },
    };
  } catch (error) {
    console.error("Error al registrar Check-In:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al realizar el Check-In.",
    };
  }
}

/**
 * Registra un consumo extra (producto de catálogo con descuento de stock o cargo libre) en una estadía activa.
 */
export async function addStayExtraChargeAction(
  input: AddExtraChargeInput,
): Promise<StayActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["stays:add_extra", "stays:checkin", "stays:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para registrar consumos extras.",
      };
    }

    const parsed = addExtraChargeSchema.safeParse(input);
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
      include: { room: { select: { number: true } } },
    });

    if (!stay) {
      return { success: false, message: "No se encontró la estadía." };
    }

    if (stay.status !== "ACTIVE") {
      return {
        success: false,
        message: "Solo se pueden agregar consumos a estadías activas.",
      };
    }

    if (data.productId) {
      const product = await prisma.product.findFirst({
        where: { id: data.productId, deletedAt: null, isActive: true },
      });

      if (!product) {
        return {
          success: false,
          errors: { productId: "El producto seleccionado no está disponible." },
        };
      }

      if (product.stock < data.quantity) {
        return {
          success: false,
          errors: {
            quantity: `Stock insuficiente para "${product.name}" (disponible: ${product.stock} unid.).`,
          },
        };
      }
    }

    const userId = session?.user?.id ? Number(session.user.id) : null;
    const unitPrice = roundMoney(data.unitPrice);
    const totalPrice = roundMoney(unitPrice * data.quantity);

    await prisma.$transaction(async (tx) => {
      await tx.stayExtraCharge.create({
        data: {
          stayId: stay.id,
          productId: data.productId ?? null,
          concept: data.concept,
          quantity: data.quantity,
          unitPrice,
          totalPrice,
          registeredById: userId && !Number.isNaN(userId) ? userId : null,
        },
      });

      if (data.productId) {
        await tx.product.update({
          where: { id: data.productId },
          data: { stock: { decrement: data.quantity } },
        });
      }

      const newExtraCost = roundMoney(Number(stay.totalExtraCost) + totalPrice);
      const newTotalAmount = roundMoney(
        Math.max(0, Number(stay.totalRoomCost) + newExtraCost - Number(stay.discount)),
      );

      await tx.stay.update({
        where: { id: stay.id },
        data: {
          totalExtraCost: newExtraCost,
          totalAmount: newTotalAmount,
        },
      });
    });

    await createAuditLog({
      action: "EXTRA_CHARGE_ADDED",
      entity: "Stay",
      entityId: stay.id,
      details: {
        mensaje: `Consumo "${data.concept}" (×${data.quantity} — S/ ${totalPrice.toFixed(2)}) cargado a estadía ${stay.code} (Hab. ${stay.room.number})`,
        estadiaCodigo: stay.code,
        habitacion: stay.room.number,
        concepto: data.concept,
        cantidad: data.quantity,
        precioUnitario: unitPrice,
        subtotal: totalPrice,
        productoId: data.productId ?? null,
      },
    });

    revalidatePath("/admin/check-in");
    revalidatePath("/admin/check-out");
    revalidatePath("/admin/productos");

    return {
      success: true,
      message: `Consumo "${data.concept}" (S/ ${totalPrice.toFixed(2)}) cargado a la cuenta.`,
    };
  } catch (error) {
    console.error("Error al registrar consumo extra:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al registrar el consumo.",
    };
  }
}

/**
 * Registra un pago/abono parcial o total a cuenta de una estadía activa.
 */
export async function registerStayPaymentAction(
  input: RegisterStayPaymentInput,
): Promise<StayActionResult> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["stays:checkin", "stays:checkout", "stays:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para registrar pagos en estadías.",
      };
    }

    const parsed = registerStayPaymentSchema.safeParse(input);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !errors[field]) errors[field] = issue.message;
      });
      return { success: false, errors };
    }

    const data = parsed.data;
    const amount = roundMoney(data.amount);

    const [stay, openShift] = await Promise.all([
      prisma.stay.findUnique({ where: { id: data.stayId } }),
      prisma.cashShift.findFirst({
        where: { status: "OPEN" },
        select: { id: true },
      }),
    ]);

    if (!stay) {
      return { success: false, message: "No se encontró la estadía." };
    }

    if (stay.status !== "ACTIVE") {
      return {
        success: false,
        message: "Solo se pueden registrar abonos en estadías activas.",
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
      Number(stay.totalAmount) - Number(stay.paidAmount),
    );
    if (amount > pendingBalance) {
      return {
        success: false,
        errors: {
          amount: `El monto supera el saldo pendiente de la estadía (S/ ${pendingBalance.toFixed(2)}).`,
        },
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      const receiptNumber = await issueInternalTicketNumber(tx);
      const newPaidAmount = roundMoney(Number(stay.paidAmount) + amount);

      await tx.payment.create({
        data: {
          stayId: stay.id,
          cashShiftId: openShift.id,
          amount,
          method: data.method,
          receiptType: "TICKET",
          receiptNumber,
          reference: data.reference,
          notes: data.notes || `Abono a cuenta — Estadía ${stay.code}`,
        },
      });

      await tx.stay.update({
        where: { id: stay.id },
        data: { paidAmount: newPaidAmount },
      });

      return { receiptNumber, newPaidAmount };
    });

    await createAuditLog({
      action: "STAY_PAYMENT_REGISTERED",
      entity: "Stay",
      entityId: stay.id,
      details: {
        mensaje: `Abono de S/ ${amount.toFixed(2)} (${data.method}) registrado en estadía ${stay.code} — Constancia ${result.receiptNumber}`,
        codigo: stay.code,
        monto: amount,
        metodo: data.method,
        constancia: result.receiptNumber,
        turnoCajaId: openShift.id,
        pagadoAcumulado: result.newPaidAmount,
      },
    });

    revalidatePath("/admin/check-in");
    revalidatePath("/admin/check-out");
    revalidatePath("/admin/caja");

    return {
      success: true,
      message: `Abono de S/ ${amount.toFixed(2)} registrado (Constancia ${result.receiptNumber}).`,
    };
  } catch (error) {
    console.error("Error al registrar abono en estadía:", error);
    return {
      success: false,
      message: "Ocurrió un error inesperado al registrar el abono.",
    };
  }
}

/**
 * Obtiene el estado de cuenta completo de una estadía (acompañantes, consumos y pagos).
 */
export async function getStayDetailAction(
  stayId: number,
): Promise<StayActionResult<SerializedStay>> {
  try {
    const session = await auth();
    const permissions = session?.user?.permissions ?? [];

    if (
      !hasPermission(
        permissions,
        ["stays:read", "stays:checkin", "stays:checkout", "stays:manage"],
        session?.user?.role,
      )
    ) {
      return {
        success: false,
        message: "No tienes permiso para ver el detalle de estadías.",
      };
    }

    const stay = await prisma.stay.findUnique({
      where: { id: stayId },
      include: {
        room: { include: { roomType: true, floor: true } },
        primaryGuest: true,
        booking: { select: { code: true } },
        additionalGuests: {
          include: { guest: true },
        },
        extraCharges: {
          orderBy: { createdAt: "desc" },
          include: {
            product: { select: { name: true } },
            registeredBy: { select: { name: true } },
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!stay) {
      return { success: false, message: "Estadía no encontrada." };
    }

    const totalAmount = Number(stay.totalAmount);
    const paidAmount = Number(stay.paidAmount);
    const duration = computeStayDuration(stay.checkInAt, stay.expectedCheckOut);

    const additionalGuests: SerializedStayAdditionalGuest[] =
      stay.additionalGuests.map((ag) => ({
        id: ag.guest.id,
        fullName: `${ag.guest.firstName} ${ag.guest.lastName}`,
        documentType: ag.guest.documentType,
        documentNumber: ag.guest.documentNumber,
      }));

    const extraCharges: SerializedStayExtraCharge[] = stay.extraCharges.map(
      (ec) => ({
        id: ec.id,
        productId: ec.productId,
        productName: ec.product?.name ?? null,
        concept: ec.concept,
        quantity: ec.quantity,
        unitPrice: Number(ec.unitPrice),
        totalPrice: Number(ec.totalPrice),
        registeredByName: ec.registeredBy?.name ?? null,
        createdAt: ec.createdAt.toISOString(),
      }),
    );

    const payments: SerializedStayPayment[] = stay.payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      receiptType: p.receiptType,
      receiptNumber: p.receiptNumber,
      reference: p.reference,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
    }));

    const serialized: SerializedStay = {
      id: stay.id,
      code: stay.code,
      roomId: stay.roomId,
      roomNumber: stay.room.number,
      floorName: stay.room.floor.name,
      roomTypeName: stay.room.roomType.name,
      primaryGuestId: stay.primaryGuestId,
      primaryGuestName: `${stay.primaryGuest.firstName} ${stay.primaryGuest.lastName}`,
      primaryGuestDocumentType: stay.primaryGuest.documentType,
      primaryGuestDocumentNumber: stay.primaryGuest.documentNumber,
      primaryGuestPhone: stay.primaryGuest.phone,
      bookingId: stay.bookingId,
      bookingCode: stay.booking?.code ?? null,
      checkInAt: stay.checkInAt.toISOString(),
      expectedCheckOut: stay.expectedCheckOut.toISOString(),
      actualCheckOut: stay.actualCheckOut
        ? stay.actualCheckOut.toISOString()
        : null,
      status: stay.status,
      roomPrice: Number(stay.roomPrice),
      totalRoomCost: Number(stay.totalRoomCost),
      totalExtraCost: Number(stay.totalExtraCost),
      securityDeposit: Number(stay.securityDeposit),
      discount: Number(stay.discount),
      totalAmount,
      paidAmount,
      pendingBalance: roundMoney(Math.max(0, totalAmount - paidAmount)),
      notes: stay.notes,
      additionalGuestsCount: additionalGuests.length,
      extraChargesCount: extraCharges.length,
      nights: duration.nights,
      isHourly: duration.isHourly,
      durationHours: duration.durationHours,
      createdAt: stay.createdAt.toISOString(),
      additionalGuests,
      extraCharges,
      payments,
    };

    return { success: true, data: serialized };
  } catch (error) {
    console.error("Error al obtener detalle de estadía:", error);
    return {
      success: false,
      message: "No se pudo cargar el estado de cuenta de la estadía.",
    };
  }
}
