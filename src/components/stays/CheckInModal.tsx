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
import { createStaySchema } from "@/lib/stay/schema";
import { createStayAction } from "@/lib/stay/actions";
import type {
  PaymentMethod,
  SerializedPendingBookingOption,
  SerializedStayGuestOption,
  SerializedStayRoomOption,
} from "@/types/stays";

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: SerializedStayRoomOption[];
  guests: SerializedStayGuestOption[];
  pendingBookings: SerializedPendingBookingOption[];
  hasOpenCashShift: boolean;
  onSuccess: () => void;
}

type StayMode = "NIGHTLY" | "HOURLY";
type EntryType = "WALK_IN" | "BOOKING";

function toInputDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function calcNightsFromToday(endDateStr: string): number {
  const todayStr = toInputDate(new Date());
  if (!endDateStr || endDateStr < todayStr) return 0;
  if (endDateStr === todayStr) return 1;
  const s = new Date(`${todayStr}T00:00:00`);
  const e = new Date(`${endDateStr}T00:00:00`);
  return Math.max(
    1,
    Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

function buildHourlyExpectedEnd(hoursCount: number) {
  const now = new Date();
  const end = new Date(now.getTime() + Math.max(1, hoursCount) * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}:00`;
  return {
    iso,
    timeLabel: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
  };
}

const PAYMENT_METHOD_OPTIONS: SelectOption[] = [
  { value: "CASH", label: "Efectivo" },
  { value: "YAPE", label: "Yape" },
  { value: "PLIN", label: "Plin" },
  { value: "CARD", label: "Tarjeta" },
  { value: "TRANSFER", label: "Transferencia" },
];

export default function CheckInModal({
  isOpen,
  onClose,
  rooms,
  guests,
  pendingBookings,
  hasOpenCashShift,
  onSuccess,
}: CheckInModalProps) {
  const [entryType, setEntryType] = useState<EntryType>("WALK_IN");
  const [bookingId, setBookingId] = useState<string>("");
  const [stayMode, setStayMode] = useState<StayMode>("NIGHTLY");

  const [primaryGuestId, setPrimaryGuestId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [expectedOutDate, setExpectedOutDate] = useState("");
  const [hoursCount, setHoursCount] = useState("3");

  const [totalRoomCost, setTotalRoomCost] = useState("");
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(false);
  const [discount, setDiscount] = useState("0");
  const [securityDeposit, setSecurityDeposit] = useState("0");

  const [initialPayment, setInitialPayment] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const todayStr = useMemo(() => toInputDate(new Date()), [isOpen]);

  const entryTypeOptions: SelectOption[] = useMemo(
    () => [
      { value: "WALK_IN", label: "Ingreso Directo (Walk-in)" },
      {
        value: "BOOKING",
        label:
          pendingBookings.length > 0
            ? `Desde Reserva (${pendingBookings.length} disponibles)`
            : "Desde Reserva (sin reservas pendientes)",
        disabled: pendingBookings.length === 0,
      },
    ],
    [pendingBookings.length],
  );

  const bookingOptions: SelectOption[] = useMemo(
    () =>
      pendingBookings.map((b) => ({
        value: String(b.id),
        label: `${b.code} — ${b.guestFullName}`,
        description: `Hab. ${b.roomNumber} (${b.roomTypeName}) · Total S/ ${b.totalPrice.toFixed(2)} · Adelanto S/ ${b.depositPaid.toFixed(2)}`,
      })),
    [pendingBookings],
  );

  const selectedBooking = useMemo(
    () =>
      entryType === "BOOKING"
        ? pendingBookings.find((b) => String(b.id) === bookingId) ?? null
        : null,
    [entryType, pendingBookings, bookingId],
  );

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

  const canUseHourly = Boolean(
    selectedRoom?.hourlyPrice && selectedRoom.hourlyPrice > 0,
  );

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

  const nights = useMemo(
    () => calcNightsFromToday(expectedOutDate),
    [expectedOutDate],
  );

  const numericHours = Math.max(1, Math.min(12, Number(hoursCount) || 1));

  const hourlyEnd = useMemo(
    () => buildHourlyExpectedEnd(numericHours),
    [numericHours, isOpen],
  );

  // Sincronizar al abrir modal
  useEffect(() => {
    if (!isOpen) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultRoom = rooms[0] ?? null;

    setEntryType("WALK_IN");
    setBookingId(pendingBookings[0] ? String(pendingBookings[0].id) : "");
    setStayMode("NIGHTLY");
    setPrimaryGuestId(guests[0] ? String(guests[0].id) : "");
    setRoomId(defaultRoom ? String(defaultRoom.id) : "");
    setExpectedOutDate(toInputDate(tomorrow));
    setHoursCount("3");
    setTotalRoomCost(defaultRoom ? defaultRoom.basePrice.toFixed(2) : "");
    setPriceManuallyEdited(false);
    setDiscount("0");
    setSecurityDeposit("0");
    setInitialPayment("0");
    setPaymentMethod("CASH");
    setPaymentReference("");
    setNotes("");
    setErrors({});
    setServerError(null);
  }, [isOpen, rooms, guests, pendingBookings]);

  // Al seleccionar una reserva, autocompletar datos
  useEffect(() => {
    if (!isOpen || !selectedBooking) return;
    setPrimaryGuestId(String(selectedBooking.guestId));
    setRoomId(String(selectedBooking.roomId));
    setStayMode(selectedBooking.isHourly ? "HOURLY" : "NIGHTLY");
    setExpectedOutDate(toInputDate(new Date(selectedBooking.checkOutDate)));
    if (selectedBooking.isHourly) {
      setHoursCount(String(selectedBooking.durationHours));
    }
    setTotalRoomCost(selectedBooking.totalPrice.toFixed(2));
    setPriceManuallyEdited(true);
    setInitialPayment("0");
  }, [isOpen, selectedBooking]);

  // Si cambia a una habitación sin tarifa por horas, volver a Por Noche
  useEffect(() => {
    if (stayMode === "HOURLY" && !canUseHourly) {
      setStayMode("NIGHTLY");
      setPriceManuallyEdited(false);
    }
  }, [stayMode, canUseHourly]);

  // Recalcular tarifa automáticamente en Walk-in
  useEffect(() => {
    if (!isOpen || priceManuallyEdited || !selectedRoom) return;

    if (stayMode === "HOURLY" && selectedRoom.hourlyPrice) {
      setTotalRoomCost((selectedRoom.hourlyPrice * numericHours).toFixed(2));
    } else if (stayMode === "NIGHTLY" && nights > 0) {
      setTotalRoomCost((selectedRoom.basePrice * nights).toFixed(2));
    }
  }, [isOpen, selectedRoom, stayMode, nights, numericHours, priceManuallyEdited]);

  const numericRoomCost = Number(totalRoomCost) || 0;
  const numericDiscount = Number(discount) || 0;
  const numericInitialPayment = Number(initialPayment) || 0;
  const inheritedDeposit = selectedBooking ? selectedBooking.depositPaid : 0;
  const netTotal = Math.max(0, numericRoomCost - numericDiscount);
  const pendingAfterCheckIn = Math.max(
    0,
    netTotal - inheritedDeposit - numericInitialPayment,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const resolvedExpectedCheckOut =
      stayMode === "HOURLY" ? hourlyEnd.iso : expectedOutDate;

    const unitRate =
      stayMode === "HOURLY" && selectedRoom?.hourlyPrice
        ? selectedRoom.hourlyPrice
        : selectedRoom?.basePrice ?? numericRoomCost;

    const payload = {
      bookingId: selectedBooking ? selectedBooking.id : null,
      stayMode,
      roomId: roomId === "" ? 0 : Number(roomId),
      primaryGuestId: primaryGuestId === "" ? 0 : Number(primaryGuestId),
      additionalGuestIds: [],
      expectedCheckOut: resolvedExpectedCheckOut,
      roomPrice: unitRate > 0 ? unitRate : numericRoomCost,
      totalRoomCost: totalRoomCost === "" ? 0 : Number(totalRoomCost),
      securityDeposit: securityDeposit === "" ? 0 : Number(securityDeposit),
      discount: discount === "" ? 0 : Number(discount),
      initialPayment: initialPayment === "" ? 0 : Number(initialPayment),
      paymentMethod,
      paymentReference: paymentReference || null,
      notes: notes || null,
    };

    const parsed = createStaySchema.safeParse(payload);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    if (inheritedDeposit + parsed.data.initialPayment > netTotal) {
      const maxAllowed = Math.max(0, netTotal - inheritedDeposit);
      setErrors({
        initialPayment: `Supera el saldo pendiente (máximo S/ ${maxAllowed.toFixed(2)}).`,
      });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const res = await createStayAction(parsed.data);
      if (res.success) {
        toast.success(res.message || "Check-In realizado correctamente.");
        onSuccess();
        onClose();
      } else {
        if (res.errors) setErrors(res.errors);
        if (res.message) setServerError(res.message);
      }
    } catch (err) {
      console.error(err);
      setServerError("Ocurrió un error inesperado al registrar el Check-In.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Check-In / Alquiler"
      subtitle="Registra el ingreso del huésped, asigna la habitación como ocupada y cobra el pago inicial opcional."
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
            form="checkin-form"
            variant="primary"
            loading={loading}
          >
            <FiCheck className="w-4 h-4" />
            <span>Confirmar Check-In</span>
          </Button>
        </div>
      }
    >
      <form
        id="checkin-form"
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

        {/* Flujo según Tipo de Ingreso */}
        {entryType === "WALK_IN" ? (
          <>
            {/* Fila 1: Tipo de ingreso | Habitación Disponible */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="entryType" required>
                  Tipo de ingreso
                </Label>
                <div className="mt-1">
                  <Select
                    id="entryType"
                    value={entryType}
                    onValueChange={(val) => {
                      const next = val as EntryType;
                      setEntryType(next);
                      if (next === "WALK_IN") {
                        setPriceManuallyEdited(false);
                      } else if (!bookingId && pendingBookings[0]) {
                        setBookingId(String(pendingBookings[0].id));
                      }
                    }}
                    options={entryTypeOptions}
                    searchable={false}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="roomId" required>
                  Habitación Disponible
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

            {/* Fila 2: Modalidad de estancia | Huésped Titular */}
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
                    }}
                    options={stayModeOptions}
                    searchable={false}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="primaryGuestId" required>
                  Huésped Titular
                </Label>
                <div className="mt-1">
                  <Select
                    id="primaryGuestId"
                    value={primaryGuestId}
                    onValueChange={(val) => {
                      setPrimaryGuestId(val);
                      if (errors.primaryGuestId) {
                        setErrors((p) => ({ ...p, primaryGuestId: "" }));
                      }
                    }}
                    options={guestOptions}
                    placeholder="Seleccionar huésped..."
                    searchable
                    searchPlaceholder="Buscar por nombre o documento..."
                    error={errors.primaryGuestId}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Fila 1: Tipo de ingreso | Reserva a ingresar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="entryType" required>
                  Tipo de ingreso
                </Label>
                <div className="mt-1">
                  <Select
                    id="entryType"
                    value={entryType}
                    onValueChange={(val) => {
                      const next = val as EntryType;
                      setEntryType(next);
                      if (next === "WALK_IN") {
                        setPriceManuallyEdited(false);
                      }
                    }}
                    options={entryTypeOptions}
                    searchable={false}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bookingId" required>
                  Reserva a ingresar
                </Label>
                <div className="mt-1">
                  <Select
                    id="bookingId"
                    value={bookingId}
                    onValueChange={setBookingId}
                    options={bookingOptions}
                    placeholder="Seleccionar reserva..."
                    searchable
                  />
                </div>
              </div>
            </div>

            {/* Fila 2: Habitación Reservada (bloqueada) | Huésped Titular (bloqueado) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="roomId">Habitación Reservada</Label>
                <div className="mt-1">
                  <Select
                    id="roomId"
                    value={roomId}
                    onValueChange={() => {}}
                    options={roomOptions}
                    disabled
                    error={errors.roomId}
                  />
                </div>
                <p className="text-[11px] text-text-tertiary mt-1">
                  Asignada por la reserva (no editable)
                </p>
              </div>

              <div>
                <Label htmlFor="primaryGuestId">Huésped Titular</Label>
                <div className="mt-1">
                  <Select
                    id="primaryGuestId"
                    value={primaryGuestId}
                    onValueChange={() => {}}
                    options={guestOptions}
                    disabled
                    error={errors.primaryGuestId}
                  />
                </div>
                <p className="text-[11px] text-text-tertiary mt-1">
                  Titular de la reserva (no editable)
                </p>
              </div>
            </div>
          </>
        )}

        {/* Salida estimada, Garantía y Descuento */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          {stayMode === "NIGHTLY" ? (
            <div>
              <Label htmlFor="expectedOutDate" required>
                Salida estimada
              </Label>
              <Input
                id="expectedOutDate"
                type="date"
                min={todayStr}
                value={expectedOutDate}
                onChange={(e) => {
                  setExpectedOutDate(e.target.value);
                  setPriceManuallyEdited(false);
                  if (errors.expectedCheckOut) {
                    setErrors((p) => ({ ...p, expectedCheckOut: "" }));
                  }
                }}
                error={errors.expectedCheckOut}
                className="mt-1"
              />
            </div>
          ) : (
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
                error={errors.expectedCheckOut}
                className="mt-1"
              />
              <p className="text-[11px] text-text-tertiary mt-1">
                Salida aprox.: {hourlyEnd.timeLabel}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="securityDeposit">Garantía (S/)</Label>
            <Input
              id="securityDeposit"
              type="number"
              step="0.01"
              min="0"
              value={securityDeposit}
              onChange={(e) => setSecurityDeposit(e.target.value)}
              error={errors.securityDeposit}
              className="mt-1 font-mono"
            />
            <p className="text-[11px] text-text-tertiary mt-1">
              Llave / control (opcional)
            </p>
          </div>

          <div>
            <Label htmlFor="discount">Descuento (S/)</Label>
            <Input
              id="discount"
              type="number"
              step="0.01"
              min="0"
              value={discount}
              onChange={(e) => {
                setDiscount(e.target.value);
                if (errors.discount) setErrors((p) => ({ ...p, discount: "" }));
              }}
              error={errors.discount}
              className="mt-1 font-mono"
            />
          </div>
        </div>

        {/* Resumen de Alojamiento y Total */}
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
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="font-semibold text-text-primary font-mono">
                {stayMode === "HOURLY" && selectedRoom?.hourlyPrice
                  ? `${numericHours} ${numericHours === 1 ? "hora" : "horas"} × S/ ${selectedRoom.hourlyPrice.toFixed(2)}`
                  : selectedRoom
                    ? `${nights} ${nights === 1 ? "noche" : "noches"} × S/ ${selectedRoom.basePrice.toFixed(2)}`
                    : "Selecciona habitación"}
              </span>
              {inheritedDeposit > 0 && (
                <>
                  <span className="text-text-tertiary">·</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[11px] font-semibold">
                    Adelanto heredado: S/ {inheritedDeposit.toFixed(2)}
                  </span>
                </>
              )}
            </div>
            <p className="text-[11px] text-text-secondary">
              Neto a pagar: <strong className="font-mono">S/ {netTotal.toFixed(2)}</strong> · Saldo tras ingreso:{" "}
              <strong className="font-mono text-brand-700">
                S/ {pendingAfterCheckIn.toFixed(2)}
              </strong>
            </p>
          </div>

          <div className="w-full sm:w-44 shrink-0">
            <Label htmlFor="totalRoomCost" required>
              Costo Alojamiento (S/)
            </Label>
            <Input
              id="totalRoomCost"
              type="number"
              step="0.01"
              min="0"
              value={totalRoomCost}
              onChange={(e) => {
                setTotalRoomCost(e.target.value);
                setPriceManuallyEdited(true);
                if (errors.totalRoomCost) {
                  setErrors((p) => ({ ...p, totalRoomCost: "" }));
                }
              }}
              error={errors.totalRoomCost}
              className="mt-1 font-mono font-bold text-right bg-bg-card"
            />
          </div>
        </div>

        {/* Pago inicial opcional */}
        <div className="p-4 rounded-xl bg-bg-surface/70 border border-border-default space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Pago al Ingreso (Opcional)
            </h4>
            <span className="text-[11px] text-text-secondary">
              Puedes cobrar ahora o liquidar al Check-Out
            </span>
          </div>

          {!hasOpenCashShift && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <FiInfo className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                No hay un Turno de Caja abierto. Puedes ingresar con pago{" "}
                <strong>S/ 0.00</strong> o abrir caja primero para cobrar.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <Label htmlFor="initialPayment">Monto a cobrar (S/)</Label>
              <Input
                id="initialPayment"
                type="number"
                step="0.01"
                min="0"
                value={initialPayment}
                onChange={(e) => {
                  setInitialPayment(e.target.value);
                  if (errors.initialPayment) {
                    setErrors((p) => ({ ...p, initialPayment: "" }));
                  }
                }}
                error={errors.initialPayment}
                className="mt-1 font-mono font-semibold"
              />
            </div>

            <div>
              <Label htmlFor="paymentMethod">Método de pago</Label>
              <div className="mt-1">
                <Select
                  id="paymentMethod"
                  value={paymentMethod}
                  onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
                  options={PAYMENT_METHOD_OPTIONS}
                  searchable={false}
                  disabled={numericInitialPayment <= 0}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="paymentReference">N° Operación (opc.)</Label>
              <Input
                id="paymentReference"
                type="text"
                placeholder="Ej: Yape 456789"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                disabled={numericInitialPayment <= 0}
                className="mt-1"
              />
            </div>
          </div>
          <p className="text-[11px] text-text-tertiary">
            Se emitirá constancia interna de abono. La Boleta o Factura final se
            emite en Check-Out.
          </p>
        </div>

        {/* Notas */}
        <div>
          <Label htmlFor="stayNotes">Observaciones de ingreso (opcional)</Label>
          <Textarea
            id="stayNotes"
            rows={2}
            placeholder="Ej: Se entregó llave y control de TV, vehículo placa ABC-123..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            error={errors.notes}
            className="mt-1"
          />
        </div>
      </form>
    </Modal>
  );
}
