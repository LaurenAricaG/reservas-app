"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Modal,
  Button,
  Input,
  Label,
  Textarea,
} from "@/components/ui";
import { SerializedCategory } from "@/types/categories";
import {
  categorySchema,
  createCategoryAction,
  updateCategoryAction,
} from "@/lib/category";
import { FiTag, FiFileText } from "react-icons/fi";

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: SerializedCategory | null;
  onSuccess?: () => void;
}

export default function CategoryModal({
  isOpen,
  onClose,
  category,
  onSuccess,
}: CategoryModalProps) {
  const isEditing = Boolean(category);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Cargar datos al abrir el modal (creación vs edición)
  useEffect(() => {
    if (isOpen) {
      if (category) {
        setName(category.name || "");
        setDescription(category.description || "");
      } else {
        setName("");
        setDescription("");
      }
      setErrors({});
    }
  }, [isOpen, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validación en cliente con Zod
    const validationResult = categorySchema.safeParse({
      name,
      description: description || undefined,
    });

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        if (fieldName && !fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const res = isEditing && category
        ? await updateCategoryAction(category.id, {
            name: validationResult.data.name,
            description: validationResult.data.description,
          })
        : await createCategoryAction({
            name: validationResult.data.name,
            description: validationResult.data.description,
          });

      if (!res.success) {
        if (res.errors) {
          setErrors(res.errors);
        } else {
          toast.error(res.message || "Error al procesar la categoría.");
        }
        return;
      }

      toast.success(res.message);
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error en formulario de categoría:", err);
      toast.error("Ocurrió un error inesperado de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Categoría" : "Nueva Categoría"}
      subtitle={
        isEditing
          ? `Modifica los datos de la categoría "${category?.name}" (ID: #${category?.id})`
          : "Registra una nueva categoría para la clasificación de productos y consumos."
      }
      size="md"
      footer={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            loading={loading}
            disabled={loading}
          >
            {isEditing ? "Guardar Cambios" : "Crear Categoría"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campo: Nombre */}
        <div>
          <Label required htmlFor="category-modal-name">
            Nombre de la Categoría
          </Label>
          <Input
            id="category-modal-name"
            placeholder="Ej: Bebidas, Snacks, Licores, Servicios..."
            icon={<FiTag className="w-4 h-4" />}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) {
                setErrors((prev) => {
                  const updated = { ...prev };
                  delete updated.name;
                  return updated;
                });
              }
            }}
            error={errors.name}
            autoFocus
            disabled={loading}
          />
        </div>

        {/* Campo: Descripción */}
        <div>
          <Label htmlFor="category-modal-description">
            Descripción (Opcional)
          </Label>
          <Textarea
            id="category-modal-description"
            placeholder="Breve detalle sobre los productos agrupados en esta categoría..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) {
                setErrors((prev) => {
                  const updated = { ...prev };
                  delete updated.description;
                  return updated;
                });
              }
            }}
            error={errors.description}
            rows={3}
            disabled={loading}
          />
        </div>
      </form>
    </Modal>
  );
}
