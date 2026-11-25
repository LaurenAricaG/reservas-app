import { z } from "zod";

export const roomStatusEnum = z.enum(
  ["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING", "MAINTENANCE"],
  {
    message: "Estado de habitación inválido.",
  },
);

export const roomSchema = z.object({
  number: z
    .string({ message: "El número de habitación es obligatorio." })
    .trim()
    .min(1, "El número de habitación es obligatorio.")
    .max(10, "El número de habitación no puede exceder los 10 caracteres.")
    .regex(
      /^[a-zA-Z0-9\-\_]+$/,
      "El número solo puede contener letras, números, guiones y guiones bajos (ej: 101, VIP-01).",
    ),
  floorId: z.coerce
    .number({ message: "Selecciona el piso de la habitación." })
    .int("El identificador de piso debe ser un entero.")
    .positive("Selecciona un piso válido."),
  roomTypeId: z.coerce
    .number({ message: "Selecciona el tipo de habitación." })
    .int("El identificador del tipo debe ser un entero.")
    .positive("Selecciona un tipo de habitación válido."),
  status: roomStatusEnum.default("AVAILABLE"),
  notes: z
    .string()
    .max(300, "Las notas técnicas no pueden exceder los 300 caracteres.")
    .optional()
    .nullable()
    .transform((val) => (val?.trim() ? val.trim() : null)),
});

export type RoomInput = z.infer<typeof roomSchema>;

