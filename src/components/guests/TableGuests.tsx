"use client";

import {
  FiEdit2,
  FiSlash,
  FiCheckCircle,
  FiUser,
  FiPhone,
  FiMail,
  FiMapPin,
  FiCalendar,
  FiBriefcase,
} from "react-icons/fi";
import ErrorBoundary from "@/components/error/ErrorBoundary";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import ButtonIcon from "@/components/ui/ButtonIcon";
import { SerializedGuest } from "@/types/guests";

interface TableGuestsProps {
  guests: SerializedGuest[];
  currentPage: number;
  itemsPerPage: number;
  canUpdate?: boolean;
  canDelete?: boolean;
  onEdit: (guest: SerializedGuest) => void;
  onDeactivate: (guest: SerializedGuest) => void;
  onRestore: (guest: SerializedGuest) => void;
}

const DOCUMENT_BADGE_MAP: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  DNI: {
    label: "DNI",
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
  },
  RUC: {
    label: "RUC",
    bg: "bg-purple-50 border-purple-200",
    text: "text-purple-700",
  },
  PASSPORT: {
    label: "PAS",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-700",
  },
  FOREIGNER_CARD: {
    label: "CE",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-700",
  },
  OTHER: {
    label: "OTRO",
    bg: "bg-slate-100 border-slate-200",
    text: "text-slate-700",
  },
};

export default function TableGuests({
  guests,
  currentPage,
  itemsPerPage,
  canUpdate = true,
  canDelete = true,
  onEdit,
  onDeactivate,
  onRestore,
}: TableGuestsProps) {
  return (
    <ErrorBoundary variant="embedded" title="Tabla de Huéspedes">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center w-16">Número</TableHead>
            <TableHead className="text-left w-44">Documento</TableHead>
            <TableHead className="text-left">Huésped / Cliente</TableHead>
            <TableHead className="text-left w-60">Contacto</TableHead>
            <TableHead className="text-left w-44">Procedencia</TableHead>
            <TableHead className="text-center w-28">Historial</TableHead>
            <TableHead className="text-center w-28">Estado</TableHead>
            <TableHead className="text-center w-36">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {guests.map((guest, index) => {
            const correlativeNumber =
              (currentPage - 1) * itemsPerPage + index + 1;
            const docStyle =
              DOCUMENT_BADGE_MAP[guest.documentType] ||
              DOCUMENT_BADGE_MAP.OTHER;

            return (
              <TableRow
                key={guest.id}
                className={!guest.isActive ? "bg-bg-surface/40 opacity-75" : ""}
              >
                {/* # Correlativo */}
                <TableCell className="text-center font-mono text-xs text-text-tertiary">
                  {correlativeNumber}
                </TableCell>

                {/* Documento */}
                <TableCell>
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${docStyle.bg} ${docStyle.text}`}
                    >
                      {docStyle.label}
                    </span>
                    <span className="font-semibold text-text-primary">
                      {guest.documentNumber}
                    </span>
                  </div>
                </TableCell>

                {/* Huésped */}
                <TableCell>
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-200/50 flex items-center justify-center shrink-0 mt-0.5 text-brand-700 font-bold text-xs">
                      {guest.firstName.charAt(0)}
                      {guest.lastName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary text-sm flex items-center gap-2">
                        <span>{guest.fullName}</span>
                      </div>
                      {guest.businessName ? (
                        <div className="flex items-center gap-1 text-xs text-brand-700 font-medium mt-0.5">
                          <FiBriefcase className="w-3 h-3 shrink-0" />
                          <span className="line-clamp-1">
                            {guest.businessName}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-text-tertiary mt-0.5">
                          <FiUser className="w-3 h-3 shrink-0" />
                          <span>Persona natural</span>
                        </div>
                      )}
                      {guest.notes && (
                        <p className="text-[11px] text-text-tertiary line-clamp-1 mt-0.5 italic">
                          {guest.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>

                {/* Contacto */}
                <TableCell>
                  <div className="flex flex-col gap-1 text-xs text-text-secondary">
                    {guest.phone ? (
                      <div className="flex items-center gap-1.5">
                        <FiPhone className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                        <span>{guest.phone}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-text-tertiary italic">
                        Sin teléfono
                      </span>
                    )}

                    {guest.email && (
                      <div className="flex items-center gap-1.5">
                        <FiMail className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                        <span className="truncate max-w-[45">
                          {guest.email}
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Procedencia */}
                <TableCell>
                  <div className="flex flex-col gap-0.5 text-xs text-text-secondary">
                    <div className="flex items-center gap-1 font-medium text-text-primary">
                      <FiMapPin className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                      <span>{guest.nationality || "Peruana"}</span>
                    </div>
                    {guest.originCity && (
                      <span className="text-[11px] text-text-tertiary pl-4.5">
                        {guest.originCity}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Historial */}
                <TableCell className="text-center">
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-bg-surface border border-border-default rounded-lg text-xs font-semibold text-text-secondary">
                    <FiCalendar className="w-3.5 h-3.5 text-brand-600" />
                    <span>{guest.totalStays} est.</span>
                  </div>
                </TableCell>

                {/* Estado */}
                <TableCell className="text-center">
                  <Badge variant={guest.isActive ? "available" : "danger"}>
                    {guest.isActive ? "● Activo" : "● Inactivo"}
                  </Badge>
                </TableCell>

                {/* Acciones */}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {/* Editar */}
                    {canUpdate && (
                      <ButtonIcon
                        onClick={() => onEdit(guest)}
                        variant="warning"
                        icon={FiEdit2}
                        title={`Editar datos de "${guest.fullName}"`}
                      />
                    )}

                    {/* Desactivar (si está activo) */}
                    {canDelete && guest.isActive && (
                      <ButtonIcon
                        onClick={() => onDeactivate(guest)}
                        variant="danger"
                        icon={FiSlash}
                        title={`Dar de baja al huésped "${guest.fullName}"`}
                      />
                    )}

                    {/* Habilitar / Restaurar (si está inactivo) */}
                    {canUpdate && !guest.isActive && (
                      <ButtonIcon
                        onClick={() => onRestore(guest)}
                        variant="success"
                        icon={FiCheckCircle}
                        title={`Habilitar al huésped "${guest.fullName}"`}
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </ErrorBoundary>
  );
}
