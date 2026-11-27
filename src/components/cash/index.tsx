"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  FiDollarSign,
  FiUnlock,
  FiLock,
  FiEye,
  FiClock,
  FiCreditCard,
  FiTrendingUp,
  FiInbox,
} from "react-icons/fi";
import PageHeader from "../ui/PageHeader";
import {
  Pagination,
  SearchInput,
  Button,
  Select,
  Badge,
  type SelectOption,
} from "../ui";
import TableCashShifts from "./TableCashShifts";
import OpenShiftModal from "./OpenShiftModal";
import CloseShiftModal from "./CloseShiftModal";
import ShiftDetailModal from "./ShiftDetailModal";
import { getCashShiftDetailAction } from "@/lib/cash";
import { hasPermission } from "@/utils/permissions.utils";
import type { SerializedCashShift } from "@/types/cash";

interface CashManagementProps {
  activeShift: SerializedCashShift | null;
  initialShifts: SerializedCashShift[];
  overallCount: number;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  search: string;
  statusFilter: string;
  permissions: string[];
  userRole?: string | null;
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function CashManagement({
  activeShift,
  initialShifts,
  overallCount,
  totalItems,
  totalPages,
  currentPage,
  itemsPerPage,
  search,
  permissions,
  userRole,
}: CashManagementProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Modales
  const [isOpenModalVisible, setIsOpenModalVisible] = useState(false);
  const [isCloseModalVisible, setIsCloseModalVisible] = useState(false);
  const [shiftToClose, setShiftToClose] = useState<SerializedCashShift | null>(
    null,
  );

  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [detailShift, setDetailShift] = useState<SerializedCashShift | null>(
    null,
  );
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Permisos
  const canOpen = hasPermission(
    permissions,
    ["cash:open", "cash:manage"],
    userRole,
  );
  const canClose = hasPermission(
    permissions,
    ["cash:close", "cash:manage"],
    userRole,
  );

  // Filtros URL
  const currentStatus = searchParams.get("status") || "all";

  const statusOptions: SelectOption[] = [
    { value: "all", label: "Todos los estados" },
    { value: "OPEN", label: "Abiertos" },
    { value: "CLOSED", label: "Cerrados" },
  ];

  const handleStatusChange = (newStatus: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newStatus === "all") {
      params.delete("status");
    } else {
      params.set("status", newStatus);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleOpenCloseModal = (shift: SerializedCashShift) => {
    setShiftToClose(shift);
    setIsCloseModalVisible(true);
  };

  const handleViewDetail = async (shift: SerializedCashShift) => {
    setDetailShift(shift);
    setIsDetailModalVisible(true);
    setIsDetailLoading(true);

    try {
      const res = await getCashShiftDetailAction(shift.id);
      if (res.success && res.data) {
        setDetailShift(res.data);
      } else {
        toast.error(res.message || "No se pudo cargar el detalle del turno.");
      }
    } catch (error) {
      console.error("Error al cargar detalle:", error);
      toast.error("Error inesperado al cargar el detalle del turno.");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const expectedActiveCash = activeShift
    ? activeShift.initialCash + activeShift.cashCollected
    : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Turno de Caja"
        subtitle="Apertura, control en tiempo real, arqueo físico y cierre de turnos de recepción."
        breadcrumbs={[
          { label: "admin", href: "/admin" },
          { label: "caja" },
        ]}
        action={
          activeShift ? (
            canClose ? (
              <Button
                variant="danger"
                onClick={() => handleOpenCloseModal(activeShift)}
                className="shadow-2xs font-semibold"
              >
                <FiLock className="w-4 h-4" />
                <span>Cerrar Turno #{activeShift.id}</span>
              </Button>
            ) : null
          ) : canOpen ? (
            <Button
              variant="primary"
              onClick={() => setIsOpenModalVisible(true)}
              className="shadow-2xs font-semibold"
            >
              <FiUnlock className="w-4 h-4" />
              <span>Abrir Turno de Caja</span>
            </Button>
          ) : null
        }
      />

      {/* PANEL DE TURNO ACTIVO */}
      {activeShift ? (
        <div className="bg-bg-card border border-brand-200/80 rounded-2xl shadow-xs p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-border-soft">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <FiDollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-text-primary">
                    Turno Activo #{activeShift.id}
                  </h2>
                  <Badge variant="available" size="sm">
                    ● En curso
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>
                    Responsable:{" "}
                    <strong className="text-text-primary">
                      {activeShift.userName}
                    </strong>
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <FiClock className="w-3 h-3 text-text-tertiary" />
                    Abierto el {formatDateTime(activeShift.openedAt)}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleViewDetail(activeShift)}
              >
                <FiEye className="w-3.5 h-3.5" />
                <span>Ver Movimientos ({activeShift.totalPaymentsCount})</span>
              </Button>
            </div>
          </div>

          {/* KPIs del turno abierto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-bg-surface/70 border border-border-soft">
              <span className="text-[11px] font-medium text-text-secondary">
                Saldo Inicial
              </span>
              <p className="font-mono font-bold text-lg text-text-primary mt-1">
                S/ {activeShift.initialCash.toFixed(2)}
              </p>
              <span className="text-[11px] text-text-tertiary">
                Fondo de apertura
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-bg-surface/70 border border-border-soft">
              <span className="text-[11px] font-medium text-text-secondary flex items-center gap-1">
                <FiTrendingUp className="w-3 h-3 text-emerald-600" />
                Cobros en Efectivo
              </span>
              <p className="font-mono font-bold text-lg text-emerald-700 mt-1">
                + S/ {activeShift.cashCollected.toFixed(2)}
              </p>
              <span className="text-[11px] text-text-tertiary">
                Ingresos al cajón físico
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-bg-surface/70 border border-border-soft">
              <span className="text-[11px] font-medium text-text-secondary flex items-center gap-1">
                <FiCreditCard className="w-3 h-3 text-brand-600" />
                Cobros Digitales
              </span>
              <p className="font-mono font-bold text-lg text-text-primary mt-1">
                S/ {activeShift.digitalCollected.toFixed(2)}
              </p>
              <span className="text-[11px] text-text-tertiary">
                Yape {activeShift.breakdown.YAPE.toFixed(2)} · Plin{" "}
                {activeShift.breakdown.PLIN.toFixed(2)} · Tarj{" "}
                {activeShift.breakdown.CARD.toFixed(2)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-brand-50 border border-brand-200">
              <span className="text-[11px] font-semibold text-brand-700">
                Efectivo Esperado en Caja
              </span>
              <p className="font-mono font-bold text-lg text-brand-700 mt-1">
                S/ {expectedActiveCash.toFixed(2)}
              </p>
              <span className="text-[11px] text-brand-600/80">
                Inicial + Efectivo cobrado
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-bg-card border border-dashed border-border-default rounded-2xl p-5 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <FiLock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">
              Caja cerrada — No hay un turno activo
            </h2>
            <p className="text-xs text-text-secondary mt-0.5 max-w-xl">
              Abre un turno de caja desde el botón superior declarando tu saldo
              inicial para poder registrar pagos de reservas, check-in y
              consumos durante tu jornada.
            </p>
          </div>
        </div>
      )}

      {/* HISTORIAL DE TURNOS */}
      <div className="bg-bg-card border border-border-default/80 rounded-2xl shadow-xs">
        {/* Filters Bar */}
        <div className="px-6 py-4 border-b border-border-soft flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-bg-card justify-between rounded-t-2xl relative z-20">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="w-full sm:w-80">
              <SearchInput
                placeholder="Buscar por recepcionista o nota..."
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
            {totalItems === 1 ? "turno encontrado" : "turnos encontrados"}
          </div>
        </div>

        {/* Content / Empty State */}
        {initialShifts.length === 0 ? (
          <div className="p-12 text-center select-none bg-bg-card rounded-b-2xl">
            <FiInbox className="w-10 h-10 text-text-tertiary mx-auto mb-3" />
            <h3 className="text-sm font-bold text-text-primary">
              {overallCount === 0
                ? "Aún no hay turnos de caja registrados"
                : "No se encontraron turnos"}
            </h3>
            <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
              {overallCount === 0
                ? "Abre el primer turno de caja para comenzar a llevar el control de ingresos y arqueos."
                : search
                  ? `No hay turnos que coincidan con "${search}".`
                  : "Intenta cambiar el filtro de estado seleccionado."}
            </p>
          </div>
        ) : (
          <>
            <TableCashShifts
              shifts={initialShifts}
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              onViewDetail={handleViewDetail}
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
      <OpenShiftModal
        isOpen={isOpenModalVisible}
        onClose={() => setIsOpenModalVisible(false)}
        onSuccess={() => router.refresh()}
      />

      <CloseShiftModal
        isOpen={isCloseModalVisible}
        onClose={() => {
          setIsCloseModalVisible(false);
          setShiftToClose(null);
        }}
        shift={shiftToClose}
        onSuccess={() => router.refresh()}
      />

      <ShiftDetailModal
        isOpen={isDetailModalVisible}
        onClose={() => {
          setIsDetailModalVisible(false);
          setDetailShift(null);
        }}
        shift={detailShift}
        isLoading={isDetailLoading}
      />
    </div>
  );
}
