"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FiClock, FiAlertCircle, FiCheck } from "react-icons/fi";
import {
  Modal,
  Input,
  Label,
  Button,
  Select,
  Textarea,
  type SelectOption,
} from "@/components/ui";
import { extendStaySchema } from "@/lib/stay/checkout.schema";
import { extendStayAction } from "@/lib/stay/checkout.actions";
import type { SerializedStay } from "@/types/stays";

interface ExtendStayModalProps {
  isOpen: boolean;
  onClose: () => void;
  stay: SerializedStay | null;
  onSuccess: () => void;
}

const MODE_OPTIONS: SelectOption[] = [
  { value: "NIGHTS", label: "Agregar Noches" },
  { value: "HOURS", label: "Agregar Horas" },
];

export default function ExtendStayModal({
  isOpen,
  onClose,
  stay,
  onSuccess,
}: ExtendStayModalProps) {
  const [mode, setMode] = useState<"NIGHTS" | "HOURS">("NIGHTS");
  const [units, setUnits] = useState("1");
  const [additionalCost, setAdditionalCost] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && stay) {
      const defaultMode = stay.isHourly ? "HOURS" : "NIGHTS";
      setMode(defaultMode);
      setUnits("1");
      setAdditionalCost(stay.roomPrice.toFixed(2));
      setNotes("");
      setErrors({});
      setServerError(null);
    }
  }, [isOpen, stay]);

  const numericUnits = Math.max(1, Number(units) || 1);

  const previewNewEnd = useMemo(() => {
    if (!stay) return "";
    const base = new Date(
      Math.max(Date.now(), new Date(stay.expectedCheckOut).getTime()),
    );
    const next = new Date(base);
    if (mode === "NIGHTS") {
      next.setDate(next.getDate() + numericUnits);
      next.setHours(12, 0, 0, 0);
    } else {
      next.setTime(next.getTime() + numericUnits * 60 * 60 * 1000);
    }
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(next);
  }, [stay, mode, numericUnits]);

  if (!stay) return null;

  const handleUnitsOrModeChange = (
    nextMode: "NIGHTS" | "HOURS",
    nextUnitsStr: string,
  ) => {
    setMode(nextMode);
    setUnits(nextUnitsStr);
    const qty = Math.max(0, Number(nextUnitsStr) || 0);
    setAdditionalCost((stay.roomPrice * qty).toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = extendStaySchema.safeParse({
      stayId: stay.id,
      mode,
      units: units === "" ? 0 : Number(units),
      additionalCost: additionalCost === "" ? 0 : Number(additionalCost),
      notes: notes || null,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const res = await extendStayAction(parsed.data);
      if (res.success) {
        toast.success(res.message || "Estadía extendida.");
        onSuccess();
        onClose();
      } else {
        if (res.errors) setErrors(res.errors);
        if (res.message) setServerError(res.message);
      }
    } catch (err) {
      console.error(err);
      setServerError("Ocurrió un error inesperado al extender la estadía.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Extender Estadía — Hab. ${stay.roomNumber}`}
      subtitle={`Estadía ${stay.code} · ${stay.primaryGuestName}`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="extend-stay-form"
            variant="primary"
            loading={loading}
          >
            <FiCheck className="w-4 h-4" />
            <span>Confirmar Extensión</span>
          </Button>
        </div>
      }
    >
      <form
        id="extend-stay-form"
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4"
      >
        {serverError && (
          <div className="p-3 rounded-xl bg-danger-bg border border-danger-border text-danger-text text-xs font-medium flex items-start gap-2">
            <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <Label htmlFor="extendMode">Tipo de extensión</Label>
            <div className="mt-1">
              <Select
                id="extendMode"
                value={mode}
                onValueChange={(val) =>
                  handleUnitsOrModeChange(val as "NIGHTS" | "HOURS", units)
                }
                options={MODE_OPTIONS}
                searchable={false}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="extendUnits" required>
              {mode === "NIGHTS" ? "Noches adicionales" : "Horas adicionales"}
            </Label>
            <Input
              id="extendUnits"
              type="number"
              min="1"
              max="30"
              value={units}
              onChange={(e) => handleUnitsOrModeChange(mode, e.target.value)}
              error={errors.units}
              className="mt-1 font-mono font-semibold"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="extendCost" required>
            Costo adicional a sumar (S/)
          </Label>
          <Input
            id="extendCost"
            type="number"
            step="0.01"
            min="0"
            value={additionalCost}
            onChange={(e) => {
              setAdditionalCost(e.target.value);
              if (errors.additionalCost) {
                setErrors((p) => ({ ...p, additionalCost: "" }));
              }
            }}
            error={errors.additionalCost}
            className="mt-1 font-mono font-bold"
          />
        </div>

        {/* Preview */}
        <div className="p-3.5 rounded-xl bg-brand-50/60 border border-brand-200/80 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-brand-700">
            <FiClock className="w-3.5 h-3.5" />
            <span>Nueva salida estimada: {previewNewEnd}</span>
          </div>
          <p className="text-text-secondary">
            Nuevo total de cuenta:{" "}
            <strong className="font-mono text-text-primary">
              S/ {(stay.totalAmount + (Number(additionalCost) || 0)).toFixed(2)}
            </strong>
          </p>
        </div>

        <div>
          <Label htmlFor="extendNotes">Observación (opcional)</Label>
          <Textarea
            id="extendNotes"
            rows={2}
            placeholder="Ej: Huésped solicitó quedarse una noche adicional..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1"
          />
        </div>
      </form>
    </Modal>
  );
}
