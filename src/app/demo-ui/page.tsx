"use client";

import React, { useState } from "react";
import { toast } from "sonner";

export default function DemoUIPage() {
  const [inputText, setInputText] = useState("");

  const rooms = [
    {
      number: "101",
      type: "Matrimonial",
      price: "S/ 90",
      status: "AVAILABLE",
      statusText: "Disponible",
      badgeClass: "bg-room-available-bg text-room-available-text border-room-available-border",
      guest: "Libre",
    },
    {
      number: "102",
      type: "Simple",
      price: "S/ 60",
      status: "OCCUPIED",
      statusText: "Ocupada",
      badgeClass: "bg-room-occupied-bg text-room-occupied-text border-room-occupied-border",
      guest: "Carlos Mendoza (Hasta 12:00)",
    },
    {
      number: "201",
      type: "Suite VIP Party",
      price: "S/ 180",
      status: "RESERVED",
      statusText: "Reservada",
      badgeClass: "bg-room-reserved-bg text-room-reserved-text border-room-reserved-border",
      guest: "María Vargas (Llega 15:00)",
    },
    {
      number: "202",
      type: "Doble",
      price: "S/ 110",
      status: "CLEANING",
      statusText: "En Limpieza",
      badgeClass: "bg-room-cleaning-bg text-room-cleaning-text border-room-cleaning-border",
      guest: "Pendiente de aseo",
    },
    {
      number: "301",
      type: "Suite Jacuzzi",
      price: "S/ 220",
      status: "MAINTENANCE",
      statusText: "Mantenimiento",
      badgeClass: "bg-room-maintenance-bg text-room-maintenance-text border-room-maintenance-border",
      guest: "Fuga de caño",
    },
    {
      number: "302",
      type: "Matrimonial",
      price: "S/ 90",
      status: "AVAILABLE",
      statusText: "Disponible",
      badgeClass: "bg-room-available-bg text-room-available-text border-room-available-border",
      guest: "Libre",
    },
  ];

  return (
    <div className="min-h-screen bg-bg-page p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Encabezado Principal */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border-default gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-brand-600 animate-pulse"></span>
              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                Hotel Party · Guía de Componentes y Colores
              </h1>
            </div>
            <p className="text-sm text-text-secondary mt-1">
              Catálogo visual con los botones principales, secundarios, formularios y estados hoteleros.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => toast.info("Turno de caja N° 12 cerrado")}
              className="px-4 py-2 text-sm font-medium text-text-secondary bg-bg-card border border-border-default rounded-lg shadow-2xs hover:bg-bg-surface transition"
            >
              Cerrar Turno Caja
            </button>
            <button
              onClick={() => toast.success("¡Habitación 201 alquilada con éxito!")}
              className="px-4 py-2 text-sm font-medium text-text-on-accent bg-brand-600 hover:bg-brand-700 rounded-lg shadow-2xs transition"
            >
              + Nuevo Alquiler
            </button>
          </div>
        </header>

        {/* 1. SECCIÓN: Jerarquía de Botones y Acciones */}
        <section className="bg-bg-card p-6 rounded-xl border border-border-default shadow-xs space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              1. Jerarquía de Botones (Principales vs. Secundarios)
            </h2>
            <p className="text-xs text-text-secondary">
              Cada acción tiene su peso visual correcto para no confundir al recepcionista.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            {/* Botón Primario */}
            <button
              onClick={() => toast.success("Botón Primario accionado")}
              className="px-4 py-2.5 text-sm font-medium rounded-lg bg-brand-600 hover:bg-brand-700 text-text-on-accent transition shadow-2xs cursor-pointer"
            >
              Guardar / Confirmar (Primario)
            </button>

            {/* Botón Secundario */}
            <button
              onClick={() => toast.info("Botón Secundario accionado")}
              className="px-4 py-2.5 text-sm font-medium rounded-lg bg-bg-card hover:bg-bg-surface text-text-secondary border border-border-default transition shadow-2xs cursor-pointer"
            >
              Cancelar / Volver (Secundario)
            </button>

            {/* Botón Suave (Accent) */}
            <button
              onClick={() => toast.info("Filtro aplicado")}
              className="px-4 py-2.5 text-sm font-medium rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 transition cursor-pointer"
            >
              Ver Filtros (Suave / Tag)
            </button>

            {/* Botón Peligro */}
            <button
              onClick={() => toast.error("Reserva anulada")}
              className="px-4 py-2.5 text-sm font-medium rounded-lg bg-danger-bg hover:bg-red-100 text-danger-text border border-danger-border transition shadow-2xs cursor-pointer"
            >
              Anular Reserva (Peligro)
            </button>
          </div>
        </section>

        {/* 2. SECCIÓN: Campos de Formulario (Inputs, Selects) */}
        <section className="bg-bg-card p-6 rounded-xl border border-border-default shadow-xs space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              2. Campos de Formulario (Inputs y Selects)
            </h2>
            <p className="text-xs text-text-secondary">
              Con focus en el color de marca Índigo Real para máxima claridad al escribir.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                DNI / Documento
              </label>
              <input
                type="text"
                placeholder="Ej: 72345678"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-bg-card border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Tipo de Habitación
              </label>
              <select className="w-full px-3.5 py-2 text-sm bg-bg-card border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition">
                <option>Matrimonial (S/ 90.00)</option>
                <option>Suite VIP Party (S/ 180.00)</option>
                <option>Doble (S/ 110.00)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Método de Pago
              </label>
              <select className="w-full px-3.5 py-2 text-sm bg-bg-card border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition">
                <option>Efectivo (CASH)</option>
                <option>Yape</option>
                <option>Plin</option>
                <option>Tarjeta Crédito/Débito</option>
              </select>
            </div>
          </div>
        </section>

        {/* 3. SECCIÓN: Métricas Rápidas (KPIs) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-bg-card p-5 rounded-xl border border-border-default shadow-xs">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Disponibles</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold text-room-available-text">8</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-room-available-bg text-room-available-text border border-room-available-border">
                Libres
              </span>
            </div>
          </div>

          <div className="bg-bg-card p-5 rounded-xl border border-border-default shadow-xs">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Ocupadas</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold text-room-occupied-text">5</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-room-occupied-bg text-room-occupied-text border border-room-occupied-border">
                En Estadía
              </span>
            </div>
          </div>

          <div className="bg-bg-card p-5 rounded-xl border border-border-default shadow-xs">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Reservas Hoy</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold text-room-reserved-text">3</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-room-reserved-bg text-room-reserved-text border border-room-reserved-border">
                Por llegar
              </span>
            </div>
          </div>

          <div className="bg-bg-card p-5 rounded-xl border border-border-default shadow-xs">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Caja Actual</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-bold text-brand-700">S/ 480.00</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                Turno Abierto
              </span>
            </div>
          </div>
        </section>

        {/* 4. SECCIÓN: Feedback y Alertas */}
        <section className="bg-bg-card p-6 rounded-xl border border-border-default shadow-xs space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              4. Mensajes de Feedback (Tokens Semánticos Claros)
            </h2>
            <p className="text-xs text-text-secondary">
              Botones claros y banners estilizados con los tokens del sistema.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={() => toast.success("Operación exitosa: Check-in realizado y comprobante emitido.")}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-success-bg text-success-text border border-success-border hover:bg-emerald-100 transition shadow-2xs"
            >
              Probar Toast Éxito
            </button>
            <button
              onClick={() => toast.error("Error: La habitación 102 ya se encuentra ocupada en esas fechas.")}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-danger-bg text-danger-text border border-danger-border hover:bg-red-100 transition shadow-2xs"
            >
              Probar Toast Error
            </button>
            <button
              onClick={() => toast.warning("Atención: El cliente tiene S/ 35.00 de consumos extras por liquidar.")}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-warning-bg text-warning-text border border-warning-border hover:bg-amber-100 transition shadow-2xs"
            >
              Probar Toast Alerta
            </button>
            <button
              onClick={() => toast.info("Información: El turno de caja actual fue abierto por Juan Pérez a las 08:00 AM.")}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-info-bg text-info-text border border-info-border hover:bg-blue-100 transition shadow-2xs"
            >
              Probar Toast Info
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-lg bg-success-bg border border-success-border text-success-text flex items-start gap-3">
              <span className="font-bold text-lg">✓</span>
              <div>
                <h4 className="font-semibold text-sm">Reserva Confirmada</h4>
                <p className="text-xs opacity-90 mt-0.5">El adelanto de S/ 50.00 fue verificado con éxito vía Yape.</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-danger-bg border border-danger-border text-danger-text flex items-start gap-3">
              <span className="font-bold text-lg">✕</span>
              <div>
                <h4 className="font-semibold text-sm">Habitación No Disponible</h4>
                <p className="text-xs opacity-90 mt-0.5">La Suite VIP ya tiene una reserva confirmada para esas fechas.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. SECCIÓN: Rack de Habitaciones */}
        <section className="bg-bg-card p-6 rounded-xl border border-border-default shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                5. Rack de Habitaciones en Vivo
              </h2>
              <p className="text-xs text-text-secondary">
                Los 5 estados del negocio con códigos de color de alto contraste.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-text-secondary">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-room-available-text"></span>Disponible</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-room-occupied-text"></span>Ocupada</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-room-reserved-text"></span>Reservada</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-room-cleaning-text"></span>Limpieza</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-room-maintenance-text"></span>Mantenimiento</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {rooms.map((room) => (
              <div
                key={room.number}
                className="p-4 rounded-xl border border-border-default hover:border-brand-400 hover:shadow-md transition bg-bg-surface flex flex-col justify-between space-y-3 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xl font-black text-text-primary">Hab. {room.number}</span>
                    <p className="text-xs text-text-secondary">{room.type} · {room.price}/noche</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${room.badgeClass}`}>
                    {room.statusText}
                  </span>
                </div>
                <div className="pt-2 border-t border-border-default text-xs text-text-secondary flex justify-between items-center">
                  <span className="truncate max-w-45 font-medium">{room.guest}</span>
                  <span className="text-brand-600 font-semibold hover:underline">Gestionar →</span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
