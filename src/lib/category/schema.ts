import { z } from "zod";

export const categorySchema = z.object({
  name: z
    .string({ message: "El nombre de la categoría es obligatorio." })
    .trim()
    .min(2, "El nombre de la categoría debe tener al menos 2 caracteres.")
    .max(30, "El nombre de la categoría no puede exceder los 30 caracteres.")
    .regex(
      /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-\.\/]+$/,
      "El nombre solo puede contener letras, números, espacios, guiones, puntos y barras diagonales.",
    ),
  description: z
    .string()
    .max(150, "La descripción no puede exceder los 150 caracteres.")
    .optional()
    .nullable()
    .transform((val) => (val?.trim() ? val.trim() : null)),
});

export type CategoryInput = z.infer<typeof categorySchema>;
