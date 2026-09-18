"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Select,
  Label,
  Card,
  Badge,
  Checkbox,
  Modal,
  ConfirmModal,
  SearchInput,
  Pagination,
  Skeleton,
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  type SelectOption,
} from "@/components/ui";
import {
  FiPlus,
  FiUser,
  FiTrash2,
  FiMaximize2,
  FiAlertTriangle,
  FiCreditCard,
  FiDollarSign,
  FiSmartphone,
  FiHome,
  FiStar,
  FiGlobe,
} from "react-icons/fi";

export default function DemoUIPage() {
  // Estados para probar interactividad
  const [inputText, setInputText] = useState("");
  const [inputError, setInputError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSize, setModalSize] = useState<"sm" | "md" | "lg">("md");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [checkboxState, setCheckboxState] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);

  // Opciones enriquecidas para Custom Select
  const roomTypeOptions: SelectOption[] = [
    {
      value: "matrimonial",
      label: "Matrimonial Clásica",
      description: "Cama Queen, Smart TV 55', Baño Privado",
      icon: FiHome,
      badge: <Badge variant="brand">S/ 90.00</Badge>,
    },
    {
      value: "suite",
      label: "Suite VIP Party",
      description: "Jacuzzi, Cama King, Minibar y Vista Panorámica",
      icon: FiStar,
      badge: <Badge variant="success">S/ 180.00</Badge>,
    },
    {
      value: "doble",
      label: "Doble Twin",
      description: "2 Camas de 1.5 plazas, escritorio de trabajo",
      icon: FiHome,
      badge: <Badge variant="neutral">S/ 110.00</Badge>,
    },
    {
      value: "presidencial",
      label: "Presidencial Deluxe",
      description: "2 Ambientes, Sala Lounge, Cava de Vinos",
      icon: FiStar,
      badge: <Badge variant="warning">S/ 280.00</Badge>,
    },
  ];

  const paymentOptions: SelectOption[] = [
    {
      value: "cash",
      label: "Efectivo (CASH)",
      description: "Cobro en recepción en Soles",
      icon: FiDollarSign,
      badge: <Badge variant="success">Inmediato</Badge>,
    },
    {
      value: "yape",
      label: "Yape Móvil",
      description: "Transferencia instantánea BCP",
      icon: FiSmartphone,
      badge: <Badge variant="brand">QR</Badge>,
    },
    {
      value: "plin",
      label: "Plin Interbank/BBVA",
      description: "Transferencia digital interbancaria",
      icon: FiSmartphone,
      badge: <Badge variant="info">Digital</Badge>,
    },
    {
      value: "card",
      label: "Tarjeta Crédito / Débito",
      description: "POS Visa / Mastercard / Amex",
      icon: FiCreditCard,
      badge: <Badge variant="neutral">POS</Badge>,
    },
  ];

  const countryOptions: SelectOption[] = [
    { value: "PE", label: "Perú", description: "Doc: DNI / Carné Extranjería", icon: FiGlobe },
    { value: "CL", label: "Chile", description: "Doc: Pasaporte / Cédula", icon: FiGlobe },
    { value: "AR", label: "Argentina", description: "Doc: Pasaporte / DNI", icon: FiGlobe },
    { value: "CO", label: "Colombia", description: "Doc: Pasaporte / Cédula", icon: FiGlobe },
    { value: "BR", label: "Brasil", description: "Doc: Pasaporte Oficial", icon: FiGlobe },
    { value: "ES", label: "España", description: "Doc: Pasaporte Comunitario", icon: FiGlobe },
    { value: "US", label: "Estados Unidos", description: "Doc: US Passport", icon: FiGlobe },
  ];

  const cityOptions: SelectOption[] = [
    { value: "LIM", label: "Lima (Capital)", description: "Aeropuerto Int. Jorge Chávez" },
    { value: "CUZ", label: "Cusco", description: "Valle Sagrado y Machu Picchu" },
    { value: "AQP", label: "Arequipa", description: "Ciudad Blanca y Cañón del Colca" },
    { value: "TRU", label: "Trujillo", description: "Huanchaco y Chan Chan" },
    { value: "PIU", label: "Piura", description: "Máncora y Playas del Norte" },
    { value: "IQT", label: "Iquitos", description: "Amazonas y Reserva Pacaya Samiria" },
    { value: "TAR", label: "Tarapoto", description: "Laguna Azul y Cataratas" },
    { value: "PUN", label: "Puno", description: "Lago Titicaca e Islas flotantes" },
    { value: "TAC", label: "Tacna", description: "Frontera comercial y ZofraTacna" },
    { value: "ICA", label: "Ica / Paracas", description: "Huacachina y Reserva Ballestas" },
    { value: "CHX", label: "Chachapoyas", description: "Fortaleza de Kuélap y Gocta" },
    { value: "AYP", label: "Ayacucho", description: "Semana Santa y Templos Coloniales" },
  ];

  const [selectedRoomType, setSelectedRoomType] = useState("matrimonial");
  const [selectedPayment, setSelectedPayment] = useState("cash");
  const [selectedCountry, setSelectedCountry] = useState("PE");
  const [selectedCity, setSelectedCity] = useState("LIM");

  // Formulario dentro del modal de prueba
  const [modalGuest, setModalGuest] = useState("");
  const [modalRoomType, setModalRoomType] = useState("matrimonial");

  const rooms = [
    { number: "101", type: "Matrimonial", price: "S/ 90", status: "available" as const, statusText: "Disponible", guest: "Libre" },
    { number: "102", type: "Simple", price: "S/ 60", status: "occupied" as const, statusText: "Ocupada", guest: "Carlos Mendoza (Hasta 12:00)" },
    { number: "201", type: "Suite VIP Party", price: "S/ 180", status: "reserved" as const, statusText: "Reservada", guest: "María Vargas (Llega 15:00)" },
    { number: "202", type: "Doble Twin", price: "S/ 110", status: "cleaning" as const, statusText: "En Limpieza", guest: "Pendiente de aseo" },
    { number: "301", type: "Suite Jacuzzi", price: "S/ 220", status: "maintenance" as const, statusText: "Mantenimiento", guest: "Fuga de caño" },
    { number: "302", type: "Matrimonial", price: "S/ 90", status: "available" as const, statusText: "Disponible", guest: "Libre" },
  ];

  const handleTestLoading = () => {
    setBtnLoading(true);
    toast.info("Cargando proceso...");
    setTimeout(() => {
      setBtnLoading(false);
      toast.success("¡Proceso completado con éxito!");
    }, 1500);
  };

  const handleOpenModalWithSize = (size: "sm" | "md" | "lg") => {
    setModalSize(size);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-bg-page p-6 sm:p-10 space-y-10">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Encabezado Principal */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border-default gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-brand-600 animate-pulse"></span>
              <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
                Hotel Party · Catálogo de Componentes UI
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary mt-1">
              Componentes reutilizables de <code>@/components/ui</code> integrados con los tokens oficiales de diseño.
            </p>
          </div>
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              onClick={() => toast.info("Turno de caja N° 12 verificado")}
            >
              Cerrar Turno Caja
            </Button>
            <Button
              variant="primary"
              onClick={() => handleOpenModalWithSize("md")}
            >
              <FiPlus className="w-4 h-4" />
              <span>+ Probar Modal Normal</span>
            </Button>
          </div>
        </header>

        {/* 1. SECCIÓN: BOTONES (Button) */}
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              1. Botones Reutilizables (&lt;Button /&gt;)
            </h2>
            <p className="text-xs text-text-secondary">
              Variantes: <code>primary</code>, <code>secondary</code>, <code>soft</code>, <code>outline</code>, <code>danger</code>, <code>ghost</code> y tamaños.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              variant="primary"
              onClick={() => toast.success("Botón Primario clickeado")}
            >
              Primario (Guardar)
            </Button>

            <Button
              variant="secondary"
              onClick={() => toast.info("Botón Secundario clickeado")}
            >
              Secundario (Cancelar)
            </Button>

            <Button
              variant="soft"
              onClick={() => toast.info("Botón Soft / Tag clickeado")}
            >
              Soft (Filtro / Tag)
            </Button>

            <Button
              variant="outline"
              onClick={() => toast.info("Botón Outline")}
            >
              Outline
            </Button>

            <Button
              variant="danger"
              onClick={() => setIsConfirmOpen(true)}
            >
              <FiTrash2 className="w-4 h-4" />
              <span>Peligro (Anular)</span>
            </Button>

            <Button
              variant="ghost"
              onClick={() => toast.info("Botón Ghost")}
            >
              Ghost
            </Button>

            <Button
              variant="primary"
              loading={btnLoading}
              onClick={handleTestLoading}
            >
              {btnLoading ? "Guardando..." : "Probar Spinner"}
            </Button>
          </div>

          {/* Tamaños */}
          <div className="pt-2 flex flex-wrap items-center gap-3 border-t border-border-soft">
            <span className="text-xs font-semibold text-text-tertiary">Tamaños:</span>
            <Button size="sm" variant="secondary">Pequeño (sm)</Button>
            <Button size="md" variant="secondary">Mediano (md)</Button>
            <Button size="lg" variant="secondary">Grande (lg)</Button>
          </div>
        </Card>

        {/* 2. SECCIÓN: FORMULARIOS (Input, Label, Select, Textarea, Checkbox) */}
        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              2. Formularios (&lt;Input /&gt;, &lt;Label /&gt;, &lt;Select /&gt;, &lt;Textarea /&gt;, &lt;Checkbox /&gt;)
            </h2>
            <p className="text-xs text-text-secondary">
              Diseñados con focus Índigo, labels consistentes y mensajes de error automáticos.
            </p>
          </div>

          {/* Grid de Inputs y Selects Enriquecidos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <Label required>DNI / Documento</Label>
              <Input
                placeholder="Ej: 72345678"
                icon={<FiUser className="w-4 h-4" />}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (e.target.value.length > 0 && e.target.value.length < 8) {
                    setInputError("El DNI debe tener 8 dígitos");
                  } else {
                    setInputError("");
                  }
                }}
                error={inputError}
              />
            </div>

            <div>
              <Label required>Tipo de Habitación (Con Iconos y Precios)</Label>
              <Select
                options={roomTypeOptions}
                value={selectedRoomType}
                onChange={(e) => setSelectedRoomType(e.target.value)}
              />
            </div>

            <div>
              <Label>Método de Pago (Con Estado y Subtítulo)</Label>
              <Select
                options={paymentOptions}
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
              />
            </div>
          </div>

          {/* Segunda fila: Control de ítems visibles (maxVisibleItems) y Buscador automático */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-1">
            <div>
              <Label>Ciudad / Procedencia (12 ítems, maxVisibleItems=4 y buscador automático)</Label>
              <Select
                options={cityOptions}
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                maxVisibleItems={4}
                searchPlaceholder="Buscar entre 12 ciudades..."
              />
            </div>

            <div>
              <Label>País de Origen (maxVisibleItems=3)</Label>
              <Select
                options={countryOptions}
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                maxVisibleItems={3}
                searchPlaceholder="Filtrar países..."
              />
            </div>

            <div>
              <Label>Select con etiquetas &lt;option&gt; (Retrocompatible)</Label>
              <Select defaultValue="estandar">
                <option value="estandar">Tarifa Estándar Flexible</option>
                <option value="promo">Promoción Parejas Fin de Semana (-15%)</option>
                <option value="corporativo">Convenio Corporativo Empresas</option>
                <option value="larga_estancia">Tarifa Mensual Larga Estancia</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
            <div>
              <Label>Notas o Peticiones Especiales</Label>
              <Textarea placeholder="Ej: Huésped solicita toallas extras y check-in temprano..." />
            </div>

            <div className="space-y-4 pt-4">
              <Checkbox
                label="Registrar acompañante en la estadía"
                subLabel="Habilitará campos extras para el segundo documento de identidad"
                checked={checkboxState}
                onChange={(e) => setCheckboxState(e.target.checked)}
              />

              <Checkbox
                label="Emitir comprobante electrónico (Boleta / Factura)"
                subLabel="Se generará la serie electrónica correlativa oficial"
                defaultChecked
              />
            </div>
          </div>
        </Card>

        {/* 3. SECCIÓN: BADGES & ESTADOS (&lt;Badge /&gt;) */}
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              3. Insignias y Estados Hoteleros (&lt;Badge /&gt;)
            </h2>
            <p className="text-xs text-text-secondary">
              Estados del Rack y etiquetas semánticas del sistema.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <Badge variant="available">● Disponible</Badge>
            <Badge variant="occupied">● Ocupada</Badge>
            <Badge variant="reserved">● Reservada</Badge>
            <Badge variant="cleaning">● Limpieza</Badge>
            <Badge variant="maintenance">● Mantenimiento</Badge>
            <Badge variant="brand">Hotel Party</Badge>
            <Badge variant="success">Pago Verificado</Badge>
            <Badge variant="warning">Pendiente de Pago</Badge>
            <Badge variant="danger">Reserva Cancelada</Badge>
            <Badge variant="info">Online Web</Badge>
            <Badge variant="neutral">Sin Asignar</Badge>
          </div>
        </Card>

        {/* 4. SECCIÓN: TABLAS (&lt;Table /&gt;) Y BÚSQUEDA (&lt;SearchInput /&gt;) */}
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border-default">
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                4. Tabla Reutilizable (&lt;Table /&gt;) y Paginador (&lt;Pagination /&gt;)
              </h2>
              <p className="text-xs text-text-secondary">
                Listados tabulares densos y optimizados para PMS.
              </p>
            </div>
            <SearchInput placeholder="Buscar por cuarto o huésped..." />
          </div>

          <div className="rounded-xl border border-border-default overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Habitación</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tarifa 24h</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Huésped Actual</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.number}>
                    <TableCell className="font-bold text-text-primary">
                      Hab. {room.number}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {room.type}
                    </TableCell>
                    <TableCell className="font-semibold text-brand-700">
                      {room.price}.00
                    </TableCell>
                    <TableCell>
                      <Badge variant={room.status}>{room.statusText}</Badge>
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {room.guest}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={() => toast.info(`Gestionando Habitación ${room.number}`)}
                      >
                        Gestionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              currentPage={currentPage}
              totalPages={3}
              totalItems={18}
              itemsPerPage={6}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        </Card>

        {/* 5. SECCIÓN: VENTANAS MODALES (<Modal /> y <ConfirmModal />) */}
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              5. Ventanas Modales Reutilizables (&lt;Modal /&gt; y &lt;ConfirmModal /&gt;)
            </h2>
            <p className="text-xs text-text-secondary">
              Totalmente accesibles, bloqueo de scroll, foco automático y soporte de tamaños (sm, md, lg).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              variant="primary"
              onClick={() => handleOpenModalWithSize("md")}
            >
              <FiMaximize2 className="w-4 h-4" />
              <span>Abrir Modal Normal (Mediano - md)</span>
            </Button>

            <Button
              variant="soft"
              onClick={() => handleOpenModalWithSize("lg")}
            >
              <span>Abrir Modal Grande (lg)</span>
            </Button>

            <Button
              variant="secondary"
              onClick={() => handleOpenModalWithSize("sm")}
            >
              <span>Abrir Modal Pequeño (sm)</span>
            </Button>

            <Button
              variant="danger"
              onClick={() => setIsConfirmOpen(true)}
            >
              <FiAlertTriangle className="w-4 h-4" />
              <span>Abrir ConfirmModal (Diálogo de Alerta)</span>
            </Button>
          </div>
        </Card>

        {/* 6. SECCIÓN: SKELETONS (&lt;Skeleton /&gt;) */}
        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              6. Estados de Carga (&lt;Skeleton /&gt;)
            </h2>
            <p className="text-xs text-text-secondary">
              Indicadores animados mientras se cargan los datos desde PostgreSQL.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-xl border border-border-default space-y-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="p-4 rounded-xl border border-border-default space-y-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="p-4 rounded-xl border border-border-default space-y-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </Card>

      </div>

      {/* MODAL NORMAL REUTILIZABLE */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size={modalSize}
        title={`Check-In de Habitación (Tamaño: ${modalSize.toUpperCase()})`}
        subtitle="Demostración completa del componente <Modal /> reutilizable"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success(`Check-In registrado para ${modalGuest || "Huésped General"}`, {
                  description: `Tipo: ${modalRoomType} • Habitación asignada con éxito.`,
                });
                setIsModalOpen(false);
              }}
            >
              Confirmar e Ingresar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            Este modal utiliza el componente <code>&lt;Modal /&gt;</code> de <code>@/components/ui/Modal</code> con cabecera, botón de cierre automático, foco gestionado y botones en el footer.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <Label required>Nombre del Huésped</Label>
              <Input
                placeholder="Ej: Juan Pérez"
                value={modalGuest}
                onChange={(e) => setModalGuest(e.target.value)}
              />
            </div>

            <div>
              <Label required>Tipo de Cuarto</Label>
              <Select
                value={modalRoomType}
                onChange={(e) => setModalRoomType(e.target.value)}
              >
                <option value="matrimonial">Matrimonial (S/ 90.00)</option>
                <option value="suite">Suite VIP Party (S/ 180.00)</option>
                <option value="doble">Doble Twin (S/ 110.00)</option>
              </Select>
            </div>
          </div>

          <div>
            <Label>Observaciones de Llegada</Label>
            <Textarea placeholder="Ej: Huésped solicita toalla adicional y pago con Yape al ingresar..." />
          </div>

          <Checkbox
            label="Solicitar pago adelantado de garantía (S/ 50.00)"
            subLabel="Recomendado para estadías largas o uso de minibar"
          />
        </div>
      </Modal>

      {/* CONFIRMMODAL DE DEMOSTRACIÓN */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="¿Anular esta reserva?"
        description="Esta acción liberará la habitación inmediatamente y enviará una notificación al cliente. Esta acción no se puede deshacer."
        confirmText="Sí, anular reserva"
        cancelText="No, conservar"
        variant="danger"
        onConfirm={() => {
          toast.error("Reserva anulada satisfactoriamente.");
          setIsConfirmOpen(false);
        }}
      />
    </div>
  );
}
