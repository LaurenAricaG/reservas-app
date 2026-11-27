import { z } from "zod";

export const documentTypeEnum = z.enum([
  "DNI",
  "PASSPORT",
  "FOREIGNER_CARD",
  "RUC",
  "OTHER",
]);

export const guestSchema = z
  .object({
    documentType: documentTypeEnum,
    documentNumber: z
      .string({ message: "El número de documento es obligatorio." })
      .trim()
      .min(3, "El documento debe tener al menos 3 caracteres.")
      .max(20, "El documento no puede exceder los 20 caracteres."),
    firstName: z
      .string({ message: "Los nombres son obligatorios." })
      .trim()
      .min(2, "Los nombres deben tener al menos 2 caracteres.")
      .max(50, "Los nombres no pueden exceder los 50 caracteres.")
      .regex(
        /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.\-]+$/,
        "Los nombres solo pueden contener letras, espacios, puntos y guiones.",
      ),
    lastName: z
      .string({ message: "Los apellidos son obligatorios." })
      .trim()
      .min(2, "Los apellidos deben tener al menos 2 caracteres.")
      .max(50, "Los apellidos no pueden exceder los 50 caracteres.")
      .regex(
        /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s\.\-]+$/,
        "Los apellidos solo pueden contener letras, espacios, puntos y guiones.",
      ),
    email: z
      .string()
      .trim()
      .email("El formato de correo electrónico no es válido.")
      .optional()
      .or(z.literal(""))
      .nullable()
      .transform((val) => (val?.trim() ? val.trim().toLowerCase() : null)),
    phone: z
      .string()
      .trim()
      .max(20, "El teléfono no puede exceder los 20 caracteres.")
      .regex(
        /^[\d\+\s\-\(\)]*$/,
        "El teléfono solo puede contener números, espacios y los signos +, -, (, ).",
      )
      .optional()
      .or(z.literal(""))
      .nullable()
      .transform((val) => (val?.trim() ? val.trim() : null)),
    nationality: z
      .string()
      .trim()
      .max(50, "La nacionalidad no puede exceder los 50 caracteres.")
      .optional()
      .nullable()
      .transform((val) => (val?.trim() ? val.trim() : "Peruana")),
    originCity: z
      .string()
      .trim()
      .max(50, "La ciudad de procedencia no puede exceder los 50 caracteres.")
      .optional()
      .nullable()
      .transform((val) => (val?.trim() ? val.trim() : null)),
    businessName: z
      .string()
      .trim()
      .max(100, "La razón social no puede exceder los 100 caracteres.")
      .optional()
      .nullable()
      .transform((val) => (val?.trim() ? val.trim() : null)),
    fiscalAddress: z
      .string()
      .trim()
      .max(150, "La dirección fiscal no puede exceder los 150 caracteres.")
      .optional()
      .nullable()
      .transform((val) => (val?.trim() ? val.trim() : null)),
    notes: z
      .string()
      .trim()
      .max(255, "Las notas no pueden exceder los 255 caracteres.")
      .optional()
      .nullable()
      .transform((val) => (val?.trim() ? val.trim() : null)),
  })
  .superRefine((data, ctx) => {
    const cleanDoc = data.documentNumber.trim();

    if (data.documentType === "DNI") {
      if (!/^\d{8}$/.test(cleanDoc)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["documentNumber"],
          message: "El DNI debe contener exactamente 8 dígitos numéricos.",
        });
      }
    } else if (data.documentType === "RUC") {
      if (!/^\d{11}$/.test(cleanDoc)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["documentNumber"],
          message: "El RUC debe contener exactamente 11 dígitos numéricos.",
        });
      }
    }
  });

export type GuestInput = z.infer<typeof guestSchema>;
