"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Select,
  Label,
  Modal,
  Badge,
  Card,
} from "@/components/ui";
import {
  FiCheckCircle,
  FiUserCheck,
  FiClock,
  FiGlobe,
  FiSearch,
  FiLogOut,
  FiPlus,
  FiDollarSign,
  FiSmartphone,
  FiCreditCard,
} from "react-icons/fi";
import { MdCleaningServices } from "react-icons/md";

// Interface para las habitaciones alineada con el schema y la demo
export interface RoomData {
  number: string;
  floor: number;
  type: string;
  price: number;
  status: "available" | "occupied" | "reserved" | "cleaning" | "maintenance";
  statusText: string;
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
      status: "available",
      statusText: "Disponible",
      guest: "Libre",
      consumptions: [],
    },
    {
      number: "102",
      floor: 1,
      type: "Simple",
      price: 60,
      status: "occupied",
      statusText: "Ocupada",
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
      status: "reserved",
      statusText: "Reservada",
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
      status: "cleaning",
      statusText: "En Limpieza",
      guest: "Pendiente de aseo",
      consumptions: [],
    },
    {
      number: "301",
      floor: 3,
      type: "Suite Jacuzzi",
      price: 220,
      status: "maintenance",
      statusText: "Mantenimiento",
      guest: "Fuga de caño / En reparación",
      consumptions: [],
    },
    {
      number: "302",
      floor: 3,
      type: "Matrimonial",
      price: 90,
      status: "available",
      statusText: "Disponible",
      guest: "Libre",
      consumptions: [],
    },
  ]);

  // Filtros
  const [selectedFloor, setSelectedFloor] = useState<number | "ALL">("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Control de Modales (usando el componente <Modal /> reutilizable)
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

  const paymentMethodOptions = [
    {
      value: "Efectivo (CASH)",
      label: "Efectivo (CASH)",
      icon: FiDollarSign,
      description: "Cobro directo en caja recepción",
    },
    {
      value: "Yape",
      label: "Yape Móvil",
      icon: FiSmartphone,
      description: "Transferencia instantánea BCP",
    },
    {
      value: "Plin",
      label: "Plin",
      icon: FiSmartphone,
      description: "Transferencia BBVA / Interbank / Scotiabank",
    },
    {
      value: "Tarjeta Crédito/Débito",
      label: "Tarjeta Crédito / Débito",
      icon: FiCreditCard,
      description: "Terminal POS inalámbrico",
    },
  ];

  // Métricas calculadas en vivo
  const totalAvailable = rooms.filter((r) => r.status === "available").length;
  const totalOccupied = rooms.filter((r) => r.status === "occupied").length;
  const totalReserved = rooms.filter((r) => r.status === "reserved").length;

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
    if (room.status === "available") {
      setFormDoc("");
      setFormGuest("");
      setFormNights(1);
      setFormPaymentMethod("Efectivo (CASH)");
      setActiveModal("CHECK_IN");
    } else if (room.status === "occupied") {
      setActiveModal("OCCUPIED_DETAIL");
    } else if (room.status === "cleaning") {
      setActiveModal("CLEANING");
    } else if (room.status === "reserved") {
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
              status: "occupied",
              statusText: "Ocupada",
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
              status: "cleaning",
              statusText: "En Limpieza",
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
      description: `Estadía finalizada. La habitación pasó a Limpieza. Consumos extras liquidados: S/ ${consumptionsTotal.toFixed(2)}.`,
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
              status: "available",
              statusText: "Disponible",
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
              status: "occupied",
              statusText: "Ocupada",
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
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center shrink-0">
            <FiGlobe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-text-primary">
                Portal de Reservas Web Activo
              </h2>
              <Badge variant="reserved" size="sm">
                1 Reserva por llegar hoy
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Los clientes pueden reservar desde el portal público. Próxima
              llegada: María Vargas (Suite VIP Party 201).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            size="sm"
            variant="soft"
            onClick={() => {
              const resRoom = rooms.find((r) => r.number === "201");
              if (resRoom) handleRoomClick(resRoom);
            }}
          >
            Ver Reserva Web
          </Button>
        </div>
      </Card>

      {/* SECCIÓN: 4 Métricas Rápidas (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Disponibles */}
        <Card
          onClick={() =>
            setSelectedStatus(
              selectedStatus === "available" ? "ALL" : "available",
            )
          }
          className={`p-5 cursor-pointer transition ${
            selectedStatus === "available"
              ? "border-emerald-500 ring-2 ring-emerald-100"
              : "hover:border-emerald-300"
          }`}
        >
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Disponibles
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-room-available-text">
              {totalAvailable}
            </span>
            <Badge variant="available">Libres</Badge>
          </div>
        </Card>

        {/* Ocupadas */}
        <Card
          onClick={() =>
            setSelectedStatus(
              selectedStatus === "occupied" ? "ALL" : "occupied",
            )
          }
          className={`p-5 cursor-pointer transition ${
            selectedStatus === "occupied"
              ? "border-rose-500 ring-2 ring-rose-100"
              : "hover:border-rose-300"
          }`}
        >
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Ocupadas
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-room-occupied-text">
              {totalOccupied}
            </span>
            <Badge variant="occupied">En Estadía</Badge>
          </div>
        </Card>

        {/* Reservas Hoy */}
        <Card
          onClick={() =>
            setSelectedStatus(
              selectedStatus === "reserved" ? "ALL" : "reserved",
            )
          }
          className={`p-5 cursor-pointer transition ${
            selectedStatus === "reserved"
              ? "border-amber-500 ring-2 ring-amber-100"
              : "hover:border-amber-300"
          }`}
        >
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Reservas Hoy
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-room-reserved-text">
              {totalReserved}
            </span>
            <Badge variant="reserved">Por llegar</Badge>
          </div>
        </Card>

        {/* Caja Actual */}
        <Card
          onClick={() =>
            toast.info("Turno de Caja Mañana", {
              description: `Saldo en efectivo acumulado: S/ ${cashBalance.toFixed(2)}`,
            })
          }
          className="p-5 cursor-pointer hover:border-brand-300 transition"
        >
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Caja Actual
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-bold text-brand-700">
              S/ {cashBalance.toFixed(2)}
            </span>
            <Badge variant="brand">Turno Abierto</Badge>
          </div>
        </Card>
      </div>

      {/* SECCIÓN: Rack de Habitaciones en Vivo */}
      <Card className="p-6 space-y-4">
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

          {/* Leyenda de estados usando el componente Badge */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="available">Disponible</Badge>
            <Badge variant="occupied">Ocupada</Badge>
            <Badge variant="reserved">Reservada</Badge>
            <Badge variant="cleaning">Limpieza</Badge>
            <Badge variant="maintenance">Mantenimiento</Badge>
          </div>
        </div>

        {/* Barra de control: Buscador y Filtro de Pisos */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="relative w-full sm:w-72">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary w-4 h-4" />
            <Input
              placeholder="Buscar por número o huésped..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
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

        {/* Cuadrícula de Habitaciones */}
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
                <Badge variant={room.status}>{room.statusText}</Badge>
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
      </Card>

      {/* ========================================================
          MODAL 1: CHECK-IN RÁPIDO (Habitación Disponible)
          Utilizando el componente <Modal /> reutilizable
          ======================================================== */}
      <Modal
        isOpen={activeModal === "CHECK_IN" && !!selectedRoom}
        onClose={() => {
          setActiveModal(null);
          setSelectedRoom(null);
        }}
        size="md"
        title={`Nuevo Alquiler · Habitación ${selectedRoom?.number}`}
        subtitle={`${selectedRoom?.type} — Tarifa: S/ ${selectedRoom?.price}.00 por noche`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setActiveModal(null);
                setSelectedRoom(null);
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleConfirmCheckIn}>
              Confirmar Check-In
            </Button>
          </>
        }
      >
        <form onSubmit={handleConfirmCheckIn} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>DNI / Documento</Label>
              <Input
                required
                placeholder="Ej: 72345678"
                value={formDoc}
                onChange={(e) => setFormDoc(e.target.value)}
              />
            </div>

            <div>
              <Label required>Noches de Estadía</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={formNights}
                onChange={(e) => setFormNights(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <Label required>Nombre Completo del Huésped</Label>
            <Input
              required
              placeholder="Ej: Juan Pérez Morales"
              value={formGuest}
              onChange={(e) => setFormGuest(e.target.value)}
            />
          </div>

          <div>
            <Label>Método de Pago</Label>
            <Select
              options={paymentMethodOptions}
              value={formPaymentMethod}
              onChange={(e) => setFormPaymentMethod(e.target.value)}
            />
          </div>

          {/* Resumen de cobro */}
          <div className="p-3.5 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-900">
              Total a Cobrar:
            </span>
            <span className="text-xl font-bold text-brand-700">
              S/ {((selectedRoom?.price || 0) * formNights).toFixed(2)}
            </span>
          </div>
        </form>
      </Modal>

      {/* ========================================================
          MODAL 2: GESTIÓN DE HABITACIÓN OCUPADA (Consumos / Check-out)
          Utilizando el componente <Modal /> reutilizable
          ======================================================== */}
      <Modal
        isOpen={activeModal === "OCCUPIED_DETAIL" && !!selectedRoom}
        onClose={() => {
          setActiveModal(null);
          setSelectedRoom(null);
        }}
        size="md"
        title={`Habitación ${selectedRoom?.number} · ${selectedRoom?.type}`}
        subtitle={`Huésped: ${selectedRoom?.guest} (Doc: ${selectedRoom?.docNumber || "S/D"})`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setActiveModal(null);
                setSelectedRoom(null);
              }}
            >
              Cerrar
            </Button>
            <Button variant="danger" onClick={handleConfirmCheckOut}>
              <FiLogOut className="w-4 h-4" />
              <span>Finalizar Estadía (Check-Out)</span>
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Info Huésped */}
          <div className="p-3 rounded-lg bg-bg-surface border border-border-default text-xs space-y-1">
            <p className="text-text-secondary">
              Huésped:{" "}
              <strong className="text-text-primary">
                {selectedRoom?.guest}
              </strong>
            </p>
            <p className="text-text-secondary">
              Origen:{" "}
              <strong className="text-text-primary">
                {selectedRoom?.origin || "Recepción"}
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
                {selectedRoom?.consumptions?.length || 0} productos
              </span>
            </div>

            {/* Lista de consumos */}
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {(selectedRoom?.consumptions || []).length === 0 ? (
                <p className="text-xs text-text-tertiary italic">
                  Sin consumos cargados todavía.
                </p>
              ) : (
                selectedRoom?.consumptions?.map((c) => (
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleAddConsumption("Agua Mineral 500ml", 3.0)
                  }
                >
                  + Agua (S/ 3.00)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    handleAddConsumption("Gaseosa Coca-Cola 500ml", 5.0)
                  }
                >
                  + Coca Cola (S/ 5.00)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddConsumption("Snack / Piqueo", 4.0)}
                >
                  + Snack (S/ 4.00)
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ========================================================
          MODAL 3: LIMPIEZA DE HABITACIÓN
          Utilizando el componente <Modal /> reutilizable
          ======================================================== */}
      <Modal
        isOpen={activeModal === "CLEANING" && !!selectedRoom}
        onClose={() => {
          setActiveModal(null);
          setSelectedRoom(null);
        }}
        size="sm"
        title="Aseo y Desinfección"
        subtitle={`Habitación ${selectedRoom?.number} (${selectedRoom?.type})`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setActiveModal(null);
                setSelectedRoom(null);
              }}
            >
              Volver
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (selectedRoom) handleFinishCleaning(selectedRoom.number);
              }}
            >
              ✓ Marcar como Limpia
            </Button>
          </>
        }
      >
        <div className="text-center space-y-3 py-2">
          <div className="w-12 h-12 rounded-full bg-room-cleaning-bg text-room-cleaning-text border border-room-cleaning-border flex items-center justify-center mx-auto">
            <MdCleaningServices className="w-6 h-6" />
          </div>
          <p className="text-xs text-text-secondary">
            El personal de limpieza está acondicionando la habitación. Al
            marcarla como limpia, pasará automáticamente al estado{" "}
            <strong>Disponible</strong> para nuevos alquileres.
          </p>
        </div>
      </Modal>

      {/* ========================================================
          MODAL 4: RESERVA WEB (Por Confirmar / Check-In)
          Utilizando el componente <Modal /> reutilizable
          ======================================================== */}
      <Modal
        isOpen={activeModal === "RESERVED" && !!selectedRoom}
        onClose={() => {
          setActiveModal(null);
          setSelectedRoom(null);
        }}
        size="sm"
        title="Reserva Online"
        subtitle={`Habitación ${selectedRoom?.number} · ${selectedRoom?.type}`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setActiveModal(null);
                setSelectedRoom(null);
              }}
            >
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={handleConvertReservationToCheckIn}
            >
              Registrar Llegada (Check-In)
            </Button>
          </>
        }
      >
        <div className="p-3.5 rounded-xl bg-bg-surface border border-border-default text-xs space-y-2">
          <p className="text-text-secondary">
            Huésped:{" "}
            <strong className="text-text-primary">{selectedRoom?.guest}</strong>
          </p>
          <p className="text-text-secondary">
            DNI / Documento:{" "}
            <strong className="text-text-primary">
              {selectedRoom?.docNumber || "72910482"}
            </strong>
          </p>
          <p className="text-text-secondary">
            Canal:{" "}
            <strong className="text-brand-700 font-semibold">
              Web Pública (Online)
            </strong>
          </p>
          <p className="text-text-secondary">
            Tarifa:{" "}
            <strong className="text-text-primary">
              S/ {selectedRoom?.price}.00 por noche
            </strong>
          </p>
        </div>
      </Modal>
    </div>
  );
}
