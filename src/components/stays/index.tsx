"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  FiLogIn,
  FiHome,
  FiCalendar,
  FiDollarSign,
  FiKey,
} from "react-icons/fi";
import PageHeader from "../ui/PageHeader";
import {
  Pagination,
  SearchInput,
  Button,
  Select,
  type SelectOption,
} from "../ui";
import TableStays from "./TableStays";
import CheckInModal from "./CheckInModal";
import ExtraChargeModal from "./ExtraChargeModal";
import StayPaymentModal from "./StayPaymentModal";
import StayDetailModal from "./StayDetailModal";
import { getStayDetailAction } from "@/lib/stay";
import { hasPermission } from "@/utils/permissions.utils";
import type {
  SerializedPendingBookingOption,
  SerializedStay,
  SerializedStayGuestOption,
  SerializedStayProductOption,
  SerializedStayRoomOption,
} from "@/types/stays";

interface CheckInManagementProps {
  initialStays: SerializedStay[];
  availableRooms: SerializedStayRoomOption[];
  guests: SerializedStayGuestOption[];
  products: SerializedStayProductOption[];
  pendingBookings: SerializedPendingBookingOption[];
  hasOpenCashShift: boolean;
  stats: {
    activeStays: number;
    availableRooms: number;
    pendingBookings: number;
    pendingBalanceTotal: number;
    overall: number;
  };
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  search: string;
  statusFilter: string;
  permissions: string[];
  userRole?: string | null;
}

export default function CheckInManagement({
  initialStays,
  availableRooms,
  guests,
  products,
  pendingBookings,
  hasOpenCashShift,
  stats,
  totalItems,
  totalPages,
  currentPage,
  itemsPerPage,
  search,
  permissions,
  userRole,
}: CheckInManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Modales
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);

  const [isExtraModalOpen, setIsExtraModalOpen] = useState(false);
  const [extraStay, setExtraStay] = useState<SerializedStay | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentStay, setPaymentStay] = useState<SerializedStay | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailStay, setDetailStay] = useState<SerializedStay | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Permisos
  const canCheckIn = hasPermission(
    permissions,
    ["stays:checkin", "stays:create", "stays:manage"],
    userRole,
  );
  const canAddExtra = hasPermission(
    permissions,
    ["stays:add_extra", "stays:checkin", "stays:manage"],
    userRole,
  );
  const canRegisterPayment = hasPermission(
    permissions,
    ["stays:checkin", "stays:checkout", "stays:manage"],
    userRole,
  );

  // Filtro URL
  const currentStatus = searchParams.get("status") || "all";

  const statusOptions: SelectOption[] = [
    { value: "all", label: "Todos los estados" },
    { value: "ACTIVE", label: "Activas" },
    { value: "COMPLETED", label: "Finalizadas" },
    { value: "CANCELLED", label: "Anuladas" },
  ];

  const handleStatusChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === "all") {
      params.delete("status");
    } else {
      params.set("status", val);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleViewDetail = async (stay: SerializedStay) => {
    setDetailStay(stay);
    setIsDetailModalOpen(true);
    setIsDetailLoading(true);
    try {
      const res = await getStayDetailAction(stay.id);
      if (res.success && res.data) {
        setDetailStay(res.data);
      } else {
        toast.error(res.message || "No se pudo cargar el estado de cuenta.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error inesperado al cargar el estado de cuenta.");
    } finally {
      setIsDetailLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Check-In / Alquiler"
        subtitle="Registro de ingresos directos o desde reserva, control de habitaciones ocupadas y consumos extras."
        breadcrumbs={[
          { label: "admin", href: "/admin" },
          { label: "check-in" },
        ]}
        action={
          canCheckIn ? (
            <Button
              variant="primary"
              onClick={() => setIsCheckInModalOpen(true)}
              className="shadow-2xs font-semibold"
              disabled={availableRooms.length === 0}
            >
              <FiLogIn className="w-4 h-4" />
              <span>Nuevo Check-In</span>
            </Button>
          ) : null
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-bg-card border border-border-default/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center shrink-0">
            <FiKey className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-text-secondary">
              Estadías Activas
            </span>
            <p className="text-lg font-bold text-text-primary leading-tight">
              {stats.activeStays}
            </p>
          </div>
        </div>

        <div className="bg-bg-card border border-border-default/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <FiHome className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-text-secondary">
              Hab. Disponibles
            </span>
            <p className="text-lg font-bold text-text-primary leading-tight">
              {stats.availableRooms}
            </p>
          </div>
        </div>

        <div className="bg-bg-card border border-border-default/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <FiCalendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-text-secondary">
              Reservas por Ingresar
            </span>
            <p className="text-lg font-bold text-text-primary leading-tight">
              {stats.pendingBookings}
            </p>
          </div>
        </div>

        <div className="bg-bg-card border border-border-default/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-bg-surface border border-border-default text-text-secondary flex items-center justify-center shrink-0">
            <FiDollarSign className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-text-secondary">
              Saldo por Cobrar
            </span>
            <p className="text-lg font-bold font-mono text-text-primary leading-tight">
              S/ {stats.pendingBalanceTotal.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-bg-card border border-border-default/80 rounded-2xl shadow-xs">
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
                onValueChange={handleStatusChange}
                options={statusOptions}
                placeholder="Todos los estados"
                searchable={false}
              />
            </div>
          </div>

          <div className="text-xs text-text-secondary select-none font-medium whitespace-nowrap self-start xl:self-center">
            Total: <span className="font-bold text-text-primary">{totalItems}</span>{" "}
            {totalItems === 1 ? "estadía encontrada" : "estadías encontradas"}
          </div>
        </div>

        {initialStays.length === 0 ? (
          <div className="p-12 text-center select-none bg-bg-card rounded-b-2xl">
            <FiLogIn className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
            <h3 className="text-sm font-bold text-text-primary">
              {stats.overall === 0
                ? "No hay estadías registradas"
                : "No se encontraron estadías"}
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
              {stats.overall === 0
                ? "Registra el primer Check-In directo o desde una reserva existente para comenzar a gestionar habitaciones ocupadas y consumos."
                : search
                  ? `No hay estadías que coincidan con "${search}".`
                  : "Intenta cambiar el filtro de estado seleccionado."}
            </p>
          </div>
        ) : (
          <>
            <TableStays
              stays={initialStays}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              canAddExtra={canAddExtra}
              canRegisterPayment={canRegisterPayment}
              onViewDetail={handleViewDetail}
              onAddExtra={(stay) => {
                setExtraStay(stay);
                setIsExtraModalOpen(true);
              }}
              onRegisterPayment={(stay) => {
                setPaymentStay(stay);
                setIsPaymentModalOpen(true);
              }}
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
      <CheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        rooms={availableRooms}
        guests={guests}
        pendingBookings={pendingBookings}
        hasOpenCashShift={hasOpenCashShift}
        onSuccess={() => router.refresh()}
      />

      <ExtraChargeModal
        isOpen={isExtraModalOpen}
        onClose={() => {
          setIsExtraModalOpen(false);
          setExtraStay(null);
        }}
        stay={extraStay}
        products={products}
        onSuccess={() => router.refresh()}
      />

      <StayPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentStay(null);
        }}
        stay={paymentStay}
        hasOpenCashShift={hasOpenCashShift}
        onSuccess={() => router.refresh()}
      />

      <StayDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailStay(null);
        }}
        stay={detailStay}
        isLoading={isDetailLoading}
      />
    </div>
  );
}
