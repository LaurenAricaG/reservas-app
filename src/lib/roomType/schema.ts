import { z } from "zod";

export const roomTypeSchema = z.object({
  name: z
    .string({ message: "El nombre del tipo de habitación es obligatorio." })
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(50, "El nombre no puede exceder los 50 caracteres.")
    .regex(
      /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-\.\/]+$/,
      "El nombre solo puede contener letras, números, espacios, guiones y barras.",
    ),
  description: z
    .string()
    .max(300, "La descripción no puede exceder los 300 caracteres.")
    .optional()
    .nullable()
    .transform((val) => (val?.trim() ? val.trim() : null)),
  basePrice: z.coerce
    .number({ message: "El precio por noche es obligatorio." })
    .positive("El precio por noche debe ser un valor positivo mayor a 0.")
    .max(99999.99, "El precio por noche no puede exceder 99,999.99"),
  hourlyPrice: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : val),
    z.coerce
      .number({ message: "El precio por horas debe ser un número válido." })
      .positive("El precio por horas debe ser mayor a 0.")
      .max(99999.99, "El precio por horas no puede exceder 99,999.99")
      .nullable()
      .optional(),
  ),
  maxGuests: z.coerce
    .number({ message: "El aforo de personas es obligatorio." })
    .int("El aforo debe ser un número entero.")
    .min(1, "El aforo mínimo es de 1 persona.")
    .max(20, "El aforo máximo no puede exceder 20 personas.")
    .default(2),
  amenities: z
    .array(z.string().trim().min(1, "La comodidad no puede estar vacía."))
    .default([]),
  images: z.array(z.string()).default([]),
});

export type RoomTypeInput = z.infer<typeof roomTypeSchema>;

