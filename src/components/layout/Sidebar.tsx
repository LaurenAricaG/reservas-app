"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/utils/cn.utils";
import {
  FiGrid,
  FiLogIn,
  FiLogOut,
  FiCalendar,
  FiDollarSign,
  FiShoppingBag,
  FiUsers,
  FiPieChart,
  FiShield,
  FiSettings,
  FiX,
  FiExternalLink,
} from "react-icons/fi";
import { MdOutlineMeetingRoom } from "react-icons/md";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
  userRole?: string;
  userPermissions?: string[];
}

export default function Sidebar({
  collapsed,
  mobileOpen,
  onClose,
  userPermissions = [],
}: SidebarProps) {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<{
    label: string;
    rect: DOMRect;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si la pantalla es móvil
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Limpiar tooltip si cambia el estado de colapsado
  useEffect(() => {
    setHoveredItem(null);
  }, [collapsed]);

  const isVisuallyCollapsed = collapsed && !isMobile;

  // Módulos del Hotel Party PMS
  const allNavItems = [
    {
      label: "Rack de Habitaciones",
      href: "/admin",
      icon: FiGrid,
      permission: "rooms:read",
    },
    {
      label: "Check-In / Alquiler",
      href: "/admin/check-in",
      icon: FiLogIn,
      permission: "stays:create",
    },
    {
      label: "Reservas",
      href: "/admin/reservas",
      icon: FiCalendar,
      permission: "bookings:read",
    },
    {
      label: "Check-Out / Salidas",
      href: "/admin/check-out",
      icon: FiLogOut,
      permission: "stays:update",
    },
    {
      label: "Turno de Caja",
      href: "/admin/caja",
      icon: FiDollarSign,
      permission: "cash:read",
    },
    {
      label: "Consumos / Minibar",
      href: "/admin/consumos",
      icon: FiShoppingBag,
      permission: "products:read",
    },
    {
      label: "Huéspedes",
      href: "/admin/huespedes",
      icon: FiUsers,
      permission: "guests:read",
    },
    {
      label: "Habitaciones & Pisos",
      href: "/admin/habitaciones",
      icon: MdOutlineMeetingRoom,
      permission: "rooms:manage",
    },
    {
      label: "Reportes & Cierre",
      href: "/admin/reportes",
      icon: FiPieChart,
      permission: "reports:read",
    },
    {
      label: "Usuarios & Permisos",
      href: "/admin/usuarios",
      icon: FiShield,
      permission: "users:read",
    },
    {
      label: "Configuración",
      href: "/admin/configuracion",
      icon: FiSettings,
      permission: "config:read",
    },
  ];

  // Si aún no hay permisos cargados (fase preview / admin general), mostramos todos los módulos
  const navItems =
    userPermissions.length > 0
      ? allNavItems.filter((item) => userPermissions.includes(item.permission))
      : allNavItems;

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 h-screen bg-bg-card border-r border-border-default transition-all duration-300 ease-in-out z-50 flex flex-col shadow-xs select-none",
        // Comportamiento móvil (Drawer)
        "w-64 -translate-x-full md:translate-x-0",
        mobileOpen && "translate-x-0",
        // Comportamiento escritorio
        collapsed ? "md:w-20" : "md:w-64",
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          "h-16 flex items-center border-b border-border-default shrink-0 px-4 transition-all duration-300",
          collapsed ? "md:justify-center md:px-0" : "justify-between",
        )}
      >
        <Link
          href="/admin"
          className={cn(
            "flex items-center gap-3 overflow-hidden",
            collapsed && "md:justify-center",
          )}
        >
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
            P
          </div>
          <div
            className={cn(
              "transition-all duration-300 overflow-hidden whitespace-nowrap",
              collapsed ? "md:max-w-0 md:opacity-0" : "max-w-40 opacity-100",
            )}
          >
            <h2 className="font-bold text-sm text-text-primary leading-tight">
              Hotel Party
            </h2>
            <span className="text-[10px] font-medium text-text-tertiary">
              Sistema Hotelero
            </span>
          </div>
        </Link>

        {/* Botón cerrar para drawer móvil */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 text-text-tertiary hover:text-text-primary rounded-lg"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>

      {/* Lista de Navegación */}
      <nav
        onScroll={() => setHoveredItem(null)}
        className={cn(
          "p-3 space-y-1 mt-2 flex-1 min-h-0 overflow-y-auto overflow-x-hidden",
          collapsed && "md:px-2",
        )}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              onMouseEnter={(e) => {
                if (isVisuallyCollapsed) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredItem({ label: item.label, rect });
                }
              }}
              onMouseLeave={() => setHoveredItem(null)}
              className={cn(
                "flex items-center transition-all duration-200 group relative rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
                collapsed
                  ? "w-full gap-3 px-3 py-2.5 md:w-11 md:h-11 md:justify-center md:mx-auto md:px-0 md:gap-0"
                  : "w-full gap-3 px-3 py-2.5",
                isActive
                  ? "bg-brand-50 text-brand-700 font-semibold shadow-2xs"
                  : "text-text-secondary hover:bg-bg-surface hover:text-text-primary",
              )}
              title={isVisuallyCollapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-transform duration-200 group-hover:scale-105 shrink-0",
                  isActive
                    ? "text-brand-600 font-bold"
                    : "text-text-tertiary group-hover:text-text-primary",
                )}
              />

              <span
                className={cn(
                  "text-xs font-medium tracking-normal transition-all duration-300 whitespace-nowrap overflow-hidden",
                  collapsed
                    ? "md:max-w-0 md:opacity-0 md:pointer-events-none"
                    : "max-w-48 opacity-100",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: Enlace a Web Pública y Cerrar Sesión */}
      <div
        className={cn(
          "p-3 border-t border-border-default space-y-2 bg-bg-surface/50 shrink-0",
          collapsed && "md:px-2",
        )}
      >
        {/* Botón Salir */}
        <button
          onClick={() => {
            toast.info("Cerrando sesión...");
            signOut({ callbackUrl: "/login" });
          }}
          onMouseEnter={(e) => {
            if (isVisuallyCollapsed) {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredItem({ label: "Cerrar Sesión", rect });
            }
          }}
          onMouseLeave={() => setHoveredItem(null)}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-xl w-full text-danger-text hover:bg-danger-bg transition-colors cursor-pointer",
            collapsed
              ? "md:w-11 md:h-11 md:justify-center md:mx-auto md:px-0"
              : "",
          )}
        >
          <FiLogOut className="w-4 h-4 shrink-0" />
          <span
            className={cn(
              "text-xs font-medium transition-all duration-300 whitespace-nowrap overflow-hidden",
              collapsed
                ? "md:max-w-0 md:opacity-0 md:pointer-events-none"
                : "max-w-48 opacity-100",
            )}
          >
            Cerrar Sesión
          </span>
        </button>
      </div>

      {/* Tooltip flotante en estado colapsado */}
      {isVisuallyCollapsed && hoveredItem && (
        <div
          className="fixed px-2.5 py-1.5 bg-text-primary text-bg-page text-xs font-semibold rounded-lg shadow-md z-50 pointer-events-none transition-all duration-200 whitespace-nowrap"
          style={{
            top: `${hoveredItem.rect.top + hoveredItem.rect.height / 2}px`,
            left: `${hoveredItem.rect.right + 12}px`,
            transform: "translateY(-50%)",
          }}
        >
          {hoveredItem.label}
        </div>
      )}
    </aside>
  );
}
