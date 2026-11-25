"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FiCheck, FiAlertCircle } from "react-icons/fi";
import {
  Modal,
  Input,
  Label,
  Button,
  Select,
  Textarea,
  type SelectOption,
} from "@/components/ui";
import { SerializedProduct, SerializedCategoryOption } from "@/types/products";
import { productSchema } from "@/lib/product/schema";
import {
  createProductAction,
  updateProductAction,
} from "@/lib/product/actions";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: SerializedProduct | null;
  categories: SerializedCategoryOption[];
  onSuccess: () => void;
}

export default function ProductModal({
  isOpen,
  onClose,
  product,
  categories,
  onSuccess,
}: ProductModalProps) {
  const isEditing = Boolean(product);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [stock, setStock] = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Opciones de categoría para el componente Select
  const categoryOptions: SelectOption[] = categories.map((cat) => ({
    value: String(cat.id),
    label: cat.name,
  }));

  // Sincronizar estado cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (product) {
        setName(product.name);
        setDescription(product.description || "");
        setCategoryId(String(product.categoryId));
        setPrice(String(product.price));
        setStock(String(product.stock));
      } else {
        setName("");
        setDescription("");
        setCategoryId(categories.length > 0 ? String(categories[0].id) : "");
        setPrice("");
        setStock("0");
      }
      setErrors({});
      setServerError(null);
    }
  }, [isOpen, product, categories]);

  const validate = () => {
    const parsed = productSchema.safeParse({
      name,
      description: description || null,
      categoryId: categoryId === "" ? undefined : Number(categoryId),
      price: price === "" ? undefined : Number(price),
      stock: stock === "" ? 0 : Number(stock),
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
        name: name.trim(),
        description: description.trim() || null,
        categoryId: Number(categoryId),
        price: Number(price),
        stock: Number(stock),
      };

      if (isEditing && product) {
        const res = await updateProductAction(product.id, payload);
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
        const res = await createProductAction(payload);
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
      console.error("Error al guardar producto:", error);
      toast.error("Ocurrió un error inesperado al procesar el producto.");
      setServerError("Ocurrió un error inesperado al comunicarse con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={isEditing ? `Editar Producto: ${product?.name}` : "Nuevo Producto"}
      subtitle={
        isEditing
          ? "Modifica los datos, categoría, precio o stock del producto."
          : "Registra un nuevo artículo o servicio para el catálogo de consumos del hotel."
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

        {/* Fila 1: Nombre del Producto */}
        <div>
          <Label htmlFor="product-name" required>
            Nombre del Producto
          </Label>
          <Input
            id="product-name"
            placeholder="Ej: Cerveza Corona 330ml, Agua San Mateo 600ml, Pringles..."
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
        </div>

        {/* Fila 2: Categoría */}
        <div>
          <Label htmlFor="product-category" required>
            Categoría
          </Label>
          {categories.length === 0 ? (
            <p className="text-xs text-danger-text py-2">
              No hay categorías activas registradas. Registre una categoría primero.
            </p>
          ) : (
            <Select
              options={categoryOptions}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                if (errors.categoryId) {
                  setErrors((prev) => {
                    const u = { ...prev };
                    delete u.categoryId;
                    return u;
                  });
                }
              }}
              error={errors.categoryId}
              disabled={loading}
            />
          )}
        </div>

        {/* Fila 3: Precio y Stock */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="product-price" required>
              Precio de Venta (S/.)
            </Label>
            <Input
              id="product-price"
              type="number"
              step="0.10"
              min="0"
              placeholder="Ej: 12.00"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                if (errors.price) {
                  setErrors((prev) => {
                    const u = { ...prev };
                    delete u.price;
                    return u;
                  });
                }
              }}
              error={errors.price}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="product-stock" required>
              Stock Disponible
            </Label>
            <Input
              id="product-stock"
              type="number"
              step="1"
              min="0"
              placeholder="Ej: 24"
              value={stock}
              onChange={(e) => {
                setStock(e.target.value);
                if (errors.stock) {
                  setErrors((prev) => {
                    const u = { ...prev };
                    delete u.stock;
                    return u;
                  });
                }
              }}
              error={errors.stock}
              disabled={loading}
            />
          </div>
        </div>

        {/* Fila 4: Descripción */}
        <div>
          <Label htmlFor="product-description">
            Descripción o Presentación (Opcional)
          </Label>
          <Textarea
            id="product-description"
            rows={2}
            placeholder="Detalles sobre presentación, mililitros, marca o notas del producto..."
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) {
                setErrors((prev) => {
                  const u = { ...prev };
                  delete u.description;
                  return u;
                });
              }
            }}
            error={errors.description}
            disabled={loading}
          />
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
            disabled={loading || categories.length === 0}
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
                {isEditing ? "Actualizar" : "Guardar"}
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
