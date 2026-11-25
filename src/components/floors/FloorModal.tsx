"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FiLayers, FiAlertCircle, FiCheck } from "react-icons/fi";
import { Modal, Input, Label, Button } from "@/components/ui";
import { SerializedFloor } from "@/types/floors";
import { floorSchema } from "@/lib/floor/schema";
import { createFloorAction, updateFloorAction } from "@/lib/floor/actions";

interface FloorModalProps {
  isOpen: boolean;
  onClose: () => void;
  floor?: SerializedFloor | null;
  onSuccess: () => void;
}

export default function FloorModal({
  isOpen,
  onClose,
  floor,
  onSuccess,
}: FloorModalProps) {
  const isEditing = Boolean(floor);

  const [number, setNumber] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Reiniciar formulario cada vez que abre o cambia el piso a editar
  useEffect(() => {
    if (isOpen) {
      if (floor) {
        setNumber(String(floor.number));
        setName(floor.name);
      } else {
        setNumber("");
        setName("");
      }
      setErrors({});
      setServerError(null);
    }
  }, [isOpen, floor]);

  const validate = () => {
    const parsed = floorSchema.safeParse({
      number: number === "" ? undefined : Number(number),
      name,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setLoading(true);

    try {
      const payload = {
        number: Number(number),
        name: name.trim(),
      };

      if (isEditing && floor) {
        const res = await updateFloorAction(floor.id, payload);
        if (res.success) {
          toast.success(res.message);
          onSuccess();
          onClose();
        } else {
          if (res.errors) {
            setErrors(res.errors);
          }
          if (res.message) {
            setServerError(res.message);
            toast.error(res.message);
          }
        }
      } else {
        const res = await createFloorAction(payload);
        if (res.success) {
          toast.success(res.message);
          onSuccess();
          onClose();
        } else {
          if (res.errors) {
            setErrors(res.errors);
          }
          if (res.message) {
            setServerError(res.message);
            toast.error(res.message);
          }
        }
      }
    } catch (error) {
      console.error("Error al guardar piso:", error);
      toast.error("Ocurrió un error inesperado al procesar el piso.");
      setServerError("Ocurrió un error inesperado al comunicarse con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={isEditing ? `Editar Piso: ${floor?.name}` : "Nuevo Piso"}
      subtitle={
        isEditing
          ? "Actualiza el número de nivel o la denominación de este piso."
          : "Registra un nuevo nivel o piso para organizar las habitaciones del hotel."
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {serverError && (
          <div className="p-3 bg-danger-bg border border-danger-border rounded-xl flex items-start gap-2.5 text-xs text-danger-text">
            <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Campo: Nivel / Número */}
        <div>
          <Label htmlFor="floor-number" required>
            Nivel / Número de Piso
          </Label>
          <Input
            id="floor-number"
            type="number"
            step="1"
            placeholder="Ej: 1, 2, 3... (o 0 para PB, -1 para sótano)"
            value={number}
            onChange={(e) => {
              setNumber(e.target.value);
              if (errors.number) {
                setErrors((prev) => {
                  const u = { ...prev };
                  delete u.number;
                  return u;
                });
              }
            }}
            error={errors.number}
            disabled={loading}
          />
          <p className="text-[11px] text-text-tertiary mt-1">
            Valor numérico correlativo que identifica la planta en el edificio.
          </p>
        </div>

        {/* Campo: Nombre / Denominación */}
        <div>
          <Label htmlFor="floor-name" required>
            Nombre o Denominación
          </Label>
          <Input
            id="floor-name"
            placeholder="Ej: Piso 1, Planta Baja, Piso Ejecutivo, Terraza"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) {
                setErrors((prev) => {
                  const u = { ...prev };
                  delete u.name;
                  return u;
                });
              }
            }}
            error={errors.name}
            disabled={loading}
          />
          <p className="text-[11px] text-text-tertiary mt-1">
            Etiqueta visible para el personal en el Rack de habitaciones y filtros.
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-default/80">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="shadow-2xs font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <FiCheck className="w-4 h-4" />
                {isEditing ? "Guardar Cambios" : "Crear Piso"}
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
