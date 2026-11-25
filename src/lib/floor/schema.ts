import { z } from "zod";

export const floorSchema = z.object({
  number: z.coerce
    .number({ message: "El nivel del piso es obligatorio." })
    .int({ message: "El nivel del piso debe ser un número entero." })
    .min(-5, "El nivel mínimo permitido es -5 (subsuelos).")
    .max(100, "El nivel máximo permitido es 100."),
  name: z
    .string({ message: "El nombre del piso es obligatorio." })
    .trim()
    .min(2, "El nombre del piso debe tener al menos 2 caracteres.")
    .max(50, "El nombre no puede exceder los 50 caracteres.")
    .regex(
      /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-\.\#\°]+$/,
      "El nombre solo puede contener letras, números, espacios y caracteres básicos (- . # °).",
    ),
});

export type FloorInput = z.infer<typeof floorSchema>;
