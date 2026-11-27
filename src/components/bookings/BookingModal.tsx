"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FiCheck,
  FiAlertCircle,
  FiCalendar,
  FiClock,
  FiInfo,
} from "react-icons/fi";
import {
  Modal,
  Input,
  Label,
  Button,
  Select,
  Textarea,
  type SelectOption,
} from "@/components/ui";
import {
  createBookingSchema,
  updateBookingSchema,
} from "@/lib/booking/schema";
import {
  createBookingAction,
  updateBookingAction,
} from "@/lib/booking/actions";
import type {
  PaymentMethod,
  SerializedBooking,
  SerializedBookingGuestOption,
  SerializedBookingRoomOption,
} from "@/types/bookings";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: SerializedBooking | null;
  rooms: SerializedBookingRoomOption[];
  guests: SerializedBookingGuestOption[];
  hasOpenCashShift: boolean;
  onSuccess: () => void;
}

type StayMode = "NIGHTLY" | "HOURLY";

function toInputDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toInputTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

function calcNightsFromStrings(start: string, end: string): number {
  if (!start || !end) return 1;
  if (end < start) return 0;
  if (end === start) return 1;
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    return 0;
  }
  return Math.max(
    1,
    Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function buildHourlyRange(dateStr: string, startTime: string, hoursCount: number) {
  const start = new Date(`${dateStr}T${startTime || "14:00"}:00`);
  if (Number.isNaN(start.getTime())) {
    return { checkInIso: "", checkOutIso: "", endTimeLabel: "" };
  }
  const end = new Date(start.getTime() + Math.max(1, hoursCount) * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmtLocal = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

  return {
    checkInIso: fmtLocal(start),
    checkOutIso: fmtLocal(end),
    endTimeLabel: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
  };
}

const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { value: "CASH", label: "Efectivo" },
  { value: "YAPE", label: "Yape" },
  { value: "PLIN", label: "Plin" },
  { value: "CARD", label: "Tarjeta" },
  { value: "TRANSFER", label: "Transferencia" },
];

export default function BookingModal({
  isOpen,
  onClose,
  booking,
  rooms,
  guests,
  hasOpenCashShift,
  onSuccess,
}: BookingModalProps) {
  const isEditing = Boolean(booking);

  const [stayMode, setStayMode] = useState<StayMode>("NIGHTLY");
  const [guestId, setGuestId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [startTime, setStartTime] = useState("14:00");
  const [hoursCount, setHoursCount] = useState("3");
  const [numberOfGuests, setNumberOfGuests] = useState("1");
  const [totalPrice, setTotalPrice] = useState("");
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false);

  // Adelanto inicial (solo creación)
  const [initialDeposit, setInitialDeposit] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentReference, setPaymentReference] = useState("");

  const [clientNotes, setClientNotes] = useState("");
  const [receptionNotes, setReceptionNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const guestOptions: SelectOption[] = useMemo(
    () =>
      guests.map((g) => ({
        value: String(g.id),
        label: g.fullName,
        description: `${g.documentType}: ${g.documentNumber}${g.businessName ? ` · ${g.businessName}` : ""}`,
      })),
    [guests],
  );

  const roomOptions: SelectOption[] = useMemo(
    () =>
      rooms.map((r) => ({
        value: String(r.id),
        label: `Hab. ${r.number} — ${r.roomTypeName}`,
        description: `${r.floorName} · Noche S/ ${r.basePrice.toFixed(2)}${r.hourlyPrice ? ` · Hora S/ ${r.hourlyPrice.toFixed(2)}` : ""} · Máx. ${r.maxGuests}`,
      })),
    [rooms],
  );

  const selectedRoom = useMemo(
    () => rooms.find((r) => String(r.id) === roomId) ?? null,
    [rooms, roomId],
  );

  const canUseHourly = Boolean(selectedRoom?.hourlyPrice && selectedRoom.hourlyPrice > 0);

  const stayModeOptions: SelectOption[] = useMemo(
    () => [
      {
        value: "NIGHTLY",
        label: selectedRoom
          ? `Por Noche (S/ ${selectedRoom.basePrice.toFixed(2)}/noche)`
          : "Por Noche",
      },
      {
        value: "HOURLY",
        label: canUseHourly
          ? `Por Horas (S/ ${selectedRoom!.hourlyPrice!.toFixed(2)}/hora)`
          : "Por Horas (no configurado)",
        disabled: !canUseHourly,
      },
    ],
    [selectedRoom, canUseHourly],
  );

  const todayStr = useMemo(() => toInputDate(new Date()), [isOpen]);

  const nights = useMemo(
    () => calcNightsFromStrings(checkInDate, checkOutDate),
    [checkInDate, checkOutDate],
  );

  const numericHours = Math.max(1, Math.min(12, Number(hoursCount) || 1));

  const hourlyPreview = useMemo(
    () => buildHourlyRange(checkInDate, startTime, numericHours),
    [checkInDate, startTime, numericHours],
  );

  // Si cambia a una habitación sin tarifa por horas, volver a Por Noche
  useEffect(() => {
    if (stayMode === "HOURLY" && !canUseHourly) {
      setStayMode("NIGHTLY");
      setPriceManuallyEdited(false);
    }
  }, [stayMode, canUseHourly]);

  // Sincronizar al abrir
  useEffect(() => {
    if (!isOpen) return;

    if (booking) {
      const checkInObj = new Date(booking.checkInDate);
      setStayMode(booking.isHourly ? "HOURLY" : "NIGHTLY");
      setGuestId(String(booking.guestId));
      setRoomId(String(booking.roomId));
      setCheckInDate(toInputDate(checkInObj));
      setCheckOutDate(toInputDate(new Date(booking.checkOutDate)));
      setStartTime(booking.isHourly ? toInputTime(checkInObj) : "14:00");
      setHoursCount(booking.isHourly ? String(booking.durationHours) : "3");
      setNumberOfGuests(String(booking.numberOfGuests));
      setTotalPrice(booking.totalPrice.toFixed(2));
      setPriceManuallyEdited(true);
      setInitialDeposit("0");
      setPaymentMethod("CASH");
      setPaymentReference("");
      setClientNotes(booking.clientNotes || "");
      setReceptionNotes(booking.receptionNotes || "");
    } else {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const defaultRoom = rooms[0] ?? null;
      setStayMode("NIGHTLY");
      setGuestId(guests[0] ? String(guests[0].id) : "");
      setRoomId(defaultRoom ? String(defaultRoom.id) : "");
      setCheckInDate(toInputDate(today));
      setCheckOutDate(toInputDate(tomorrow));
      setStartTime(toInputTime(today));
      setHoursCount("3");
      setNumberOfGuests("1");
      setTotalPrice(defaultRoom ? defaultRoom.basePrice.toFixed(2) : "");
      setPriceManuallyEdited(false);
      setInitialDeposit("0");
      setPaymentMethod("CASH");
      setPaymentReference("");
      setClientNotes("");
      setReceptionNotes("");
    }

    setErrors({});
    setServerError(null);
  }, [isOpen, booking, rooms, guests]);

  // Recalcular tarifa automáticamente
  useEffect(() => {
    if (!isOpen || priceManuallyEdited || !selectedRoom) return;

    if (stayMode === "HOURLY" && selectedRoom.hourlyPrice) {
      const calculated = selectedRoom.hourlyPrice * numericHours;
      setTotalPrice(calculated.toFixed(2));
    } else if (stayMode === "NIGHTLY" && nights > 0) {
      const calculated = selectedRoom.basePrice * nights;
      setTotalPrice(calculated.toFixed(2));
    }
  }, [isOpen, selectedRoom, stayMode, nights, numericHours, priceManuallyEdited]);

  const numericDeposit = Number(initialDeposit) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const resolvedCheckIn =
      stayMode === "HOURLY" ? hourlyPreview.checkInIso : checkInDate;
    const resolvedCheckOut =
      stayMode === "HOURLY" ? hourlyPreview.checkOutIso : checkOutDate;

    if (isEditing && booking) {
      const payload = {
        id: booking.id,
        stayMode,
        roomId: roomId === "" ? 0 : Number(roomId),
        guestId: guestId === "" ? 0 : Number(guestId),
        checkInDate: resolvedCheckIn,
        checkOutDate: resolvedCheckOut,
        numberOfGuests: Number(numberOfGuests) || 0,
        totalPrice: totalPrice === "" ? 0 : Number(totalPrice),
        clientNotes: clientNotes || null,
        receptionNotes: receptionNotes || null,
      };

      const parsed = updateBookingSchema.safeParse(payload);
      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          if (field && !nextErrors[field]) nextErrors[field] = issue.message;
        });
        setErrors(nextErrors);
        return;
      }

      if (selectedRoom && parsed.data.numberOfGuests > selectedRoom.maxGuests) {
        setErrors({
          numberOfGuests: `La habitación ${selectedRoom.number} permite máximo ${selectedRoom.maxGuests} ${selectedRoom.maxGuests === 1 ? "huésped" : "huéspedes"}.`,
        });
        return;
      }

      setErrors({});
      setLoading(true);
      try {
        const res = await updateBookingAction(parsed.data);
        if (res.success) {
          toast.success(res.message || "Reserva actualizada.");
          onSuccess();
          onClose();
        } else {
          if (res.errors) setErrors(res.errors);
          if (res.message) setServerError(res.message);
        }
      } catch (err) {
        console.error(err);
        setServerError("Error inesperado al actualizar la reserva.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Creación
    const payload = {
      stayMode,
      roomId: roomId === "" ? 0 : Number(roomId),
      guestId: guestId === "" ? 0 : Number(guestId),
      checkInDate: resolvedCheckIn,
      checkOutDate: resolvedCheckOut,
      numberOfGuests: Number(numberOfGuests) || 0,
      origin: "RECEPTION" as const,
      totalPrice: totalPrice === "" ? 0 : Number(totalPrice),
      initialDeposit: initialDeposit === "" ? 0 : Number(initialDeposit),
      paymentMethod,
      receiptType: "TICKET" as const,
      paymentReference: paymentReference || null,
      clientNotes: clientNotes || null,
      receptionNotes: receptionNotes || null,
    };

    const parsed = createBookingSchema.safeParse(payload);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    if (selectedRoom && parsed.data.numberOfGuests > selectedRoom.maxGuests) {
      setErrors({
        numberOfGuests: `La habitación ${selectedRoom.number} permite máximo ${selectedRoom.maxGuests} ${selectedRoom.maxGuests === 1 ? "huésped" : "huéspedes"}.`,
      });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const res = await createBookingAction(parsed.data);
      if (res.success) {
        toast.success(res.message || "Reserva creada correctamente.");
        onSuccess();
        onClose();
      } else {
        if (res.errors) setErrors(res.errors);
        if (res.message) setServerError(res.message);
      }
    } catch (err) {
      console.error(err);
      setServerError("Error inesperado al registrar la reserva.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Editar Reserva ${booking?.code}` : "Nueva Reserva"}
      subtitle={
        isEditing
          ? "Modifica modalidad, fechas, habitación, huésped o tarifa de la reserva."
          : "Registra una reserva por noche o por horas, verifica disponibilidad y cobra adelanto opcional."
      }
      size="xl"
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
            form="booking-form"
            variant="primary"
            loading={loading}
          >
            <FiCheck className="w-4 h-4" />
            <span>{isEditing ? "Guardar Cambios" : "Registrar Reserva"}</span>
          </Button>
        </div>
      }
    >
      <form
        id="booking-form"
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

        {/* Huésped y Habitación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="guestId" required>
              Huésped / Cliente
            </Label>
            <div className="mt-1">
              <Select
                id="guestId"
                value={guestId}
                onValueChange={(val) => {
                  setGuestId(val);
                  if (errors.guestId) setErrors((p) => ({ ...p, guestId: "" }));
                }}
                options={guestOptions}
                placeholder="Seleccionar huésped..."
                searchable
                searchPlaceholder="Buscar por nombre o documento..."
                error={errors.guestId}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="roomId" required>
              Habitación
            </Label>
            <div className="mt-1">
              <Select
                id="roomId"
                value={roomId}
                onValueChange={(val) => {
                  setRoomId(val);
                  setPriceManuallyEdited(false);
                  if (errors.roomId) setErrors((p) => ({ ...p, roomId: "" }));
                }}
                options={roomOptions}
                placeholder="Seleccionar habitación..."
                searchable
                searchPlaceholder="Buscar por número o tipo..."
                error={errors.roomId}
              />
            </div>
          </div>
        </div>

        {/* Modalidad y N° Huéspedes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="stayMode" required>
              Modalidad de estancia
            </Label>
            <div className="mt-1">
              <Select
                id="stayMode"
                value={stayMode}
                onValueChange={(val) => {
                  setStayMode(val as StayMode);
                  setPriceManuallyEdited(false);
                  setErrors((p) => ({
                    ...p,
                    checkInDate: "",
                    checkOutDate: "",
                  }));
                }}
                options={stayModeOptions}
                searchable={false}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="numberOfGuests" required>
              N° Huéspedes
            </Label>
            <Input
              id="numberOfGuests"
              type="number"
              min="1"
              max={selectedRoom?.maxGuests ?? 20}
              value={numberOfGuests}
              onChange={(e) => {
                setNumberOfGuests(e.target.value);
                if (errors.numberOfGuests) {
                  setErrors((p) => ({ ...p, numberOfGuests: "" }));
                }
              }}
              error={errors.numberOfGuests}
              className="mt-1"
            />
            {selectedRoom && (
              <p className="text-[11px] text-text-tertiary mt-1">
                Aforo máximo: {selectedRoom.maxGuests}{" "}
                {selectedRoom.maxGuests === 1 ? "persona" : "personas"}
              </p>
            )}
          </div>
        </div>

        {/* Fechas / Horas y Tarifa según Modalidad */}
        {stayMode === "NIGHTLY" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="checkInDate" required>
                Fecha de llegada
              </Label>
              <Input
                id="checkInDate"
                type="date"
                min={!isEditing ? todayStr : undefined}
                value={checkInDate}
                onChange={(e) => {
                  const nextIn = e.target.value;
                  setCheckInDate(nextIn);
                  if (nextIn && checkOutDate && checkOutDate < nextIn) {
                    setCheckOutDate(nextIn);
                  }
                  setPriceManuallyEdited(false);
                  if (errors.checkInDate) {
                    setErrors((p) => ({ ...p, checkInDate: "" }));
                  }
                }}
                error={errors.checkInDate}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="checkOutDate" required>
                Fecha de salida
              </Label>
              <Input
                id="checkOutDate"
                type="date"
                min={checkInDate || todayStr}
                value={checkOutDate}
                onChange={(e) => {
                  setCheckOutDate(e.target.value);
                  setPriceManuallyEdited(false);
                  if (errors.checkOutDate) {
                    setErrors((p) => ({ ...p, checkOutDate: "" }));
                  }
                }}
                error={errors.checkOutDate}
                className="mt-1"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="hourlyDate" required>
                Fecha
              </Label>
              <Input
                id="hourlyDate"
                type="date"
                min={!isEditing ? todayStr : undefined}
                value={checkInDate}
                onChange={(e) => {
                  setCheckInDate(e.target.value);
                  if (errors.checkInDate) {
                    setErrors((p) => ({ ...p, checkInDate: "" }));
                  }
                }}
                error={errors.checkInDate}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="startTime" required>
                Hora de llegada
              </Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="hoursCount" required>
                Cantidad de horas
              </Label>
              <Input
                id="hoursCount"
                type="number"
                min="1"
                max="12"
                value={hoursCount}
                onChange={(e) => {
                  setHoursCount(e.target.value);
                  setPriceManuallyEdited(false);
                }}
                error={errors.checkOutDate}
                className="mt-1"
              />
              {hourlyPreview.endTimeLabel && (
                <p className="text-[11px] text-text-tertiary mt-1 flex items-center gap-1">
                  <FiClock className="w-3 h-3 shrink-0" />
                  <span>
                    Salida estimada: {hourlyPreview.endTimeLabel}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Resumen de Estancia y Total Reserva */}
        <div className="p-3.5 rounded-xl bg-brand-50/60 border border-brand-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-700">
              {stayMode === "HOURLY" ? (
                <>
                  <FiClock className="w-3.5 h-3.5 shrink-0" />
                  <span>Resumen — Estancia por Horas</span>
                </>
              ) : (
                <>
                  <FiCalendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Resumen — Estancia por Noche</span>
                </>
              )}
            </div>

            {selectedRoom ? (
              stayMode === "HOURLY" && selectedRoom.hourlyPrice ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="font-semibold text-text-primary font-mono">
                    {numericHours} {numericHours === 1 ? "hora" : "horas"} × S/{" "}
                    {selectedRoom.hourlyPrice.toFixed(2)}
                  </span>
                  <span className="text-text-tertiary">·</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-bg-card border border-brand-200/70 text-[11px] font-semibold text-brand-700 font-mono">
                    {startTime} → {hourlyPreview.endTimeLabel}
                  </span>
                </div>
              ) : nights > 0 ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="font-semibold text-text-primary font-mono">
                    {nights} {nights === 1 ? "noche" : "noches"} × S/{" "}
                    {selectedRoom.basePrice.toFixed(2)}
                  </span>
                  {checkInDate && checkOutDate && (
                    <>
                      <span className="text-text-tertiary">·</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-bg-card border border-brand-200/70 text-[11px] font-semibold text-brand-700">
                        {checkInDate.split("-").reverse().join("/")} →{" "}
                        {checkOutDate.split("-").reverse().join("/")}
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-xs text-text-secondary">
                  Selecciona un rango de fechas válido para calcular la tarifa.
                </p>
              )
            ) : (
              <p className="text-xs text-text-secondary">
                Selecciona una habitación para calcular la tarifa.
              </p>
            )}
          </div>

          <div className="w-full sm:w-44 shrink-0">
            <Label htmlFor="totalPrice" required>
              Total Reserva (S/)
            </Label>
            <Input
              id="totalPrice"
              type="number"
              step="0.01"
              min="0"
              value={totalPrice}
              onChange={(e) => {
                setTotalPrice(e.target.value);
                setPriceManuallyEdited(true);
                if (errors.totalPrice) {
                  setErrors((p) => ({ ...p, totalPrice: "" }));
                }
              }}
              error={errors.totalPrice}
              className="mt-1 font-mono font-bold text-right bg-bg-card"
            />
          </div>
        </div>

        {/* Sección de Adelanto Inicial (solo al crear) */}
        {!isEditing && (
          <div className="p-4 rounded-xl bg-bg-surface/70 border border-border-default space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Adelanto / Seña Inicial (Opcional)
              </h4>
              <span className="text-[11px] text-text-secondary">
                {numericDeposit > 0
                  ? "La reserva se creará como Confirmada"
                  : "Con S/ 0.00 se creará como Pendiente"}
              </span>
            </div>

            {!hasOpenCashShift && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <FiInfo className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  No hay un Turno de Caja abierto. Puedes crear la reserva con
                  adelanto <strong>S/ 0.00 (Pendiente)</strong> o abrir caja
                  primero para cobrar el adelanto.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <Label htmlFor="initialDeposit">Adelanto (S/)</Label>
                <Input
                  id="initialDeposit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={initialDeposit}
                  onChange={(e) => {
                    setInitialDeposit(e.target.value);
                    if (errors.initialDeposit) {
                      setErrors((p) => ({ ...p, initialDeposit: "" }));
                    }
                  }}
                  error={errors.initialDeposit}
                  className="mt-1 font-mono font-semibold"
                />
              </div>

              <div>
                <Label htmlFor="paymentMethod">Método de pago</Label>
                <div className="mt-1">
                  <Select
                    id="paymentMethod"
                    value={paymentMethod}
                    onValueChange={(val) =>
                      setPaymentMethod(val as PaymentMethod)
                    }
                    options={PAYMENT_METHOD_OPTIONS}
                    searchable={false}
                    disabled={numericDeposit <= 0}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="paymentReference">N° Operación (opc.)</Label>
                <Input
                  id="paymentReference"
                  type="text"
                  placeholder="Ej: Yape 123456"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  disabled={numericDeposit <= 0}
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-[11px] text-text-tertiary">
              Se emitirá automáticamente una constancia interna de adelanto. El
              comprobante formal (Boleta / Factura) se emite al Check-Out.
            </p>
          </div>
        )}

        {/* Notas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="clientNotes">Peticiones del cliente (opcional)</Label>
            <Textarea
              id="clientNotes"
              rows={2}
              placeholder="Ej: Cama adicional, llegada tarde, piso alto..."
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              error={errors.clientNotes}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="receptionNotes">Notas internas de recepción</Label>
            <Textarea
              id="receptionNotes"
              rows={2}
              placeholder="Ej: Confirmado por WhatsApp, tarifa corporativa..."
              value={receptionNotes}
              onChange={(e) => setReceptionNotes(e.target.value)}
              error={errors.receptionNotes}
              className="mt-1"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
