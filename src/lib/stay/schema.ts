import { z } from "zod";

const stayModeEnum = z.enum(["NIGHTLY", "HOURLY"]);
const paymentMethodEnum = z.enum(["CASH", "CARD", "TRANSFER", "YAPE", "PLIN"]);

const optionalText = (maxLen: number, label: string) =>
  z
    .string()
    .trim()
    .max(maxLen, `${label} no puede exceder los ${maxLen} caracteres.`)
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null));

export const createStaySchema = z
  .object({
    bookingId: z.number().int().positive().optional().nullable(),
    stayMode: stayModeEnum.default("NIGHTLY"),
    roomId: z
      .number({ message: "Selecciona una habitación." })
      .int("Habitación inválida.")
      .positive("Selecciona una habitación disponible."),
    primaryGuestId: z
      .number({ message: "Selecciona el huésped titular." })
      .int("Huésped inválido.")
      .positive("Selecciona un huésped válido."),
    additionalGuestIds: z.array(z.number().int().positive()).default([]),
    expectedCheckOut: z
      .string({ message: "Indica la fecha/hora estimada de salida." })
      .min(1, "Indica la fecha/hora estimada de salida."),
    roomPrice: z
      .number({ message: "Ingresa la tarifa pactada." })
      .finite("Tarifa inválida.")
      .positive("La tarifa debe ser mayor a 0."),
    totalRoomCost: z
      .number({ message: "Ingresa el costo de alojamiento." })
      .finite("Costo inválido.")
      .positive("El costo de alojamiento debe ser mayor a 0.")
      .max(999999.99, "El monto excede el límite permitido."),
    securityDeposit: z
      .number({ message: "Ingresa una garantía válida." })
      .finite("Garantía inválida.")
      .min(0, "La garantía no puede ser negativa.")
      .default(0),
    discount: z
      .number({ message: "Ingresa un descuento válido." })
      .finite("Descuento inválido.")
      .min(0, "El descuento no puede ser negativo.")
      .default(0),
    initialPayment: z
      .number({ message: "Ingresa un pago inicial válido." })
      .finite("Monto inválido.")
      .min(0, "El pago inicial no puede ser negativo.")
      .default(0),
    paymentMethod: paymentMethodEnum.default("CASH"),
    paymentReference: optionalText(100, "La referencia de pago"),
    notes: optionalText(500, "Las notas"),
  })
  .refine((data) => data.discount <= data.totalRoomCost, {
    message: "El descuento no puede superar el costo del alojamiento.",
    path: ["discount"],
  })
  .refine(
    (data) => {
      const expected = new Date(data.expectedCheckOut);
      return !Number.isNaN(expected.getTime());
    },
    {
      message: "La fecha de salida estimada no es válida.",
      path: ["expectedCheckOut"],
    },
  );

export type CreateStayInput = z.input<typeof createStaySchema>;

export const addExtraChargeSchema = z.object({
  stayId: z.number().int().positive("Estadía inválida."),
  productId: z.number().int().positive().optional().nullable(),
  concept: z
    .string({ message: "Ingresa el concepto del consumo." })
    .trim()
    .min(2, "El concepto debe tener al menos 2 caracteres.")
    .max(150, "El concepto no puede exceder los 150 caracteres."),
  quantity: z
    .number({ message: "Ingresa la cantidad." })
    .int("La cantidad debe ser un número entero.")
    .min(1, "La cantidad mínima es 1.")
    .max(100, "La cantidad máxima es 100."),
  unitPrice: z
    .number({ message: "Ingresa el precio unitario." })
    .finite("Precio inválido.")
    .positive("El precio unitario debe ser mayor a 0.")
    .max(99999.99, "El precio excede el límite permitido."),
});

export type AddExtraChargeInput = z.input<typeof addExtraChargeSchema>;

export const registerStayPaymentSchema = z.object({
  stayId: z.number().int().positive("Estadía inválida."),
  amount: z
    .number({ message: "Ingresa un monto válido." })
    .finite("Monto inválido.")
    .positive("El monto debe ser mayor a 0.")
    .max(999999.99, "El monto excede el límite permitido."),
  method: paymentMethodEnum.default("CASH"),
  reference: optionalText(100, "La referencia"),
  notes: optionalText(300, "Las observaciones"),
});

export type RegisterStayPaymentInput = z.input<
  typeof registerStayPaymentSchema
>;
