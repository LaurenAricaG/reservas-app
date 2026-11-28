"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  FiLogOut,
  FiClock,
  FiAlertTriangle,
  FiDollarSign,
  FiKey,
} from "react-icons/fi";
import PageHeader from "../ui/PageHeader";
import { Pagination, SearchInput, Select, type SelectOption } from "../ui";
import TableCheckOut from "./TableCheckOut";
import CheckOutModal from "./CheckOutModal";
import ExtendStayModal from "./ExtendStayModal";
import StayDetailModal from "../stays/StayDetailModal";
import { getStayDetailAction } from "@/lib/stay";
import { hasPermission } from "@/utils/permissions.utils";
import type { SerializedStay } from "@/types/stays";

interface CheckOutManagementProps {
  initialStays: SerializedStay[];
  hasOpenCashShift: boolean;
  stats: {
    departuresToday: number;
    overdueDepartures: number;
    activeStays: number;
    pendingBalanceTotal: number;
  };
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  search: string;
  viewFilter: string;
  permissions: string[];
  userRole?: string | null;
}

export default function CheckOutManagement({
  initialStays,
  hasOpenCashShift,
  stats,
  totalItems,
  totalPages,
  currentPage,
  itemsPerPage,
  search,
  permissions,
  userRole,
}: CheckOutManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Modales
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [checkOutStay, setCheckOutStay] = useState<SerializedStay | null>(null);

  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extendStay, setExtendStay] = useState<SerializedStay | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailStay, setDetailStay] = useState<SerializedStay | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const canCheckOut = hasPermission(
    permissions,
    ["stays:checkout", "stays:update", "stays:manage"],
    userRole,
  );

  const currentView = searchParams.get("view") || "active";

  const viewOptions: SelectOption[] = [
    { value: "active", label: "Estadías activas" },
    { value: "today", label: "Salidas de hoy" },
    { value: "overdue", label: "Salidas vencidas" },
    { value: "completed", label: "Finalizadas (historial)" },
  ];

  const handleViewChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === "active") {
      params.delete("view");
    } else {
      params.set("view", val);
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
        title="Check-Out / Salidas"
        subtitle="Control de salidas del día, liquidación de cuentas, emisión de comprobante formal y liberación a limpieza."
        breadcrumbs={[
          { label: "admin", href: "/admin" },
          { label: "check-out" },
        ]}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-bg-card border border-border-default/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center shrink-0">
            <FiClock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-text-secondary">
              Salidas de Hoy
            </span>
            <p className="text-lg font-bold text-text-primary leading-tight">
              {stats.departuresToday}
            </p>
          </div>
        </div>

        <div className="bg-bg-card border border-border-default/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
            <FiAlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-text-secondary">
              Salidas Vencidas
            </span>
            <p className="text-lg font-bold text-text-primary leading-tight">
              {stats.overdueDepartures}
            </p>
          </div>
        </div>

        <div className="bg-bg-card border border-border-default/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
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

            <div className="w-full sm:w-56">
              <Select
                value={currentView}
                onValueChange={handleViewChange}
                options={viewOptions}
                searchable={false}
              />
            </div>
          </div>

          <div className="text-xs text-text-secondary select-none font-medium whitespace-nowrap self-start xl:self-center">
            Total: <span className="font-bold text-text-primary">{totalItems}</span>{" "}
            {totalItems === 1 ? "registro encontrado" : "registros encontrados"}
          </div>
        </div>

        {initialStays.length === 0 ? (
          <div className="p-12 text-center select-none bg-bg-card rounded-b-2xl">
            <FiLogOut className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
            <h3 className="text-sm font-bold text-text-primary">
              No hay salidas para mostrar
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
              {search
                ? `No hay estadías que coincidan con "${search}".`
                : currentView === "today"
                  ? "No hay salidas programadas para hoy."
                  : currentView === "overdue"
                    ? "Excelente: no hay salidas vencidas pendientes."
                    : currentView === "completed"
                      ? "Aún no se han completado Check-Outs."
                      : "No hay estadías activas en este momento."}
            </p>
          </div>
        ) : (
          <>
            <TableCheckOut
              stays={initialStays}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              canCheckOut={canCheckOut}
              onViewDetail={handleViewDetail}
              onExtendStay={(stay) => {
                setExtendStay(stay);
                setIsExtendModalOpen(true);
              }}
              onCheckOut={(stay) => {
                setCheckOutStay(stay);
                setIsCheckOutModalOpen(true);
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
      <CheckOutModal
        isOpen={isCheckOutModalOpen}
        onClose={() => {
          setIsCheckOutModalOpen(false);
          setCheckOutStay(null);
        }}
        stay={checkOutStay}
        hasOpenCashShift={hasOpenCashShift}
        onSuccess={() => router.refresh()}
      />

      <ExtendStayModal
        isOpen={isExtendModalOpen}
        onClose={() => {
          setIsExtendModalOpen(false);
          setExtendStay(null);
        }}
        stay={extendStay}
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
