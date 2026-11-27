"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  FiPlus,
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiLogIn,
} from "react-icons/fi";
import PageHeader from "../ui/PageHeader";
import {
  Pagination,
  SearchInput,
  Button,
  ConfirmModal,
  Select,
  type SelectOption,
} from "../ui";
import TableBookings from "./TableBookings";
import BookingModal from "./BookingModal";
import DepositModal from "./DepositModal";
import BookingDetailModal from "./BookingDetailModal";
import CancelBookingModal from "./CancelBookingModal";
import {
  getBookingDetailAction,
  updateBookingStatusAction,
} from "@/lib/booking";
import { hasPermission } from "@/utils/permissions.utils";
import type {
  SerializedBooking,
  SerializedBookingGuestOption,
  SerializedBookingRoomOption,
} from "@/types/bookings";

interface BookingsProps {
  initialBookings: SerializedBooking[];
  rooms: SerializedBookingRoomOption[];
  guests: SerializedBookingGuestOption[];
  hasOpenCashShift: boolean;
  stats: {
    pending: number;
    confirmed: number;
    arrivalsToday: number;
    overall: number;
  };
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  search: string;
  statusFilter: string;
  originFilter: string;
  permissions: string[];
  userRole?: string | null;
}

export default function Bookings({
  initialBookings,
  rooms,
  guests,
  hasOpenCashShift,
  stats,
  totalItems,
  totalPages,
  currentPage,
  itemsPerPage,
  search,
  permissions,
  userRole,
}: BookingsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Modales
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] =
    useState<SerializedBooking | null>(null);

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositBooking, setDepositBooking] =
    useState<SerializedBooking | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailBooking, setDetailBooking] = useState<SerializedBooking | null>(
    null,
  );
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [isConfirmBookingOpen, setIsConfirmBookingOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<SerializedBooking | null>(
    null,
  );

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<SerializedBooking | null>(
    null,
  );
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Permisos
  const canCreate = hasPermission(
    permissions,
    ["bookings:create", "bookings:manage"],
    userRole,
  );
  const canUpdate = hasPermission(
    permissions,
    ["bookings:create", "bookings:update", "bookings:manage"],
    userRole,
  );
  const canCancel = hasPermission(
    permissions,
    ["bookings:cancel", "bookings:manage"],
    userRole,
  );

  // Filtros en URL
  const currentStatus = searchParams.get("status") || "all";
  const currentOrigin = searchParams.get("origin") || "all";

  const statusOptions: SelectOption[] = [
    { value: "all", label: "Todos los estados" },
    { value: "PENDING", label: "Pendientes" },
    { value: "CONFIRMED", label: "Confirmadas" },
    { value: "CHECKED_IN", label: "En estadía" },
    { value: "CANCELLED", label: "Canceladas" },
    { value: "NO_SHOW", label: "No se presentó" },
  ];

  const originOptions: SelectOption[] = [
    { value: "all", label: "Todos los orígenes" },
    { value: "RECEPTION", label: "Recepción" },
    { value: "WEB", label: "Web Pública" },
  ];

  const updateFilterParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleOpenCreate = () => {
    setSelectedBooking(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (booking: SerializedBooking) => {
    setSelectedBooking(booking);
    setIsFormModalOpen(true);
  };

  const handleOpenDeposit = (booking: SerializedBooking) => {
    setDepositBooking(booking);
    setIsDepositModalOpen(true);
  };

  const handleViewDetail = async (booking: SerializedBooking) => {
    setDetailBooking(booking);
    setIsDetailModalOpen(true);
    setIsDetailLoading(true);

    try {
      const res = await getBookingDetailAction(booking.id);
      if (res.success && res.data) {
        setDetailBooking(res.data);
      } else {
        toast.error(res.message || "No se pudo cargar el detalle.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error inesperado al cargar el detalle de la reserva.");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleOpenConfirmBooking = (booking: SerializedBooking) => {
    setConfirmTarget(booking);
    setIsConfirmBookingOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!confirmTarget) return;
    setIsActionLoading(true);
    try {
      const res = await updateBookingStatusAction({
        bookingId: confirmTarget.id,
        status: "CONFIRMED",
        reason: "Confirmación manual en recepción (sin adelanto)",
      });
      if (res.success) {
        toast.success(res.message);
        setIsConfirmBookingOpen(false);
        setConfirmTarget(null);
        router.refresh();
      } else {
        toast.error(res.message || "No se pudo confirmar la reserva.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Ocurrió un error inesperado al confirmar la reserva.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOpenCancel = (booking: SerializedBooking) => {
    setCancelTarget(booking);
    setIsCancelModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reservas"
        subtitle="Gestión de reservas de mostrador y web, disponibilidad por fechas y control de adelantos."
        breadcrumbs={[
          { label: "admin", href: "/admin" },
          { label: "reservas" },
        ]}
        action={
          canCreate ? (
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              className="shadow-2xs font-semibold"
            >
              <FiPlus className="w-4 h-4" />
              <span>Nueva Reserva</span>
            </Button>
          ) : null
        }
      />

      {/* Resumen KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-bg-card border border-border-default/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <FiClock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-text-secondary">
              Pendientes
            </span>
            <p className="text-lg font-bold text-text-primary leading-tight">
              {stats.pending}
            </p>
          </div>
        </div>

        <div className="bg-bg-card border border-border-default/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <FiCheckCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-text-secondary">
              Confirmadas
            </span>
            <p className="text-lg font-bold text-text-primary leading-tight">
              {stats.confirmed}
            </p>
          </div>
        </div>

        <div className="bg-bg-card border border-border-default/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center shrink-0">
            <FiLogIn className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-text-secondary">
              Llegadas de Hoy
            </span>
            <p className="text-lg font-bold text-text-primary leading-tight">
              {stats.arrivalsToday}
            </p>
          </div>
        </div>

        <div className="bg-bg-card border border-border-default/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-bg-surface border border-border-default text-text-secondary flex items-center justify-center shrink-0">
            <FiCalendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-text-secondary">
              Total Histórico
            </span>
            <p className="text-lg font-bold text-text-primary leading-tight">
              {stats.overall}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-bg-card border border-border-default/80 rounded-2xl shadow-xs">
        {/* Filters Bar */}
        <div className="px-6 py-4 border-b border-border-soft flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-bg-card justify-between rounded-t-2xl relative z-20">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="w-full sm:w-80">
              <SearchInput
                placeholder="Buscar por código, huésped, documento o hab..."
                className="max-w-none"
              />
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={currentStatus}
                onValueChange={(val) => updateFilterParam("status", val)}
                options={statusOptions}
                placeholder="Todos los estados"
                searchable={false}
              />
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={currentOrigin}
                onValueChange={(val) => updateFilterParam("origin", val)}
                options={originOptions}
                placeholder="Todos los orígenes"
                searchable={false}
              />
            </div>
          </div>

          <div className="text-xs text-text-secondary select-none font-medium whitespace-nowrap self-start xl:self-center">
            Total: <span className="font-bold text-text-primary">{totalItems}</span>{" "}
            {totalItems === 1 ? "reserva encontrada" : "reservas encontradas"}
          </div>
        </div>

        {/* Content / Empty State */}
        {initialBookings.length === 0 ? (
          <div className="p-12 text-center select-none bg-bg-card rounded-b-2xl">
            <FiCalendar className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
            <h3 className="text-sm font-bold text-text-primary">
              {stats.overall === 0
                ? "No hay reservas registradas"
                : "No se encontraron reservas"}
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
              {stats.overall === 0
                ? "Registra tu primera reserva seleccionando un huésped, una habitación disponible y las fechas de estancia."
                : search
                  ? `No hay reservas que coincidan con "${search}".`
                  : "Intenta cambiar los filtros de estado u origen seleccionados."}
            </p>
          </div>
        ) : (
          <>
            <TableBookings
              bookings={initialBookings}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              canUpdate={canUpdate}
              canCancel={canCancel}
              onViewDetail={handleViewDetail}
              onEdit={handleOpenEdit}
              onRegisterDeposit={handleOpenDeposit}
              onConfirmBooking={handleOpenConfirmBooking}
              onCancel={handleOpenCancel}
            />

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
            />
          </>
        )}
      </div>

      {/* MODALES */}
      <BookingModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
        rooms={rooms}
        guests={guests}
        hasOpenCashShift={hasOpenCashShift}
        onSuccess={() => router.refresh()}
      />

      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => {
          setIsDepositModalOpen(false);
          setDepositBooking(null);
        }}
        booking={depositBooking}
        hasOpenCashShift={hasOpenCashShift}
        onSuccess={() => router.refresh()}
      />

      <BookingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailBooking(null);
        }}
        booking={detailBooking}
        isLoading={isDetailLoading}
      />

      <ConfirmModal
        isOpen={isConfirmBookingOpen}
        onClose={() => {
          setIsConfirmBookingOpen(false);
          setConfirmTarget(null);
        }}
        onConfirm={handleConfirmBooking}
        title={`¿Confirmar la reserva ${confirmTarget?.code}?`}
        description={`La reserva de ${confirmTarget?.guestFullName} (Hab. ${confirmTarget?.roomNumber}) pasará a estado CONFIRMADA sin requerir adelanto previo.\n\nPodrás registrar pagos o adelantos después si el cliente decide abonar antes del Check-In.`}
        confirmText="Sí, confirmar reserva"
        cancelText="Volver"
        variant="success"
        isLoading={isActionLoading}
      />

      <CancelBookingModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setCancelTarget(null);
        }}
        booking={cancelTarget}
        hasOpenCashShift={hasOpenCashShift}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
