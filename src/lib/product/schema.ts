import { z } from "zod";

export const productSchema = z.object({
  name: z
    .string({ message: "El nombre del producto es obligatorio." })
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(100, "El nombre no puede exceder los 100 caracteres.")
    .regex(
      /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-\.\,\(\)\/]+$/,
      "El nombre solo puede contener letras, números, espacios y caracteres básicos (- . , ( ) /).",
    ),
  description: z
    .string()
    .max(255, "La descripción no puede exceder los 255 caracteres.")
    .optional()
    .nullable()
    .transform((val) => (val?.trim() ? val.trim() : null)),
  categoryId: z.coerce
    .number({ message: "Debe seleccionar una categoría válida." })
    .int("La categoría debe ser un ID válido.")
    .positive("Debe seleccionar una categoría válida."),
  price: z.coerce
    .number({ message: "El precio es obligatorio." })
    .min(0, "El precio no puede ser negativo.")
    .max(99999.99, "El precio máximo permitido es S/ 99,999.99"),
  stock: z.coerce
    .number({ message: "El stock es obligatorio." })
    .int("El stock debe ser un número entero.")
    .min(0, "El stock no puede ser negativo.")
    .default(0),
});

export type ProductInput = z.infer<typeof productSchema>;
