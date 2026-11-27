import { z } from "zod";

export const openCashShiftSchema = z.object({
  initialCash: z
    .number({ message: "Ingresa un monto numérico válido." })
    .finite("El monto inicial debe ser un número válido.")
    .min(0, "El saldo inicial no puede ser negativo.")
    .max(999999.99, "El saldo inicial excede el límite permitido."),
  notes: z
    .string()
    .trim()
    .max(500, "Las notas no pueden exceder los 500 caracteres.")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export type OpenCashShiftInput = z.input<typeof openCashShiftSchema>;

export const closeCashShiftSchema = z.object({
  shiftId: z
    .number({ message: "Turno de caja inválido." })
    .int("El identificador del turno debe ser un número entero.")
    .positive("El identificador del turno debe ser positivo."),
  actualCash: z
    .number({ message: "Ingresa el efectivo contado físicamente." })
    .finite("El monto contado debe ser un número válido.")
    .min(0, "El efectivo contado no puede ser negativo.")
    .max(999999.99, "El monto excede el límite permitido."),
  notes: z
    .string()
    .trim()
    .max(500, "Las observaciones no pueden exceder los 500 caracteres.")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export type CloseCashShiftInput = z.input<typeof closeCashShiftSchema>;
