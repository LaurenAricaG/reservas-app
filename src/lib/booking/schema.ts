import { z } from "zod";

const bookingOriginEnum = z.enum(["RECEPTION", "WEB"]);
const stayModeEnum = z.enum(["NIGHTLY", "HOURLY"]);
const paymentMethodEnum = z.enum(["CASH", "CARD", "TRANSFER", "YAPE", "PLIN"]);
const receiptTypeEnum = z.enum(["TICKET", "BOLETA", "FACTURA"]);

function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toDateKey(dateStr: string): string | null {
  if (!dateStr) return null;
  const key = dateStr.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const parsed = new Date(`${key}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : key;
}

const optionalText = (maxLen: number, label: string) =>
  z
    .string()
    .trim()
    .max(maxLen, `${label} no puede exceder los ${maxLen} caracteres.`)
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null));

export const createBookingSchema = z
  .object({
    stayMode: stayModeEnum.default("NIGHTLY"),
    roomId: z
      .number({ message: "Selecciona una habitación." })
      .int("Habitación inválida.")
      .positive("Selecciona una habitación válida."),
    guestId: z
      .number({ message: "Selecciona un huésped." })
      .int("Huésped inválido.")
      .positive("Selecciona un huésped válido."),
    checkInDate: z
      .string({ message: "Ingresa la fecha de llegada." })
      .min(1, "Ingresa la fecha de llegada."),
    checkOutDate: z
      .string({ message: "Ingresa la fecha de salida." })
      .min(1, "Ingresa la fecha de salida."),
    numberOfGuests: z
      .number({ message: "Indica el número de huéspedes." })
      .int("Debe ser un número entero.")
      .min(1, "Debe haber al menos 1 huésped.")
      .max(20, "Número máximo de huéspedes excedido."),
    origin: bookingOriginEnum.default("RECEPTION"),
    totalPrice: z
      .number({ message: "Ingresa el monto total de la reserva." })
      .finite("Monto inválido.")
      .positive("El monto total debe ser mayor a 0.")
      .max(999999.99, "El monto excede el límite permitido."),
    initialDeposit: z
      .number({ message: "Ingresa un adelanto válido." })
      .finite("Adelanto inválido.")
      .min(0, "El adelanto no puede ser negativo.")
      .default(0),
    paymentMethod: paymentMethodEnum.default("CASH"),
    receiptType: receiptTypeEnum.default("TICKET"),
    paymentReference: optionalText(100, "La referencia de pago"),
    clientNotes: optionalText(500, "Las peticiones del cliente"),
    receptionNotes: optionalText(500, "Las notas internas"),
  })
  .refine(
    (data) => {
      const checkInKey = toDateKey(data.checkInDate);
      return checkInKey !== null && checkInKey >= getTodayKey();
    },
    {
      message: "La fecha de llegada debe ser hoy o una fecha posterior.",
      path: ["checkInDate"],
    },
  )
  .refine(
    (data) => {
      if (data.stayMode === "HOURLY") {
        const s = new Date(data.checkInDate);
        const e = new Date(data.checkOutDate);
        return !Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e > s;
      }
      const checkInKey = toDateKey(data.checkInDate);
      const checkOutKey = toDateKey(data.checkOutDate);
      return (
        checkInKey !== null &&
        checkOutKey !== null &&
        checkOutKey >= checkInKey
      );
    },
    {
      message:
        "La fecha/hora de salida debe ser igual o posterior a la llegada.",
      path: ["checkOutDate"],
    },
  )
  .refine((data) => data.initialDeposit <= data.totalPrice, {
    message: "El adelanto no puede superar el monto total de la reserva.",
    path: ["initialDeposit"],
  });

export type CreateBookingInput = z.input<typeof createBookingSchema>;

export const updateBookingSchema = z
  .object({
    id: z.number().int().positive(),
    stayMode: stayModeEnum.default("NIGHTLY"),
    roomId: z
      .number({ message: "Selecciona una habitación." })
      .int()
      .positive("Selecciona una habitación válida."),
    guestId: z
      .number({ message: "Selecciona un huésped." })
      .int()
      .positive("Selecciona un huésped válido."),
    checkInDate: z
      .string({ message: "Ingresa la fecha de llegada." })
      .min(1, "Ingresa la fecha de llegada."),
    checkOutDate: z
      .string({ message: "Ingresa la fecha de salida." })
      .min(1, "Ingresa la fecha de salida."),
    numberOfGuests: z
      .number({ message: "Indica el número de huéspedes." })
      .int()
      .min(1, "Debe haber al menos 1 huésped.")
      .max(20, "Número máximo de huéspedes excedido."),
    totalPrice: z
      .number({ message: "Ingresa el monto total de la reserva." })
      .finite("Monto inválido.")
      .positive("El monto total debe ser mayor a 0.")
      .max(999999.99, "El monto excede el límite permitido."),
    clientNotes: optionalText(500, "Las peticiones del cliente"),
    receptionNotes: optionalText(500, "Las notas internas"),
  })
  .refine(
    (data) => {
      if (data.stayMode === "HOURLY") {
        const s = new Date(data.checkInDate);
        const e = new Date(data.checkOutDate);
        return !Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e > s;
      }
      const checkInKey = toDateKey(data.checkInDate);
      const checkOutKey = toDateKey(data.checkOutDate);
      return (
        checkInKey !== null &&
        checkOutKey !== null &&
        checkOutKey >= checkInKey
      );
    },
    {
      message:
        "La fecha/hora de salida debe ser igual o posterior a la llegada.",
      path: ["checkOutDate"],
    },
  );

export type UpdateBookingInput = z.input<typeof updateBookingSchema>;

export const registerBookingDepositSchema = z.object({
  bookingId: z.number().int().positive("Reserva inválida."),
  amount: z
    .number({ message: "Ingresa un monto válido." })
    .finite("Monto inválido.")
    .positive("El monto del adelanto debe ser mayor a 0.")
    .max(999999.99, "El monto excede el límite permitido."),
  method: paymentMethodEnum.default("CASH"),
  receiptType: receiptTypeEnum.default("TICKET"),
  reference: optionalText(100, "La referencia"),
  notes: optionalText(300, "Las observaciones"),
});

export type RegisterBookingDepositInput = z.input<
  typeof registerBookingDepositSchema
>;

export const updateBookingStatusSchema = z.object({
  bookingId: z.number().int().positive("Reserva inválida."),
  status: z.enum(["CONFIRMED", "CANCELLED", "NO_SHOW"]),
  reason: optionalText(300, "El motivo"),
});

export type UpdateBookingStatusInput = z.input<
  typeof updateBookingStatusSchema
>;

export const cancelBookingSchema = z.object({
  bookingId: z.number().int().positive("Reserva inválida."),
  outcome: z.enum(["CANCELLED", "NO_SHOW"]),
  refundAmount: z
    .number({ message: "Ingresa un monto válido." })
    .finite("Monto inválido.")
    .min(0, "El monto de devolución no puede ser negativo.")
    .default(0),
  refundMethod: paymentMethodEnum.default("CASH"),
  refundReference: optionalText(100, "La referencia de devolución"),
  reason: z
    .string({ message: "Indica el motivo." })
    .trim()
    .min(3, "Ingresa un motivo de al menos 3 caracteres.")
    .max(300, "El motivo no puede exceder los 300 caracteres."),
});

export type CancelBookingInput = z.input<typeof cancelBookingSchema>;
