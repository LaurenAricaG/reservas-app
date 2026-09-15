"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
  FiMenu,
  FiChevronDown,
  FiLogOut,
  FiGlobe,
  FiBell,
  FiClock,
} from "react-icons/fi";
import { toast } from "sonner";
import { cn } from "@/utils/cn.utils";

interface HeaderProps {
  collapsed: boolean;
  onToggle: () => void;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  userPermissions?: string[];
}

export default function Header({
  collapsed,
  onToggle,
  userName = "Lauren Arica",
  userEmail = "admin@hotelparty.com",
  userRole = "Administrador",
}: HeaderProps) {
  const [greeting, setGreeting] = useState("¡Hola!");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Generar saludo con primer nombre
  useEffect(() => {
    const firstName = userName.split(" ")[0];
    setGreeting(`¡Hola, ${firstName}!`);
  }, [userName]);

  // Reloj digital en vivo
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("es-PE", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar menú al cambiar de ruta
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [pathname]);

  // Cerrar menú al hacer clic fuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Iniciales del usuario
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || "LA";
  };

  const initials = getInitials(userName);

  return (
    <header className="sticky top-0 right-0 w-full h-16 bg-bg-card border-b border-border-default z-40 flex items-center justify-between px-4 md:px-6 transition-all duration-300 ease-in-out shadow-xs">
      {/* Botón de Hamburguesa + Saludo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-colors cursor-pointer"
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          <FiMenu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-sm md:text-base font-bold text-text-primary leading-none tracking-tight">
            {greeting}
          </h1>
          <p className="text-[11px] text-text-tertiary hidden sm:block mt-0.5">
            Hotel Party PMS · Panel Operativo
          </p>
        </div>
      </div>

      {/* Acciones de la derecha */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Estado de Turno de Caja */}
        <div
          onClick={() =>
            toast.info("Turno de Caja Mañana", {
              description: "Turno abierto por Lauren Arica a las 08:00 hrs.",
            })
          }
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success-bg border border-success-border text-success-text text-xs font-semibold cursor-pointer shadow-2xs"
        >
          <span className="w-2 h-2 rounded-full bg-success-text animate-pulse"></span>
          <span>Turno Mañana: Abierto</span>
          <span className="font-bold ml-1">S/ 480.00</span>
        </div>

        {/* Reloj en vivo */}
        <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-text-secondary bg-bg-surface px-2.5 py-1.5 rounded-lg border border-border-default">
          <FiClock className="w-3.5 h-3.5 text-text-tertiary" />
          <span>{currentTime || "Cargando..."}</span>
        </div>

        {/* Notificaciones de reservas web */}
        <button
          type="button"
          onClick={() =>
            toast.info("Reservas Web", {
              description: "1 reserva web pendiente de confirmación hoy.",
            })
          }
          className="relative p-2 text-text-secondary hover:text-brand-600 hover:bg-bg-surface rounded-xl transition-colors cursor-pointer"
          title="Notificaciones"
        >
          <FiBell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full"></span>
        </button>

        {/* Perfil de Usuario Interactivo con Dropdown */}
        <div
          ref={dropdownRef}
          className="relative pl-3 border-l border-border-default"
        >
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
            aria-label="Menú de usuario"
            className={cn(
              "flex items-center gap-2.5 p-1 sm:p-1.5 -m-1 sm:-m-1.5 rounded-xl transition-all duration-200 cursor-pointer select-none group outline-none",
              "hover:bg-bg-surface",
              isDropdownOpen && "bg-bg-surface ring-2 ring-brand-100",
            )}
          >
            {/* Avatar */}
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 font-bold text-xs shadow-xs transition-transform group-hover:scale-105">
                {initials}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success-text ring-2 ring-bg-card" />
            </div>

            {/* Texto en Desktop */}
            <div className="hidden md:flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-text-primary group-hover:text-brand-600 transition-colors max-w-32.5 truncate">
                  {userName}
                </span>
                <FiChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-text-tertiary transition-transform duration-200",
                    isDropdownOpen && "rotate-180 text-brand-600",
                  )}
                />
              </div>
              <span className="text-[10px] font-medium text-text-secondary capitalize">
                {userRole || "Administrador"}
              </span>
            </div>
          </button>

          {/* Menú Desplegable */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-3 w-64 sm:w-72 bg-bg-card border border-border-default rounded-2xl shadow-xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Tarjeta de Información de Usuario */}
              <div className="p-3 bg-bg-surface rounded-xl border border-border-soft flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-text-primary truncate">
                    {userName}
                  </p>
                  {userEmail ? (
                    <p className="text-[11px] text-text-secondary truncate mt-0.5">
                      {userEmail}
                    </p>
                  ) : null}
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-brand-50 text-brand-700 border border-brand-200 uppercase tracking-wider">
                      {userRole}
                    </span>
                  </div>
                </div>
              </div>

              {/* Opciones del menú */}
              <div className="pt-2.5 space-y-2">
                {/* Botón Ver Portal Web Público */}
                <Link
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 shadow-2xs transition-all duration-200 cursor-pointer text-left"
                >
                  <FiGlobe className="w-4 h-4 text-brand-600 shrink-0" />
                  <span>Ver Portal Web de Reservas</span>
                </Link>

                {/* Botón de Cerrar Sesión */}
                <button
                  type="button"
                  onClick={() => {
                    toast.info("Cerrando sesión...");
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl w-full text-danger-text border border-danger-border hover:bg-danger-bg text-xs font-semibold transition-all duration-200 cursor-pointer text-left"
                >
                  <FiLogOut className="w-4 h-4 shrink-0" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
