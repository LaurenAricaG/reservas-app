"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Modal,
  Button,
  Input,
  Label,
  Select,
  Textarea,
  type SelectOption,
} from "@/components/ui";
import {
  SerializedRoom,
  SerializedFloorOption,
  SerializedRoomTypeOption,
  RoomStatus,
} from "@/types/rooms";
import {
  roomSchema,
  createRoomAction,
  updateRoomAction,
} from "@/lib/room";
import { FiHash, FiLayers, FiHome, FiAlertCircle } from "react-icons/fi";

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room?: SerializedRoom | null;
  floors: SerializedFloorOption[];
  roomTypes: SerializedRoomTypeOption[];
  onSuccess?: () => void;
}

const ROOM_STATUS_OPTIONS: SelectOption[] = [
  {
    value: "AVAILABLE",
    label: "Disponible",
    description: "Limpia y lista para recibir huéspedes",
  },
  {
    value: "CLEANING",
    label: "En Limpieza",
    description: "Pendiente de aseo o desinfección",
  },
  {
    value: "MAINTENANCE",
    label: "Fuera de Servicio",
    description: "Mantenimiento técnico o reparaciones",
  },
  {
    value: "RESERVED",
    label: "Reservada",
    description: "Asignada a una reserva próxima",
  },
  {
    value: "OCCUPIED",
    label: "Ocupada",
    description: "Huésped alojado actualmente",
  },
];

export default function RoomModal({
  isOpen,
  onClose,
  room,
  floors,
  roomTypes,
  onSuccess,
}: RoomModalProps) {
  const isEditing = Boolean(room);

  const [number, setNumber] = useState("");
  const [floorId, setFloorId] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [status, setStatus] = useState<RoomStatus>("AVAILABLE");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Inicializar estado del formulario
  useEffect(() => {
    if (isOpen) {
      if (room) {
        setNumber(room.number || "");
        setFloorId(String(room.floorId || ""));
        setRoomTypeId(String(room.roomTypeId || ""));
        setStatus(room.status || "AVAILABLE");
        setNotes(room.notes || "");
      } else {
        setNumber("");
        setFloorId(floors.length > 0 ? String(floors[0].id) : "");
        setRoomTypeId(roomTypes.length > 0 ? String(roomTypes[0].id) : "");
        setStatus("AVAILABLE");
        setNotes("");
      }
      setErrors({});
    }
  }, [isOpen, room, floors, roomTypes]);

  // Convertir pisos a SelectOption
  const floorOptions: SelectOption[] = floors.map((f) => ({
    value: String(f.id),
    label: f.name,
    description: `Nivel ${f.number}`,
  }));

  // Convertir tipos a SelectOption
  const roomTypeOptions: SelectOption[] = roomTypes.map((rt) => ({
    value: String(rt.id),
    label: rt.name,
    description: `Tarifa: S/ ${Number(rt.basePrice).toFixed(2)} • Aforo: ${rt.maxGuests} pers.`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validación en cliente con Zod
    const validationResult = roomSchema.safeParse({
      number,
      floorId,
      roomTypeId,
      status,
      notes: notes || undefined,
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
      const res = isEditing && room
        ? await updateRoomAction(room.id, validationResult.data)
        : await createRoomAction(validationResult.data);

      if (!res.success) {
        if (res.errors) {
          setErrors(res.errors);
        } else {
          toast.error(res.message || "Error al procesar la habitación.");
        }
        return;
      }

      toast.success(res.message);
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Error en formulario de habitación:", err);
      toast.error("Ocurrió un error inesperado al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Editar Habitación ${room?.number}` : "Nueva Habitación"}
      subtitle={
        isEditing
          ? `Modifica los datos y ubicación de la habitación (ID: #${room?.id})`
          : "Registra una nueva habitación física asignándole piso y tipo de cuarto."
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
            {isEditing ? "Guardar Cambios" : "Crear Habitación"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Fila 1: Número de Habitación */}
        <div>
          <Label required htmlFor="room-number">
            Número o Código de Habitación
          </Label>
          <Input
            id="room-number"
            placeholder="Ej: 101, 201, VIP-01..."
            icon={<FiHash className="w-4 h-4" />}
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
            autoFocus
            disabled={loading}
          />
        </div>

        {/* Fila 2: Piso y Tipo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label required>Piso / Ubicación</Label>
            {floors.length === 0 ? (
              <p className="text-xs text-danger-text py-2">
                No hay pisos registrados en la base de datos.
              </p>
            ) : (
              <Select
                options={floorOptions}
                value={floorId}
                onChange={(e) => {
                  setFloorId(e.target.value);
                  if (errors.floorId) {
                    setErrors((prev) => {
                      const u = { ...prev };
                      delete u.floorId;
                      return u;
                    });
                  }
                }}
                error={errors.floorId}
                disabled={loading}
              />
            )}
          </div>

          <div>
            <Label required>Tipo de Habitación</Label>
            {roomTypes.length === 0 ? (
              <p className="text-xs text-danger-text py-2">
                No hay tipos de habitación registrados.
              </p>
            ) : (
              <Select
                options={roomTypeOptions}
                value={roomTypeId}
                onChange={(e) => {
                  setRoomTypeId(e.target.value);
                  if (errors.roomTypeId) {
                    setErrors((prev) => {
                      const u = { ...prev };
                      delete u.roomTypeId;
                      return u;
                    });
                  }
                }}
                error={errors.roomTypeId}
                disabled={loading}
              />
            )}
          </div>
        </div>

        {/* Fila 3: Estado */}
        <div>
          <Label required>Estado de la Habitación</Label>
          <Select
            options={ROOM_STATUS_OPTIONS}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as RoomStatus);
              if (errors.status) {
                setErrors((prev) => {
                  const u = { ...prev };
                  delete u.status;
                  return u;
                });
              }
            }}
            error={errors.status}
            disabled={loading}
          />
        </div>

        {/* Fila 4: Notas Técnicas */}
        <div>
          <Label htmlFor="room-notes">
            Notas Técnicas u Observaciones <span className="text-text-tertiary font-normal">(Opcional)</span>
          </Label>
          <Textarea
            id="room-notes"
            placeholder="Ej: Fuga de grifo reparada, cama adicional instalada, vista a la calle..."
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              if (errors.notes) {
                setErrors((prev) => {
                  const u = { ...prev };
                  delete u.notes;
                  return u;
                });
              }
            }}
            error={errors.notes}
            rows={3}
            disabled={loading}
          />
        </div>
      </form>
    </Modal>
  );
}

