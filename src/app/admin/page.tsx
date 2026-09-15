"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  FiCheckCircle,
  FiUserCheck,
  FiCalendar,
  FiDollarSign,
  FiGlobe,
  FiX,
  FiPlus,
  FiSearch,
  FiCoffee,
  FiLogOut,
  FiTrash2,
} from "react-icons/fi";
import { MdCleaningServices } from "react-icons/md";

// Interface para las habitaciones alineada con el schema y la demo
export interface RoomData {
  number: string;
  floor: number;
  type: string;
  price: number;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "CLEANING" | "MAINTENANCE";
  statusText: string;
  badgeClass: string;
  guest: string;
  docNumber?: string;
  nights?: number;
  paymentMethod?: string;
  consumptions?: { id: string; name: string; price: number }[];
  origin?: "WALK_IN" | "WEB";
}

export default function AdminDashboardPage() {
  // Estado de caja
  const [cashBalance, setCashBalance] = useState<number>(480.0);

  // Lista interactiva de habitaciones (datos iniciales basados en demo-ui)
  const [rooms, setRooms] = useState<RoomData[]>([
    {
      number: "101",
      floor: 1,
      type: "Matrimonial",
      price: 90,
      status: "AVAILABLE",
      statusText: "Disponible",
      badgeClass:
        "bg-room-available-bg text-room-available-text border-room-available-border",
      guest: "Libre",
      consumptions: [],
    },
    {
      number: "102",
      floor: 1,
      type: "Simple",
      price: 60,
      status: "OCCUPIED",
      statusText: "Ocupada",
      badgeClass:
        "bg-room-occupied-bg text-room-occupied-text border-room-occupied-border",
      guest: "Carlos Mendoza (Hasta 12:00)",
      docNumber: "45892147",
      nights: 1,
      paymentMethod: "Efectivo",
      consumptions: [
        { id: "c1", name: "Agua Mineral 500ml", price: 3.0 },
        { id: "c2", name: "Coca Cola 500ml", price: 5.0 },
      ],
      origin: "WALK_IN",
    },
    {
      number: "201",
      floor: 2,
      type: "Suite VIP Party",
      price: 180,
      status: "RESERVED",
      statusText: "Reservada",
      badgeClass:
        "bg-room-reserved-bg text-room-reserved-text border-room-reserved-border",
      guest: "María Vargas (Llega 15:00)",
      docNumber: "72910482",
      nights: 2,
      paymentMethod: "Yape (Online)",
      consumptions: [],
      origin: "WEB",
    },
    {
      number: "202",
      floor: 2,
      type: "Doble Twin",
      price: 110,
      status: "CLEANING",
      statusText: "En Limpieza",
      badgeClass:
        "bg-room-cleaning-bg text-room-cleaning-text border-room-cleaning-border",
      guest: "Pendiente de aseo",
      consumptions: [],
    },
    {
      number: "301",
      floor: 3,
      type: "Suite Jacuzzi",
      price: 220,
      status: "MAINTENANCE",
      statusText: "Mantenimiento",
      badgeClass:
        "bg-room-maintenance-bg text-room-maintenance-text border-room-maintenance-border",
      guest: "Fuga de caño / En reparación",
      consumptions: [],
    },
    {
      number: "302",
      floor: 3,
      type: "Matrimonial",
      price: 90,
      status: "AVAILABLE",
      statusText: "Disponible",
      badgeClass:
        "bg-room-available-bg text-room-available-text border-room-available-border",
      guest: "Libre",
      consumptions: [],
    },
  ]);

  // Filtros
  const [selectedFloor, setSelectedFloor] = useState<number | "ALL">("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Control de Modales
  const [activeModal, setActiveModal] = useState<
    "CHECK_IN" | "OCCUPIED_DETAIL" | "CLEANING" | "RESERVED" | null
  >(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);

  // Form State para Check-In
  const [formDoc, setFormDoc] = useState<string>("");
  const [formGuest, setFormGuest] = useState<string>("");
  const [formNights, setFormNights] = useState<number>(1);
  const [formPaymentMethod, setFormPaymentMethod] =
    useState<string>("Efectivo (CASH)");

  // Métricas calculadas en vivo
  const totalAvailable = rooms.filter((r) => r.status === "AVAILABLE").length;
  const totalOccupied = rooms.filter((r) => r.status === "OCCUPIED").length;
  const totalReserved = rooms.filter((r) => r.status === "RESERVED").length;
  const totalCleaning = rooms.filter((r) => r.status === "CLEANING").length;

  // Filtrado de cuartos
  const filteredRooms = rooms.filter((room) => {
    const matchFloor = selectedFloor === "ALL" || room.floor === selectedFloor;
    const matchStatus =
      selectedStatus === "ALL" || room.status === selectedStatus;
    const matchQuery =
      room.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.guest.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchFloor && matchStatus && matchQuery;
  });

  // Abrir modal según estado de la habitación
  const handleRoomClick = (room: RoomData) => {
    setSelectedRoom(room);
    if (room.status === "AVAILABLE") {
      setFormDoc("");
      setFormGuest("");
      setFormNights(1);
      setFormPaymentMethod("Efectivo (CASH)");
      setActiveModal("CHECK_IN");
    } else if (room.status === "OCCUPIED") {
      setActiveModal("OCCUPIED_DETAIL");
    } else if (room.status === "CLEANING") {
      setActiveModal("CLEANING");
    } else if (room.status === "RESERVED") {
      setActiveModal("RESERVED");
    } else {
      toast.info(`Habitación ${room.number}`, {
        description: "En mantenimiento. Personal técnico notificado.",
      });
    }
  };

  // 1. Confirmar Check-In
  const handleConfirmCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    if (!formGuest.trim()) {
      toast.error("Por favor ingresa el nombre del huésped");
      return;
    }

    const totalToPay = selectedRoom.price * formNights;

    setRooms((prev) =>
      prev.map((r) =>
        r.number === selectedRoom.number
          ? {
              ...r,
              status: "OCCUPIED",
              statusText: "Ocupada",
              badgeClass:
                "bg-room-occupied-bg text-room-occupied-text border-room-occupied-border",
              guest: `${formGuest} (${formNights} noche${formNights > 1 ? "s" : ""})`,
              docNumber: formDoc || "S/D",
              nights: formNights,
              paymentMethod: formPaymentMethod,
              consumptions: [],
              origin: "WALK_IN",
            }
          : r,
      ),
    );

    setCashBalance((prev) => prev + totalToPay);
    toast.success(`¡Habitación ${selectedRoom.number} alquilada con éxito!`, {
      description: `Huésped: ${formGuest} • Cobrado: S/ ${totalToPay}.00 (${formPaymentMethod})`,
    });

    setActiveModal(null);
    setSelectedRoom(null);
  };

  // 2. Agregar consumo extra a habitación ocupada
  const handleAddConsumption = (productName: string, price: number) => {
    if (!selectedRoom) return;

    const newConsumption = {
      id: Date.now().toString(),
      name: productName,
      price,
    };

    setRooms((prev) =>
      prev.map((r) =>
        r.number === selectedRoom.number
          ? {
              ...r,
              consumptions: [...(r.consumptions || []), newConsumption],
            }
          : r,
      ),
    );

    setSelectedRoom((prev) =>
      prev
        ? {
            ...prev,
            consumptions: [...(prev.consumptions || []), newConsumption],
          }
        : null,
    );

    toast.success(`Consumo agregado a Hab. ${selectedRoom.number}`, {
      description: `${productName} (+S/ ${price.toFixed(2)})`,
    });
  };

  // 3. Confirmar Check-Out y pasar a Limpieza
  const handleConfirmCheckOut = () => {
    if (!selectedRoom) return;

    const consumptionsTotal = (selectedRoom.consumptions || []).reduce(
      (acc, c) => acc + c.price,
      0,
    );

    setRooms((prev) =>
      prev.map((r) =>
        r.number === selectedRoom.number
          ? {
              ...r,
              status: "CLEANING",
              statusText: "En Limpieza",
              badgeClass:
                "bg-room-cleaning-bg text-room-cleaning-text border-room-cleaning-border",
              guest: "Pendiente de aseo",
              consumptions: [],
            }
          : r,
      ),
    );

    if (consumptionsTotal > 0) {
      setCashBalance((prev) => prev + consumptionsTotal);
    }

    toast.success(`Check-Out realizado en Hab. ${selectedRoom.number}`, {
      description: `Estadía finalizada. La habitación pasó a estado de Limpieza. Consumos extras liquidados: S/ ${consumptionsTotal.toFixed(2)}.`,
    });

    setActiveModal(null);
    setSelectedRoom(null);
  };

  // 4. Marcar habitación limpia y disponible
  const handleFinishCleaning = (roomNumber: string) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.number === roomNumber
          ? {
              ...r,
              status: "AVAILABLE",
              statusText: "Disponible",
              badgeClass:
                "bg-room-available-bg text-room-available-text border-room-available-border",
              guest: "Libre",
            }
          : r,
      ),
    );

    toast.success(`Habitación ${roomNumber} limpia y desinfectada`, {
      description: "Lista y disponible para nuevos alquileres.",
    });

    setActiveModal(null);
    setSelectedRoom(null);
  };

  // 5. Convertir Reserva Web a Check-in directo
  const handleConvertReservationToCheckIn = () => {
    if (!selectedRoom) return;

    setRooms((prev) =>
      prev.map((r) =>
        r.number === selectedRoom.number
          ? {
              ...r,
              status: "OCCUPIED",
              statusText: "Ocupada",
              badgeClass:
                "bg-room-occupied-bg text-room-occupied-text border-room-occupied-border",
              guest: `${selectedRoom.guest.replace(" (Llega 15:00)", "")} (Huésped en casa)`,
            }
          : r,
      ),
    );

    toast.success(`Check-in de Reserva Web completado`, {
      description: `El huésped ingresó a la Habitación ${selectedRoom.number}.`,
    });

    setActiveModal(null);
    setSelectedRoom(null);
  };

  return (
    <div className="space-y-6">
      {/* Banner Superior de Reserva Web Pendiente */}
      <div className="bg-bg-card border border-border-default rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center shrink-0">
            <FiGlobe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-text-primary">
                Portal de Reservas Web Activo
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-room-reserved-bg text-room-reserved-text border border-room-reserved-border">
                1 Reserva por llegar hoy
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Los clientes pueden reservar desde el portal público. Próxima
              llegada: María Vargas (Suite VIP Party 201).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => {
              const resRoom = rooms.find((r) => r.number === "201");
              if (resRoom) handleRoomClick(resRoom);
            }}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 transition cursor-pointer"
          >
            Ver Reserva Web
          </button>
        </div>
      </div>

      {/* SECCIÓN: 4 Métricas Rápidas (KPIs) con los estilos exactos de demo-ui */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Disponibles */}
        <div
          onClick={() =>
            setSelectedStatus(
              selectedStatus === "AVAILABLE" ? "ALL" : "AVAILABLE",
            )
          }
          className={`bg-bg-card p-5 rounded-xl border transition shadow-xs cursor-pointer ${
            selectedStatus === "AVAILABLE"
              ? "border-emerald-500 ring-2 ring-emerald-100"
              : "border-border-default hover:border-emerald-300"
          }`}
        >
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Disponibles
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-room-available-text">
              {totalAvailable}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-room-available-bg text-room-available-text border border-room-available-border">
              Libres
            </span>
          </div>
        </div>

        {/* Ocupadas */}
        <div
          onClick={() =>
            setSelectedStatus(
              selectedStatus === "OCCUPIED" ? "ALL" : "OCCUPIED",
            )
          }
          className={`bg-bg-card p-5 rounded-xl border transition shadow-xs cursor-pointer ${
            selectedStatus === "OCCUPIED"
              ? "border-rose-500 ring-2 ring-rose-100"
              : "border-border-default hover:border-rose-300"
          }`}
        >
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Ocupadas
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-room-occupied-text">
              {totalOccupied}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-room-occupied-bg text-room-occupied-text border border-room-occupied-border">
              En Estadía
            </span>
          </div>
        </div>

        {/* Reservas Hoy */}
        <div
          onClick={() =>
            setSelectedStatus(
              selectedStatus === "RESERVED" ? "ALL" : "RESERVED",
            )
          }
          className={`bg-bg-card p-5 rounded-xl border transition shadow-xs cursor-pointer ${
            selectedStatus === "RESERVED"
              ? "border-amber-500 ring-2 ring-amber-100"
              : "border-border-default hover:border-amber-300"
          }`}
        >
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Reservas Hoy
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-room-reserved-text">
              {totalReserved}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-room-reserved-bg text-room-reserved-text border border-room-reserved-border">
              Por llegar
            </span>
          </div>
        </div>

        {/* Caja Actual */}
        <div
          onClick={() =>
            toast.info("Turno de Caja Mañana", {
              description: `Saldo en efectivo acumulado: S/ ${cashBalance.toFixed(2)}`,
            })
          }
          className="bg-bg-card p-5 rounded-xl border border-border-default shadow-xs cursor-pointer hover:border-brand-300 transition"
        >
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Caja Actual
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-brand-700">
              S/ {cashBalance.toFixed(2)}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
              Turno Abierto
            </span>
          </div>
        </div>
      </div>

      {/* SECCIÓN: Rack de Habitaciones en Vivo */}
      <section className="bg-bg-card p-6 rounded-xl border border-border-default shadow-xs space-y-4">
        {/* Barra de Filtros y Leyenda */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-border-default">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Rack de Habitaciones en Vivo
            </h2>
            <p className="text-xs text-text-secondary">
              Selecciona cualquier habitación para realizar Check-in directo,
              cargar consumos o liquidar Check-out.
            </p>
          </div>

          {/* Leyenda de estados */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-room-available-text"></span>
              Disponible
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-room-occupied-text"></span>
              Ocupada
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-room-reserved-text"></span>
              Reservada
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-room-cleaning-text"></span>
              Limpieza
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-room-maintenance-text"></span>
              Mantenimiento
            </span>
          </div>
        </div>

        {/* Barra de control: Buscador y Filtro de Pisos */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Buscador de Habitación o Huésped */}
          <div className="relative w-full sm:w-72">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por número o huésped..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-bg-card border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
            />
          </div>

          {/* Botones de Piso */}
          <div className="flex items-center gap-1 bg-bg-surface p-1 rounded-lg border border-border-default self-start sm:self-auto">
            {(["ALL", 1, 2, 3] as const).map((floor) => (
              <button
                key={floor}
                onClick={() => setSelectedFloor(floor)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer ${
                  selectedFloor === floor
                    ? "bg-bg-card text-brand-600 font-semibold shadow-2xs"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {floor === "ALL" ? "Todos" : `Piso ${floor}`}
              </button>
            ))}
          </div>
        </div>

        {/* Cuadrícula de Habitaciones: Diseño exacto de demo-ui */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredRooms.map((room) => (
            <div
              key={room.number}
              onClick={() => handleRoomClick(room)}
              className="p-4 rounded-xl border border-border-default hover:border-brand-400 hover:shadow-md transition bg-bg-surface flex flex-col justify-between space-y-3 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-2xl font-black text-text-primary">
                    Hab. {room.number}
                  </span>
                  <p className="text-xs text-text-secondary">
                    {room.type} · S/ {room.price}/noche
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${room.badgeClass}`}
                >
                  {room.statusText}
                </span>
              </div>

              <div className="pt-2 border-t border-border-default text-xs text-text-secondary flex justify-between items-center">
                <span className="truncate max-w-42.5 font-medium text-text-primary">
                  {room.guest}
                </span>
                <span className="text-brand-600 font-semibold hover:underline">
                  Gestionar →
                </span>
              </div>
            </div>
          ))}
        </div>

        {filteredRooms.length === 0 && (
          <div className="py-12 text-center text-text-tertiary text-xs">
            No se encontraron habitaciones con los filtros aplicados.
          </div>
        )}
      </section>

      {/* ========================================================
          MODAL 1: CHECK-IN RÁPIDO (Habitación Disponible)
          ======================================================== */}
      {activeModal === "CHECK_IN" && selectedRoom && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-card w-full max-w-lg rounded-2xl border border-border-default shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border-default flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  Nuevo Alquiler · Habitación {selectedRoom.number}
                </h3>
                <p className="text-xs text-text-secondary">
                  {selectedRoom.type} — Tarifa: S/ {selectedRoom.price}.00 por
                  noche
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-text-tertiary hover:text-text-primary rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmCheckIn} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    DNI / Documento
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 72345678"
                    value={formDoc}
                    onChange={(e) => setFormDoc(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-bg-card border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Noches de Estadía
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={formNights}
                    onChange={(e) => setFormNights(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm bg-bg-card border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Nombre Completo del Huésped
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez Morales"
                  value={formGuest}
                  onChange={(e) => setFormGuest(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-bg-card border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Método de Pago
                </label>
                <select
                  value={formPaymentMethod}
                  onChange={(e) => setFormPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-bg-card border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
                >
                  <option>Efectivo (CASH)</option>
                  <option>Yape</option>
                  <option>Plin</option>
                  <option>Tarjeta Crédito/Débito</option>
                </select>
              </div>

              {/* Resumen de cobro */}
              <div className="p-3.5 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-900">
                  Total a Cobrar:
                </span>
                <span className="text-xl font-bold text-brand-700">
                  S/ {(selectedRoom.price * formNights).toFixed(2)}
                </span>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary bg-bg-card border border-border-default rounded-lg shadow-2xs hover:bg-bg-surface transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-text-on-accent bg-brand-600 hover:bg-brand-700 rounded-lg shadow-2xs transition cursor-pointer"
                >
                  Confirmar Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: GESTIÓN DE HABITACIÓN OCUPADA (Consumos / Check-out)
          ======================================================== */}
      {activeModal === "OCCUPIED_DETAIL" && selectedRoom && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-card w-full max-w-lg rounded-2xl border border-border-default shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-bg-surface">
              <div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-room-occupied-bg text-room-occupied-text border border-room-occupied-border">
                  Ocupada
                </span>
                <h3 className="text-lg font-bold text-text-primary mt-1">
                  Habitación {selectedRoom.number} · {selectedRoom.type}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-text-tertiary hover:text-text-primary rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-5">
              {/* Info Huésped */}
              <div className="p-3 rounded-lg bg-bg-surface border border-border-default text-xs space-y-1">
                <p className="text-text-secondary">
                  Huésped:{" "}
                  <strong className="text-text-primary">
                    {selectedRoom.guest}
                  </strong>
                </p>
                <p className="text-text-secondary">
                  Documento:{" "}
                  <strong className="text-text-primary">
                    {selectedRoom.docNumber || "S/D"}
                  </strong>
                </p>
                <p className="text-text-secondary">
                  Origen:{" "}
                  <strong className="text-text-primary">
                    {selectedRoom.origin || "Recepción"}
                  </strong>
                </p>
              </div>

              {/* Consumos Minibar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                    Consumos Extras / Minibar
                  </h4>
                  <span className="text-xs text-text-tertiary">
                    {selectedRoom.consumptions?.length || 0} productos
                  </span>
                </div>

                {/* Lista de consumos */}
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {(selectedRoom.consumptions || []).length === 0 ? (
                    <p className="text-xs text-text-tertiary italic">
                      Sin consumos cargados todavía.
                    </p>
                  ) : (
                    selectedRoom.consumptions?.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-bg-surface border border-border-default text-xs"
                      >
                        <span className="text-text-primary font-medium">
                          {c.name}
                        </span>
                        <span className="text-brand-700 font-bold">
                          S/ {c.price.toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Acciones rápidas para agregar consumos */}
                <div className="pt-2">
                  <p className="text-[11px] font-semibold text-text-secondary mb-1.5">
                    + Cargar producto rápido:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleAddConsumption("Agua Mineral 500ml", 3.0)
                      }
                      className="px-2.5 py-1 text-xs rounded-lg bg-bg-card border border-border-default hover:border-brand-400 text-text-primary transition cursor-pointer"
                    >
                      + Agua (S/ 3.00)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleAddConsumption("Gaseosa Coca-Cola 500ml", 5.0)
                      }
                      className="px-2.5 py-1 text-xs rounded-lg bg-bg-card border border-border-default hover:border-brand-400 text-text-primary transition cursor-pointer"
                    >
                      + Coca Cola (S/ 5.00)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleAddConsumption("Snack / Piqueo", 4.0)
                      }
                      className="px-2.5 py-1 text-xs rounded-lg bg-bg-card border border-border-default hover:border-brand-400 text-text-primary transition cursor-pointer"
                    >
                      + Snack (S/ 4.00)
                    </button>
                  </div>
                </div>
              </div>

              {/* Botón de Check-Out */}
              <div className="pt-3 border-t border-border-default flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-xs font-medium text-text-secondary bg-bg-card border border-border-default rounded-lg hover:bg-bg-surface transition cursor-pointer"
                >
                  Cerrar Ventana
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCheckOut}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-danger-bg hover:bg-red-100 text-danger-text border border-danger-border transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <FiLogOut className="w-3.5 h-3.5" />
                  <span>Finalizar Estadía (Check-Out)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: LIMPIEZA DE HABITACIÓN
          ======================================================== */}
      {activeModal === "CLEANING" && selectedRoom && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-card w-full max-w-md rounded-2xl border border-border-default shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-room-cleaning-bg text-room-cleaning-text border border-room-cleaning-border flex items-center justify-center mx-auto">
              <MdCleaningServices className="w-6 h-6" />
            </div>

            <div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-room-cleaning-bg text-room-cleaning-text border border-room-cleaning-border">
                En Proceso de Limpieza
              </span>
              <h3 className="text-lg font-bold text-text-primary mt-2">
                Habitación {selectedRoom.number} ({selectedRoom.type})
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                El personal de limpieza está acondicionando la habitación.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-medium text-text-secondary bg-bg-card border border-border-default rounded-lg hover:bg-bg-surface transition cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => handleFinishCleaning(selectedRoom.number)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-success-bg text-success-text border border-success-border hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
              >
                ✓ Marcar como Limpia y Disponible
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: RESERVA WEB (Por Confirmar / Check-In)
          ======================================================== */}
      {activeModal === "RESERVED" && selectedRoom && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-bg-card w-full max-w-md rounded-2xl border border-border-default shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-room-reserved-bg text-room-reserved-text border border-room-reserved-border">
                  Reserva Web
                </span>
                <h3 className="text-lg font-bold text-text-primary mt-1">
                  Habitación {selectedRoom.number} · {selectedRoom.type}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-text-tertiary hover:text-text-primary rounded-lg"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-bg-surface border border-border-default text-xs space-y-2">
              <p className="text-text-secondary">
                Huésped:{" "}
                <strong className="text-text-primary">
                  {selectedRoom.guest}
                </strong>
              </p>
              <p className="text-text-secondary">
                DNI / Documento:{" "}
                <strong className="text-text-primary">
                  {selectedRoom.docNumber || "72910482"}
                </strong>
              </p>
              <p className="text-text-secondary">
                Canal de Reserva:{" "}
                <strong className="text-brand-700 font-semibold">
                  Web Pública (Online)
                </strong>
              </p>
              <p className="text-text-secondary">
                Tarifa pactada:{" "}
                <strong className="text-text-primary">
                  S/ {selectedRoom.price}.00 por noche
                </strong>
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-medium text-text-secondary bg-bg-card border border-border-default rounded-lg hover:bg-bg-surface transition cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleConvertReservationToCheckIn}
                className="px-4 py-2 text-xs font-semibold text-text-on-accent bg-brand-600 hover:bg-brand-700 rounded-lg shadow-2xs transition cursor-pointer"
              >
                Registrar Llegada (Check-In)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
