import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-12 px-4 text-center my-auto">
      <div className="w-full max-w-md rounded-2xl border border-border-default bg-bg-card p-8 sm:p-10 shadow-xs relative overflow-hidden">
        {/* Decorative subtle glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-100/40 rounded-full blur-3xl pointer-events-none" />

        {/* 404 Visual Number */}
        <div className="mx-auto mb-5 flex flex-col items-center">
          <span className="text-6xl sm:text-7xl font-black tracking-tight text-brand-600 select-none leading-none">
            404
          </span>
          <span className="mt-3 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200 select-none">
            Página no encontrada
          </span>
        </div>

        {/* Title and message */}
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
          Ruta no disponible
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed max-w-sm mx-auto">
          La sección a la que intentas acceder no existe en el panel o aún se encuentra en construcción.
        </p>

        {/* Action Button */}
        <div className="mt-7">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center gap-2 py-2.5 px-5 bg-brand-600 hover:bg-brand-700 text-text-on-accent rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <FiArrowLeft className="w-4 h-4" />
            <span>Regresar al Rack Principal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
