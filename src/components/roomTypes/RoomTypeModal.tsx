"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Modal,
  Button,
  Input,
  Label,
  Textarea,
  Badge,
} from "@/components/ui";
import { SerializedRoomType } from "@/types/roomTypes";
import {
  roomTypeSchema,
  createRoomTypeAction,
  updateRoomTypeAction,
} from "@/lib/roomType";
import {
  FiTag,
  FiDollarSign,
  FiUsers,
  FiPlus,
  FiX,
  FiClock,
  FiCheck,
} from "react-icons/fi";

interface RoomTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomType?: SerializedRoomType | null;
  onSuccess?: () => void;
}

// Comodidades predefinidas comunes en hoteles
const POPULAR_AMENITIES = [
  "Wifi Alta Velocidad",
  "Smart TV 55'",
  "Jacuzzi",
  "Frigobar",
  "Aire Acondicionado",
  "Baño Privado",
  "Agua Caliente",
  "Cama King Size",
  "Cama Queen",
  "Escritorio de Trabajo",
  "Balcón con Vista",
  "Room Service 24h",
];

export default function RoomTypeModal({
  isOpen,
  onClose,
  roomType,
  onSuccess,
}: RoomTypeModalProps) {
  const isEditing = Boolean(roomType);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [hourlyPrice, setHourlyPrice] = useState("");
  const [maxGuests, setMaxGuests] = useState("2");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Inicializar estado cuando se abre o cambia el modal
  useEffect(() => {
    if (isOpen) {
      if (roomType) {
        setName(roomType.name || "");
        setDescription(roomType.description || "");
        setBasePrice(String(roomType.basePrice ?? ""));
        setHourlyPrice(roomType.hourlyPrice ? String(roomType.hourlyPrice) : "");
        setMaxGuests(String(roomType.maxGuests ?? 2));
        setAmenities(Array.isArray(roomType.amenities) ? roomType.amenities : []);
      } else {
        setName("");
        setDescription("");
        setBasePrice("");
        setHourlyPrice("");
        setMaxGuests("2");
        setAmenities(["Wifi Alta Velocidad", "Smart TV 55'", "Baño Privado"]);
      }
      setCustomAmenity("");
      setErrors({});
    }
  }, [isOpen, roomType]);

  const toggleAmenity = (amenity: string) => {
    setAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity],
    );
  };

  const handleAddCustomAmenity = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customAmenity.trim();
    if (!trimmed) return;

    if (!amenities.includes(trimmed)) {
      setAmenities((prev) => [...prev, trimmed]);
    }
    setCustomAmenity("");
  };

  const handleRemoveAmenity = (amenityToRemove: string) => {
    setAmenities((prev) => prev.filter((a) => a !== amenityToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validación en cliente con Zod
    const validationResult = roomTypeSchema.safeParse({
      name,
      description: description || undefined,
      basePrice,
      hourlyPrice: hourlyPrice || undefined,
      maxGuests,
      amenities,
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
      const res = isEditing && roomType
        ? await updateRoomTypeAction(roomType.id, validationResult.data)
        : await createRoomTypeAction(validationResult.data);

      if (!res.success) {
        if (res.errors) {
          setErrors(res.errors);
        } else {
          toast.error(res.message || "Error al procesar el tipo de habitación.");
        }
        return;
      }

      toast.success(res.message);
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error en formulario de tipo de habitación:", err);
      toast.error("Ocurrió un error inesperado al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Tipo de Habitación" : "Nuevo Tipo de Habitación"}
      subtitle={
        isEditing
          ? `Modifica las características y tarifas de "${roomType?.name}" (ID: #${roomType?.id})`
          : "Configura una nueva categoría de habitación con sus precios y comodidades."
      }
      size="lg"
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
            {isEditing ? "Guardar Cambios" : "Crear Tipo de Habitación"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Fila 1: Nombre y Aforo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Label required htmlFor="roomtype-name">
              Nombre del Tipo
            </Label>
            <Input
              id="roomtype-name"
              placeholder="Ej: Matrimonial Clásica, Suite VIP Party..."
              icon={<FiTag className="w-4 h-4" />}
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
              autoFocus
              disabled={loading}
            />
          </div>

          <div>
            <Label required htmlFor="roomtype-maxguests">
              Aforo (Personas)
            </Label>
            <Input
              id="roomtype-maxguests"
              type="number"
              min="1"
              max="20"
              placeholder="2"
              icon={<FiUsers className="w-4 h-4" />}
              value={maxGuests}
              onChange={(e) => {
                setMaxGuests(e.target.value);
                if (errors.maxGuests) {
                  setErrors((prev) => {
                    const u = { ...prev };
                    delete u.maxGuests;
                    return u;
                  });
                }
              }}
              error={errors.maxGuests}
              disabled={loading}
            />
          </div>
        </div>

        {/* Fila 2: Tarifas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label required htmlFor="roomtype-baseprice">
              Tarifa por Noche (S/.)
            </Label>
            <Input
              id="roomtype-baseprice"
              type="number"
              step="0.01"
              min="0"
              placeholder="90.00"
              icon={<FiDollarSign className="w-4 h-4" />}
              value={basePrice}
              onChange={(e) => {
                setBasePrice(e.target.value);
                if (errors.basePrice) {
                  setErrors((prev) => {
                    const u = { ...prev };
                    delete u.basePrice;
                    return u;
                  });
                }
              }}
              error={errors.basePrice}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="roomtype-hourlyprice">
              Tarifa por Horas (S/.) <span className="text-text-tertiary font-normal">(Opcional)</span>
            </Label>
            <Input
              id="roomtype-hourlyprice"
              type="number"
              step="0.01"
              min="0"
              placeholder="45.00"
              icon={<FiClock className="w-4 h-4" />}
              value={hourlyPrice}
              onChange={(e) => {
                setHourlyPrice(e.target.value);
                if (errors.hourlyPrice) {
                  setErrors((prev) => {
                    const u = { ...prev };
                    delete u.hourlyPrice;
                    return u;
                  });
                }
              }}
              error={errors.hourlyPrice}
              disabled={loading}
            />
          </div>
        </div>

        {/* Fila 3: Comodidades / Servicios */}
        <div className="space-y-2">
          <Label htmlFor="roomtype-amenities">
            Comodidades & Servicios de la Habitación
          </Label>
          <p className="text-[11px] text-text-tertiary">
            Selecciona las comodidades incluidas o escribe una personalizada:
          </p>

          {/* Chips seleccionables rápidos */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {POPULAR_AMENITIES.map((item) => {
              const isSelected = amenities.includes(item);
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleAmenity(item)}
                  disabled={loading}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? "bg-brand-50 text-brand-700 border border-brand-300 shadow-2xs font-semibold"
                      : "bg-bg-surface text-text-secondary border border-border-soft hover:bg-bg-card hover:text-text-primary"
                  }`}
                >
                  {isSelected && <FiCheck className="w-3 h-3 text-brand-600" />}
                  <span>{item}</span>
                </button>
              );
            })}
          </div>

          {/* Input para agregar comodidad personalizada */}
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="Escribe otra comodidad (ej: Vista a la piscina)..."
              value={customAmenity}
              onChange={(e) => setCustomAmenity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomAmenity();
                }
              }}
              disabled={loading}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddCustomAmenity}
              disabled={!customAmenity.trim() || loading}
            >
              <FiPlus className="w-4 h-4" />
              <span>Agregar</span>
            </Button>
          </div>

          {/* Lista actual de seleccionadas */}
          {amenities.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border-soft">
              <span className="text-[11px] font-semibold text-text-tertiary mr-1">
                Incluidas ({amenities.length}):
              </span>
              {amenities.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 pl-2 pr-1.5 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200 text-xs"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAmenity(item)}
                    className="p-0.5 hover:text-danger-text rounded transition-colors cursor-pointer"
                    title={`Quitar ${item}`}
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Fila 4: Descripción */}
        <div>
          <Label htmlFor="roomtype-description">
            Descripción (Opcional)
          </Label>
          <Textarea
            id="roomtype-description"
            placeholder="Breve reseña sobre el tipo de habitación para reservas o recepción..."
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
            rows={3}
            disabled={loading}
          />
        </div>
      </form>
    </Modal>
  );
}

