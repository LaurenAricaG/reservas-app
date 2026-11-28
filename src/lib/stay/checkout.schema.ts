import { z } from "zod";

const paymentMethodEnum = z.enum(["CASH", "CARD", "TRANSFER", "YAPE", "PLIN"]);
const receiptTypeEnum = z.enum(["TICKET", "BOLETA", "FACTURA"]);

const optionalText = (maxLen: number, label: string) =>
  z
    .string()
    .trim()
    .max(maxLen, `${label} no puede exceder los ${maxLen} caracteres.`)
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null));

export const completeCheckOutSchema = z.object({
  stayId: z.number().int().positive("Estadía inválida."),
  receiptType: receiptTypeEnum.default("BOLETA"),
  paymentMethod: paymentMethodEnum.default("CASH"),
  paymentReference: optionalText(100, "La referencia de pago"),
  extraDiscount: z
    .number({ message: "Ingresa un descuento válido." })
    .finite("Descuento inválido.")
    .min(0, "El descuento no puede ser negativo.")
    .default(0),
  securityDepositReturned: z.boolean().default(true),
  notes: optionalText(500, "Las observaciones de salida"),
});

export type CompleteCheckOutInput = z.input<typeof completeCheckOutSchema>;

export const extendStaySchema = z.object({
  stayId: z.number().int().positive("Estadía inválida."),
  mode: z.enum(["NIGHTS", "HOURS"]),
  units: z
    .number({ message: "Ingresa una cantidad válida." })
    .int("Debe ser un número entero.")
    .min(1, "La extensión mínima es 1.")
    .max(30, "La extensión máxima es 30."),
  additionalCost: z
    .number({ message: "Ingresa un costo adicional válido." })
    .finite("Monto inválido.")
    .min(0, "El costo adicional no puede ser negativo.")
    .max(999999.99, "El monto excede el límite permitido."),
  notes: optionalText(300, "Las observaciones"),
});

export type ExtendStayInput = z.input<typeof extendStaySchema>;
